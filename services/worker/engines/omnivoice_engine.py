from __future__ import annotations

from pathlib import Path
from shutil import which

from services.api.app.config import get_settings
from services.worker.engines.command_runner import run_command

settings = get_settings()


class OmniVoiceEngine:
    def __init__(self) -> None:
        self.command = settings.omnivoice_command
        self.model = settings.omnivoice_model

    def build_inference_args(
        self,
        *,
        text: str,
        reference_audio: Path,
        output_audio: Path,
        reference_text: str | None = None,
        language: str = "th",
        duration_seconds: int | None = None,
    ) -> list[str]:
        args = [
            "--model",
            self.model,
            "--text",
            text,
            "--ref_audio",
            str(reference_audio),
            "--output",
            str(output_audio),
        ]
        if reference_text:
            args.extend(["--ref_text", reference_text])
        if language:
            args.extend(["--language", language])
        if duration_seconds is not None:
            args.extend(["--duration", str(duration_seconds)])
        return args

    def synthesize(
        self,
        *,
        text: str,
        reference_audio: Path,
        output_audio: Path,
        reference_text: str | None = None,
        language: str = "th",
        duration_seconds: int | None = None,
    ) -> Path:
        output_audio.parent.mkdir(parents=True, exist_ok=True)

        command = self.command
        if which(command) is not None:
            args = [
                command,
                *self.build_inference_args(
                    text=text,
                    reference_audio=reference_audio,
                    output_audio=output_audio,
                    reference_text=reference_text,
                    language=language,
                    duration_seconds=duration_seconds,
                ),
            ]
        else:
            python = settings.omnivoice_python
            if which(python) is None:
                raise FileNotFoundError(
                    f"Neither OmniVoice command '{command}' nor python executable '{python}' was found on PATH."
                )
            args = [
                python,
                "-m",
                "omnivoice.cli.infer",
                *self.build_inference_args(
                    text=text,
                    reference_audio=reference_audio,
                    output_audio=output_audio,
                    reference_text=reference_text,
                    language=language,
                    duration_seconds=duration_seconds,
                ),
            ]

        run_command(args)
        return output_audio
