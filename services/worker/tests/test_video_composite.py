from __future__ import annotations

import numpy as np

from services.worker.utils.video_composite import composite_frame


def test_composite_frame_keeps_background_outside_mask() -> None:
    background = np.zeros((2, 2, 3), dtype=np.uint8)
    generated = np.full((2, 2, 3), 255, dtype=np.uint8)
    mask = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)

    result = composite_frame(background, generated, mask)

    assert result[0, 0, 0] == 255
    assert result[0, 1, 0] == 0
    assert result[1, 0, 0] == 0
    assert result[1, 1, 0] == 255
