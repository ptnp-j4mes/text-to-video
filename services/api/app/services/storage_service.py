from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import UploadFile

from services.api.app.config import get_settings
from services.api.app.utils.paths import ensure_directory, file_extension, sanitize_filename


settings = get_settings()


def upload_folder(kind: str) -> Path:
    if kind == "voices":
        return ensure_directory(settings.upload_path / "voices")
    if kind == "images":
        return ensure_directory(settings.upload_path / "images")
    return ensure_directory(settings.upload_path / kind)


def output_folder(kind: str) -> Path:
    return ensure_directory(settings.output_path / kind)


async def save_upload(upload: UploadFile, destination_dir: Path, prefix: str) -> Path:
    ensure_directory(destination_dir)
    suffix = file_extension(upload.filename or "upload.bin")
    filename = f"{prefix}_{sanitize_filename(upload.filename or 'upload')}"
    if not filename.endswith(f".{suffix}"):
        filename = f"{Path(filename).stem}.{suffix}"
    destination = destination_dir / filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)
    return destination

