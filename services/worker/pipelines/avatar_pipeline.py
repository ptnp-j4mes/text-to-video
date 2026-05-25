from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from services.api.app.config import get_settings
from services.worker.engines.omnivoice_engine import OmniVoiceEngine
from services.worker.engines.sadtalker_engine import SadTalkerEngine
from services.worker.utils.audio_postprocess import build_voice_postprocess_options, postprocess_voice

settings = get_settings()


@dataclass(slots=True)
class AvatarPipelineResult:
    audio_output_path: Path
    video_output_path: Path


@dataclass(slots=True)
class AvatarJobContext:
    job_id: str
    text: str
    language: str
    reference_audio: Path
    portrait_image: Path
    options_json: str | None = None


def _load_options(options_json: str | None) -> dict[str, Any]:
    if not options_json:
        return {}
    try:
        parsed = json.loads(options_json)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


class AvatarPipeline:
    def __init__(self) -> None:
        self.tts = OmniVoiceEngine()
        self.avatar = SadTalkerEngine()

    def synthesize(self, *, job: AvatarJobContext) -> Path:
        raw_audio_output = settings.output_path / "audio" / f"{job.job_id}_raw.wav"
        final_audio_output = settings.output_path / "audio" / f"{job.job_id}.wav"
        options = _load_options(job.options_json)

        reference_text = options.get("ref_text")
        duration_seconds = options.get("target_duration_seconds")
        duration_seconds = duration_seconds if isinstance(duration_seconds, int) else None

        generated_raw_audio = self.tts.synthesize(
            text=job.text,
            reference_audio=job.reference_audio,
            output_audio=raw_audio_output,
            reference_text=reference_text if isinstance(reference_text, str) else None,
            language=job.language or "th",
            duration_seconds=duration_seconds,
        )

        voice_options = build_voice_postprocess_options(
            options=options,
            settings=settings,
        )
        return postprocess_voice(
            input_audio=generated_raw_audio,
            output_audio=final_audio_output,
            options=voice_options,
            ffmpeg_command=settings.ffmpeg_command,
        )

    def render(self, *, job: AvatarJobContext, audio_path: Path) -> Path:
        video_output = settings.output_path / "video" / f"{job.job_id}.mp4"
        options = _load_options(job.options_json)
        return self.avatar.render(
            source_image=job.portrait_image,
            driven_audio=audio_path,
            output_video=video_output,
            motion_preset=options.get("motion_preset") if isinstance(options, dict) else None,
        )

    def run(self, *, job: AvatarJobContext) -> AvatarPipelineResult:
        generated_audio = self.synthesize(job=job)
        generated_video = self.render(job=job, audio_path=generated_audio)
        return AvatarPipelineResult(
            audio_output_path=generated_audio,
            video_output_path=generated_video,
        )
