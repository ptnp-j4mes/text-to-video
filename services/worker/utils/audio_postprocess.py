from __future__ import annotations

import math
import shutil
from dataclasses import dataclass
from pathlib import Path
from shutil import which
from typing import Any

from services.api.app.config import Settings
from services.worker.engines.command_runner import run_command


@dataclass(slots=True)
class VoicePostprocessOptions:
    preset: str
    pitch_shift_semitones: float
    speed: float
    low_mid_gain_db: float
    enabled: bool = True


VOICE_PRESETS: dict[str, dict[str, float | bool]] = {
    "none": {
        "enabled": False,
        "pitch_shift_semitones": 0.0,
        "speed": 1.0,
        "low_mid_gain_db": 0.0,
    },
    "natural": {
        "enabled": True,
        "pitch_shift_semitones": 0.0,
        "speed": 1.0,
        "low_mid_gain_db": 0.0,
    },
    "elderly_warm": {
        "enabled": True,
        "pitch_shift_semitones": -1.5,
        "speed": 0.94,
        "low_mid_gain_db": 2.0,
    },
    "elderly_deep": {
        "enabled": True,
        "pitch_shift_semitones": -2.0,
        "speed": 0.92,
        "low_mid_gain_db": 2.5,
    },
}


def _as_float(value: Any, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def build_voice_postprocess_options(
    *,
    options: dict[str, Any],
    settings: Settings,
) -> VoicePostprocessOptions:
    preset = str(options.get("voice_age_preset") or settings.voice_postprocess_preset or "elderly_warm").strip().lower()
    if preset in {"off", "disabled", "disable", "false"}:
        preset = "none"

    preset_values = VOICE_PRESETS.get(preset, VOICE_PRESETS["elderly_warm"])

    pitch_default = float(preset_values["pitch_shift_semitones"])
    speed_default = float(preset_values["speed"])
    low_mid_default = float(preset_values["low_mid_gain_db"])

    pitch_shift_semitones = _as_float(
        options.get("voice_pitch_shift_semitones"),
        settings.voice_pitch_shift_semitones if settings.voice_pitch_shift_semitones is not None else pitch_default,
    )
    speed = _as_float(
        options.get("voice_speed"),
        settings.voice_speed if settings.voice_speed is not None else speed_default,
    )
    low_mid_gain_db = _as_float(
        options.get("voice_low_mid_gain_db"),
        settings.voice_low_mid_gain_db if settings.voice_low_mid_gain_db is not None else low_mid_default,
    )

    return VoicePostprocessOptions(
        preset=preset,
        pitch_shift_semitones=_clamp(pitch_shift_semitones, -6.0, 3.0),
        speed=_clamp(speed, 0.75, 1.15),
        low_mid_gain_db=_clamp(low_mid_gain_db, -6.0, 6.0),
        enabled=bool(preset_values["enabled"]),
    )


def _atempo_filter(value: float) -> list[str]:
    """Split tempo values to stay inside ffmpeg atempo's 0.5-100 range safely."""
    if math.isclose(value, 1.0, rel_tol=1e-4, abs_tol=1e-4):
        return []

    filters: list[str] = []
    remaining = value

    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5

    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0

    filters.append(f"atempo={remaining:.6f}")
    return filters


def build_ffmpeg_filter(options: VoicePostprocessOptions) -> str:
    filters = ["aresample=48000"]

    pitch_factor = 2 ** (options.pitch_shift_semitones / 12)
    if not math.isclose(pitch_factor, 1.0, rel_tol=1e-4, abs_tol=1e-4):
        filters.extend(
            [
                f"asetrate=48000*{pitch_factor:.8f}",
                "aresample=48000",
                *_atempo_filter(1 / pitch_factor),
            ]
        )

    filters.extend(_atempo_filter(options.speed))

    if not math.isclose(options.low_mid_gain_db, 0.0, rel_tol=1e-4, abs_tol=1e-4):
        filters.append(f"equalizer=f=220:t=q:w=1.1:g={options.low_mid_gain_db:.2f}")

    filters.extend(
        [
            "acompressor=threshold=-18dB:ratio=2.0:attack=20:release=180",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
        ]
    )

    return ",".join(filters)


def postprocess_voice(
    *,
    input_audio: Path,
    output_audio: Path,
    options: VoicePostprocessOptions,
    ffmpeg_command: str = "ffmpeg",
) -> Path:
    output_audio.parent.mkdir(parents=True, exist_ok=True)

    if not options.enabled:
        if input_audio.resolve() != output_audio.resolve():
            shutil.copyfile(input_audio, output_audio)
        return output_audio

    if which(ffmpeg_command) is None:
        # Keep the job usable in lightweight local setups even when ffmpeg is missing.
        if input_audio.resolve() != output_audio.resolve():
            shutil.copyfile(input_audio, output_audio)
        return output_audio

    filter_chain = build_ffmpeg_filter(options)
    args = [
        ffmpeg_command,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(input_audio),
        "-af",
        filter_chain,
        "-ar",
        "48000",
        "-ac",
        "1",
        str(output_audio),
    ]

    run_command(args)
    return output_audio
