from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

try:  # pragma: no cover - optional dependency is installed in the runtime
    import mediapipe as mp
except ModuleNotFoundError:  # pragma: no cover - fallback path
    mp = None


@dataclass(slots=True)
class MaskConfig:
    blur_sigma: float = 7.0
    dilation_iterations: int = 2
    threshold: float = 0.25
    background_margin: float = 0.06


def _feather_mask(mask: np.ndarray, config: MaskConfig) -> np.ndarray:
    soft_mask = np.clip(mask.astype(np.float32), 0.0, 1.0)
    soft_mask = cv2.GaussianBlur(soft_mask, (0, 0), config.blur_sigma)
    if config.dilation_iterations > 0:
        binary = (soft_mask > config.threshold).astype(np.uint8)
        kernel = np.ones((9, 9), dtype=np.uint8)
        binary = cv2.dilate(binary, kernel, iterations=config.dilation_iterations)
        soft_mask = np.maximum(soft_mask, binary.astype(np.float32))
    return np.clip(soft_mask, 0.0, 1.0)


def _mediapipe_mask(image_bgr: np.ndarray) -> np.ndarray | None:
    if mp is None:
        return None

    solutions = getattr(mp, "solutions", None)
    selfie_segmentation = getattr(solutions, "selfie_segmentation", None) if solutions is not None else None
    segmenter_cls = getattr(selfie_segmentation, "SelfieSegmentation", None)
    if segmenter_cls is None:
        return None

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    with segmenter_cls(model_selection=1) as segmenter:
        result = segmenter.process(image_rgb)
    if getattr(result, "segmentation_mask", None) is None:
        return None
    return result.segmentation_mask.astype(np.float32)


def _grabcut_mask(image_bgr: np.ndarray, config: MaskConfig) -> np.ndarray:
    height, width = image_bgr.shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)
    rect_x = int(width * 0.08)
    rect_y = int(height * 0.06)
    rect_w = int(width * 0.84)
    rect_h = int(height * 0.88)
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(image_bgr, mask, (rect_x, rect_y, rect_w, rect_h), bg_model, fg_model, 5, cv2.GC_INIT_WITH_RECT)
    foreground = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
    return _feather_mask(foreground, config)


def build_person_mask(image_bgr: np.ndarray, config: MaskConfig | None = None) -> np.ndarray:
    config = config or MaskConfig()
    mask = _mediapipe_mask(image_bgr)
    if mask is None:
        mask = _grabcut_mask(image_bgr, config)
    else:
        mask = np.clip((mask - config.background_margin) / max(1e-6, 1.0 - config.background_margin), 0.0, 1.0)
    return _feather_mask(mask, config)
