from __future__ import annotations

from pathlib import Path

from services.worker.engines.omnivoice_engine import OmniVoiceEngine


def test_build_inference_args_includes_duration() -> None:
    engine = OmniVoiceEngine()

    args = engine.build_inference_args(
        text="สวัสดีครับ",
        reference_audio=Path("/tmp/reference.wav"),
        output_audio=Path("/tmp/output.wav"),
        reference_text="สวัสดี",
        language="th",
        duration_seconds=15,
    )

    assert args[0] == "--model"
    assert "--duration" in args
    assert "15" in args
    assert "--language" in args
    assert "--ref_text" in args
