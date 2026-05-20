from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from services.worker.utils.person_mask import build_person_mask


def composite_frame(background_bgr: np.ndarray, generated_bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    alpha = np.clip(mask[..., None].astype(np.float32), 0.0, 1.0)
    blended = generated_bgr.astype(np.float32) * alpha + background_bgr.astype(np.float32) * (1.0 - alpha)
    return np.clip(blended, 0, 255).astype(np.uint8)


def composite_person_video(*, source_image: Path, generated_video: Path, output_video: Path) -> Path:
    background_bgr = cv2.imread(str(source_image), cv2.IMREAD_COLOR)
    if background_bgr is None:
        raise FileNotFoundError(f"Could not read source image at {source_image}")

    mask = build_person_mask(background_bgr)
    capture = cv2.VideoCapture(str(generated_video))
    if not capture.isOpened():
        raise FileNotFoundError(f"Could not open generated video at {generated_video}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
    frame_width = background_bgr.shape[1]
    frame_height = background_bgr.shape[0]
    output_video.parent.mkdir(parents=True, exist_ok=True)

    writer = cv2.VideoWriter(
        str(output_video),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (frame_width, frame_height),
    )
    if not writer.isOpened():
        capture.release()
        raise RuntimeError(f"Could not open video writer for {output_video}")

    try:
        while True:
            success, frame = capture.read()
            if not success:
                break
            if frame.shape[:2] != background_bgr.shape[:2]:
                frame = cv2.resize(frame, (background_bgr.shape[1], background_bgr.shape[0]))
            composited = composite_frame(background_bgr, frame, mask)
            writer.write(composited)
    finally:
        capture.release()
        writer.release()

    if not output_video.exists():
        raise FileNotFoundError(f"Video compositor finished but no file was written to {output_video}")
    return output_video
