from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _coerce(value: str, caster: Callable[[str], Any], default: Any) -> Any:
    try:
        return caster(value)
    except Exception:
        return default


def _coerce_optional_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except Exception:
        return None


@dataclass(slots=True)
class Settings:
    app_env: str = "local"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    database_url: str = "sqlite+aiosqlite:///storage/db/app.sqlite"

    storage_root: str = "storage"
    upload_root: str = "storage/uploads"
    output_root: str = "storage/outputs"
    cache_root: str = "storage/cache"
    temp_root: str = "storage/temp"

    max_upload_mb: int = 50
    max_text_chars: int = 800

    tts_device: str = "mps"
    tts_engine: str = "omnivoice"
    avatar_engine: str = "sadtalker"
    omnivoice_python: str = "python3"
    omnivoice_command: str = "omnivoice-infer"
    omnivoice_model: str = "k2-fsa/OmniVoice"
    sadtalker_python: str = "python3"
    sadtalker_repo: str = "models/SadTalker"
    sadtalker_script: str = "inference.py"
    sadtalker_result_subdir: str = "results"
    enable_wav2lip_refine: bool = False

    voice_postprocess_preset: str = "elderly_warm"
    voice_pitch_shift_semitones: float | None = None
    voice_speed: float | None = None
    voice_low_mid_gain_db: float | None = None
    ffmpeg_command: str = "ffmpeg"

    max_concurrent_jobs: int = 1

    @property
    def repo_root(self) -> Path:
        return Path(__file__).resolve().parents[3]

    def resolve_path(self, value: str) -> Path:
        path = Path(value)
        if path.is_absolute():
            return path
        return (self.repo_root / path).resolve()

    @property
    def storage_path(self) -> Path:
        return self.resolve_path(self.storage_root)

    @property
    def upload_path(self) -> Path:
        return self.resolve_path(self.upload_root)

    @property
    def output_path(self) -> Path:
        return self.resolve_path(self.output_root)

    @property
    def cache_path(self) -> Path:
        return self.resolve_path(self.cache_root)

    @property
    def temp_path(self) -> Path:
        return self.resolve_path(self.temp_root)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    env_file = Path(__file__).resolve().parents[1] / ".env"
    env_values = _parse_env_file(env_file)
    merged = {**env_values, **os.environ}

    return Settings(
        app_env=merged.get("APP_ENV", "local"),
        app_host=merged.get("APP_HOST", "127.0.0.1"),
        app_port=_coerce(merged.get("APP_PORT", "8000"), int, 8000),
        database_url=merged.get("DATABASE_URL", "sqlite+aiosqlite:///storage/db/app.sqlite"),
        storage_root=merged.get("STORAGE_ROOT", "storage"),
        upload_root=merged.get("UPLOAD_ROOT", "storage/uploads"),
        output_root=merged.get("OUTPUT_ROOT", "storage/outputs"),
        cache_root=merged.get("CACHE_ROOT", "storage/cache"),
        temp_root=merged.get("TEMP_ROOT", "storage/temp"),
        max_upload_mb=_coerce(merged.get("MAX_UPLOAD_MB", "50"), int, 50),
        max_text_chars=_coerce(merged.get("MAX_TEXT_CHARS", "800"), int, 800),
        tts_device=merged.get("TTS_DEVICE", "mps"),
        tts_engine=merged.get("TTS_ENGINE", "omnivoice"),
        avatar_engine=merged.get("AVATAR_ENGINE", "sadtalker"),
        omnivoice_python=merged.get("OMNIVOICE_PYTHON", "python3"),
        omnivoice_command=merged.get("OMNIVOICE_COMMAND", "omnivoice-infer"),
        omnivoice_model=merged.get("OMNIVOICE_MODEL", "k2-fsa/OmniVoice"),
        sadtalker_python=merged.get("SADTALKER_PYTHON", "python3"),
        sadtalker_repo=merged.get("SADTALKER_REPO", "models/SadTalker"),
        sadtalker_script=merged.get("SADTALKER_SCRIPT", "inference.py"),
        sadtalker_result_subdir=merged.get("SADTALKER_RESULT_SUBDIR", "results"),
        enable_wav2lip_refine=merged.get("ENABLE_WAV2LIP_REFINE", "false").lower() in {"1", "true", "yes", "on"},
        voice_postprocess_preset=merged.get("VOICE_POSTPROCESS_PRESET", "elderly_warm"),
        voice_pitch_shift_semitones=_coerce_optional_float(merged.get("VOICE_PITCH_SHIFT_SEMITONES")),
        voice_speed=_coerce_optional_float(merged.get("VOICE_SPEED")),
        voice_low_mid_gain_db=_coerce_optional_float(merged.get("VOICE_LOW_MID_GAIN_DB")),
        ffmpeg_command=merged.get("FFMPEG_COMMAND", "ffmpeg"),
        max_concurrent_jobs=_coerce(merged.get("MAX_CONCURRENT_JOBS", "1"), int, 1),
    )
