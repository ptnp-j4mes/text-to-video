from __future__ import annotations

from pathlib import Path
from typing import Final

SAFE_EXTENSIONS: Final = {
    "jpg",
    "jpeg",
    "png",
    "webp",
    "wav",
    "mp3",
    "m4a",
    "webm",
    "ogg",
    "mp4",
    "txt",
}


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def sanitize_filename(filename: str) -> str:
    return Path(filename).name.replace(" ", "_")


def file_extension(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    return suffix if suffix in SAFE_EXTENSIONS else "bin"
