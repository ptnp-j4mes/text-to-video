from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from services.api.app.config import Settings


@dataclass(slots=True)
class TextProsodyOptions:
    preset: str
    strength: float
    enabled: bool = True


TEXT_PROSODY_PRESETS = {
    "none",
    "neutral",
    "warm_encouraging",
    "gentle_reflective",
    "hopeful",
    "sad_soft",
}

_SENTENCE_END_RE = re.compile(r"([.!?。！？]|ครับ|ค่ะ|นะ|นะครับ|นะคะ)(\s+)")
_MULTI_SPACE_RE = re.compile(r"[ \t]+")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _as_float(value: Any, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_text_prosody_options(
    *,
    options: dict[str, Any],
    settings: Settings,
) -> TextProsodyOptions:
    preset = str(options.get("voice_emotion_preset") or settings.voice_emotion_preset or "warm_encouraging").strip().lower()
    if preset in {"off", "disabled", "disable", "false"}:
        preset = "none"
    if preset not in TEXT_PROSODY_PRESETS:
        preset = "warm_encouraging"

    strength = _as_float(
        options.get("voice_emotion_strength"),
        settings.voice_emotion_strength,
    )

    return TextProsodyOptions(
        preset=preset,
        strength=_clamp(strength, 0.0, 1.0),
        enabled=preset != "none",
    )


def _normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [_MULTI_SPACE_RE.sub(" ", line).strip() for line in text.split("\n")]
    text = "\n".join(line for line in lines if line)
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)
    return text.strip()


def _add_soft_pauses(text: str, *, marker: str) -> str:
    # Add gentle pauses after common sentence endings without changing wording.
    return _SENTENCE_END_RE.sub(lambda match: f"{match.group(1)}{marker}", text)


def prepare_spoken_text(text: str, *, prosody: TextProsodyOptions) -> str:
    """Prepare text for more emotional TTS delivery without changing meaning."""
    prepared = _normalize_text(text)
    if not prepared or not prosody.enabled or prosody.strength <= 0:
        return prepared

    if prosody.preset in {"neutral"}:
        return prepared

    pause_marker = "\n" if prosody.strength < 0.5 else "\n\n"

    if prosody.preset == "warm_encouraging":
        prepared = _add_soft_pauses(prepared, marker=pause_marker)
    elif prosody.preset == "gentle_reflective":
        prepared = _add_soft_pauses(prepared, marker="...\n")
    elif prosody.preset == "hopeful":
        prepared = _add_soft_pauses(prepared, marker=pause_marker)
    elif prosody.preset == "sad_soft":
        prepared = _add_soft_pauses(prepared, marker="...\n")

    return _normalize_text(prepared)
