from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    device: str
    tts_engine: str
    avatar_engine: str


class VoiceResponse(BaseModel):
    voice_id: str
    name: str
    status: str
    duration_seconds: float | None = None


class ImageResponse(BaseModel):
    image_id: str
    name: str
    status: str
    face_detected: bool


class JobOptions(BaseModel):
    refine_lipsync: bool = False
    output_format: str = "mp4"
    motion_preset: str = "light_static"
    target_duration_seconds: int = Field(default=15, ge=15, le=30)

    # Voice post-processing preset for short-form motivational videos.
    # Supported values in the worker are: none, natural, elderly_warm, elderly_deep.
    voice_age_preset: str = "elderly_warm"
    voice_pitch_shift_semitones: float | None = Field(default=None, ge=-6.0, le=3.0)
    voice_speed: float | None = Field(default=None, ge=0.75, le=1.15)
    voice_low_mid_gain_db: float | None = Field(default=None, ge=-6.0, le=6.0)


class JobCreateRequest(BaseModel):
    voice_id: str
    image_id: str
    text: str = Field(min_length=1)
    language: str = "th"
    options: JobOptions = Field(default_factory=JobOptions)


class JobResponse(BaseModel):
    job_id: str
    status: str


class JobDetailResponse(BaseModel):
    id: str
    job_type: str
    status: str
    voice_id: str | None
    image_id: str | None
    text: str | None
    language: str
    options_json: str | None
    audio_output_path: str | None
    video_output_path: str | None
    error_message: str | None
    progress: int
    created_at: str
    started_at: str | None
    finished_at: str | None


class FileRevealRequest(BaseModel):
    path: str
