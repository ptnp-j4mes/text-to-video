from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from services.api.app.config import get_settings
from services.worker.engines.omnivoice_engine import OmniVoiceEngine
from services.worker.engines.sadtalker_engine import SadTalkerEngine

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


class AvatarPipeline:
    def __init__(self) -> None:
        self.tts = OmniVoiceEngine()
        self.avatar = SadTalkerEngine()

    def synthesize(self, *, job: AvatarJobContext) -> Path:
        audio_output = settings.output_path / "audio" / f"{job.job_id}.wav"
        options = {}
        if job.options_json:
            try:
                options = json.loads(job.options_json)
            except json.JSONDecodeError:
                options = {}

        reference_text = options.get("ref_text") if isinstance(options, dict) else None
        duration_seconds = options.get("target_duration_seconds") if isinstance(options, dict) else None
        duration_seconds = duration_seconds if isinstance(duration_seconds, int) else None
        return self.tts.synthesize(
            text=job.text,
            reference_audio=job.reference_audio,
            output_audio=audio_output,
            reference_text=reference_text if isinstance(reference_text, str) else None,
            language=job.language or "th",
            duration_seconds=duration_seconds,
        )

    def render(self, *, job: AvatarJobContext, audio_path: Path) -> Path:
        video_output = settings.output_path / "video" / f"{job.job_id}.mp4"
        options = {}
        if job.options_json:
            try:
                options = json.loads(job.options_json)
            except json.JSONDecodeError:
                options = {}
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
