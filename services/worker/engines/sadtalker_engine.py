from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from shutil import which

from services.api.app.config import get_settings
from services.worker.engines.command_runner import run_command
from services.worker.utils.video_composite import composite_person_video

settings = get_settings()


@dataclass(slots=True)
class MotionConfig:
    preprocess: str
    still_mode: bool
    expression_scale: str
    lock_background: bool


def build_motion_config(motion_preset: str | None) -> MotionConfig:
    if motion_preset in {"light", "light_static", "static", "static_background"}:
        return MotionConfig(
            preprocess="full",
            still_mode=False,
            expression_scale="0.72",
            lock_background=True,
        )
    return MotionConfig(
        preprocess="crop",
        still_mode=False,
        expression_scale="1.0",
        lock_background=False,
    )


class SadTalkerEngine:
    def __init__(self) -> None:
        self.python = settings.sadtalker_python
        self.repo = settings.resolve_path(settings.sadtalker_repo)
        self.script = self.repo / settings.sadtalker_script
        self.result_subdir = settings.sadtalker_result_subdir

    def render(
        self,
        *,
        source_image: Path,
        driven_audio: Path,
        output_video: Path,
        motion_preset: str | None = None,
    ) -> Path:
        output_video.parent.mkdir(parents=True, exist_ok=True)

        if which(self.python) is None:
            raise FileNotFoundError(
                f"Python executable '{self.python}' was not found on PATH. "
                "Install or adjust SADTALKER_PYTHON."
            )
        if not self.script.exists():
            raise FileNotFoundError(
                f"SadTalker script not found at {self.script}. "
                "Clone the SadTalker repository or adjust SADTALKER_REPO."
            )

        motion_config = build_motion_config(motion_preset)
        result_dir = output_video.parent / self.result_subdir / output_video.stem
        result_dir.mkdir(parents=True, exist_ok=True)

        args = [
            self.python,
            str(self.script),
            "--driven_audio",
            str(driven_audio),
            "--source_image",
            str(source_image),
            "--result_dir",
            str(result_dir),
            "--enhancer",
            "gfpgan",
            "--preprocess",
            motion_config.preprocess,
            "--expression_scale",
            motion_config.expression_scale,
        ]
        if motion_config.still_mode:
            args.append("--still")

        run_command(args, cwd=self.repo)

        candidates = sorted(Path(result_dir).rglob("*.mp4"), key=lambda item: item.stat().st_mtime, reverse=True)
        if not candidates:
            raise FileNotFoundError(f"SadTalker completed but did not produce any mp4 files in {result_dir}")

        produced = candidates[0]
        if motion_config.lock_background:
            return composite_person_video(
                source_image=source_image,
                generated_video=produced,
                output_video=output_video,
            )

        if produced.resolve() != output_video.resolve():
            output_video.write_bytes(produced.read_bytes())
        return output_video
