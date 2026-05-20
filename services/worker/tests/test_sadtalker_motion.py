from __future__ import annotations

from services.worker.engines.sadtalker_engine import build_motion_config


def test_light_static_preset_maps_to_background_locked_mode() -> None:
    config = build_motion_config("light_static")

    assert config.preprocess == "full"
    assert config.still_mode is False
    assert config.expression_scale == "0.72"
    assert config.lock_background is True


def test_default_motion_preset_remains_crop_mode() -> None:
    config = build_motion_config("default")

    assert config.preprocess == "crop"
    assert config.still_mode is False
    assert config.expression_scale == "1.0"
    assert config.lock_background is False
