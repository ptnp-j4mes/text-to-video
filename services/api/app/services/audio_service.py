from __future__ import annotations

import shutil
from pathlib import Path

try:
    from pydub import AudioSegment
except Exception:  # pragma: no cover - optional dependency
    AudioSegment = None


def normalize_reference_audio(source_path: Path, target_path: Path) -> tuple[Path, float | None, int | None]:
    target_path.parent.mkdir(parents=True, exist_ok=True)

    if AudioSegment is None:
        shutil.copyfile(source_path, target_path)
        return target_path, None, None

    audio = AudioSegment.from_file(source_path)
    audio = audio.set_channels(1)
    audio = audio.normalize()
    audio.export(target_path, format="wav")
    duration = round(audio.duration_seconds, 3)
    sample_rate = audio.frame_rate
    return target_path, duration, sample_rate

