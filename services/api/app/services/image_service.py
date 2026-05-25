from __future__ import annotations

import shutil
from pathlib import Path
from typing import NamedTuple

try:
    import cv2
except Exception:  # pragma: no cover
    cv2 = None

try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None

try:
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps
except Exception:  # pragma: no cover
    Image = None
    ImageEnhance = None
    ImageFilter = None
    ImageOps = None


TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
TARGET_SIZE = (TARGET_WIDTH, TARGET_HEIGHT)
TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT

MIN_FACE_SIZE = 60

# Face position on final 9:16 canvas.
# 0.40 means the face center will sit around 40% from the top.
FACE_TARGET_Y_RATIO = 0.40

# Foreground crop size on the final canvas.
# Keeping it smaller than the full canvas leaves a cinematic blurred background
# and lower space for subtitles.
FOREGROUND_WIDTH_RATIO = 0.86
FOREGROUND_HEIGHT_RATIO = 0.74


class FaceBox(NamedTuple):
    x: int
    y: int
    w: int
    h: int


def _detect_faces_pil(image: "Image.Image") -> list[FaceBox]:
    if cv2 is None or np is None:
        return []

    rgb = image.convert("RGB")
    arr = np.array(rgb)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)

    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=5,
        minSize=(MIN_FACE_SIZE, MIN_FACE_SIZE),
    )

    return [FaceBox(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]


def _largest_face(faces: list[FaceBox]) -> FaceBox | None:
    if not faces:
        return None
    return max(faces, key=lambda face: face.w * face.h)


def detect_face(image_path: Path) -> bool:
    """
    Keep upload behavior permissive.

    The upload route currently blocks when this returns False.
    For Reel/TikTok/IG preprocessing, we still want readable images without a
    detected face to pass through so normalize_portrait() can create a valid
    1080x1920 fallback canvas.

    Actual face-aware cropping still happens inside normalize_portrait().
    """
    if Image is None or ImageOps is None:
        return True

    try:
        with Image.open(image_path) as image:
            ImageOps.exif_transpose(image)
            return True
    except Exception:
        return False


def _crop_box_inside_image(
    *,
    width: int,
    height: int,
    crop_width: int,
    crop_height: int,
    center_x: float,
    center_y: float,
) -> tuple[int, int, int, int]:
    crop_width = max(1, min(crop_width, width))
    crop_height = max(1, min(crop_height, height))

    left = int(round(center_x - crop_width / 2))
    top = int(round(center_y - crop_height / 2))

    left = max(0, min(left, width - crop_width))
    top = max(0, min(top, height - crop_height))

    return left, top, left + crop_width, top + crop_height


def _cover_resize_crop(image: "Image.Image", size: tuple[int, int]) -> "Image.Image":
    target_width, target_height = size
    width, height = image.size

    scale = max(target_width / width, target_height / height)
    resized_size = (int(round(width * scale)), int(round(height * scale)))

    resized = image.resize(resized_size, Image.Resampling.LANCZOS)

    left = (resized.width - target_width) // 2
    top = (resized.height - target_height) // 2

    return resized.crop((left, top, left + target_width, top + target_height))


def _build_blurred_background(image: "Image.Image") -> "Image.Image":
    background = _cover_resize_crop(image.convert("RGB"), TARGET_SIZE)
    background = background.filter(ImageFilter.GaussianBlur(radius=36))
    background = ImageEnhance.Brightness(background).enhance(0.74)
    background = ImageEnhance.Contrast(background).enhance(0.92)
    return background


def _crop_speaker_portrait(
    image: "Image.Image",
    face: FaceBox | None,
) -> tuple["Image.Image", tuple[float, float] | None]:
    """
    Build a speaker crop.

    Returns:
        foreground_crop:
            Cropped image around the speaker or center fallback.
        face_anchor:
            Face center coordinate inside foreground_crop.
            None when no face is detected.
    """
    width, height = image.size

    if face is None:
        # Fallback: create a 9:16 crop from the center of the image.
        crop_height = height
        crop_width = int(round(crop_height * TARGET_RATIO))

        if crop_width > width:
            crop_width = width
            crop_height = int(round(crop_width / TARGET_RATIO))

        box = _crop_box_inside_image(
            width=width,
            height=height,
            crop_width=crop_width,
            crop_height=crop_height,
            center_x=width / 2,
            center_y=height / 2,
        )

        return image.crop(box), None

    x, y, w, h = face

    face_cx = x + w / 2
    face_cy = y + h / 2

    # Large enough to keep head, neck, shoulders, and some background.
    crop_height = int(round(max(h * 6.0, w * 6.6, MIN_FACE_SIZE * 6)))
    crop_width = int(round(crop_height * TARGET_RATIO))

    if crop_width > width:
        crop_width = width
        crop_height = int(round(crop_width / TARGET_RATIO))

    if crop_height > height:
        crop_height = height
        crop_width = int(round(crop_height * TARGET_RATIO))

    # Put face slightly above center inside this crop.
    # This gives room for shoulders and subtitle safe area below.
    desired_face_y = crop_height * 0.28

    box = _crop_box_inside_image(
        width=width,
        height=height,
        crop_width=crop_width,
        crop_height=crop_height,
        center_x=face_cx,
        center_y=face_cy + crop_height / 2 - desired_face_y,
    )

    left, top, right, bottom = box
    face_anchor = (face_cx - left, face_cy - top)

    return image.crop((left, top, right, bottom)), face_anchor


def _fit_foreground(image: "Image.Image") -> tuple["Image.Image", float]:
    max_width = int(round(TARGET_WIDTH * FOREGROUND_WIDTH_RATIO))
    max_height = int(round(TARGET_HEIGHT * FOREGROUND_HEIGHT_RATIO))

    scale = min(max_width / image.width, max_height / image.height)
    resized_size = (
        int(round(image.width * scale)),
        int(round(image.height * scale)),
    )

    foreground = image.resize(resized_size, Image.Resampling.LANCZOS)
    return foreground, scale


def _compose_social_portrait(image: "Image.Image", face: FaceBox | None) -> "Image.Image":
    """
    Create final 1080x1920 portrait.

    Composition:
    - blurred 9:16 background
    - face-aware foreground crop
    - face positioned slightly above center
    - lower area preserved for subtitles
    """
    canvas = _build_blurred_background(image)

    foreground_crop, face_anchor = _crop_speaker_portrait(image, face)
    foreground, scale = _fit_foreground(foreground_crop.convert("RGB"))

    x = (TARGET_WIDTH - foreground.width) // 2

    if face_anchor is None:
        y = (TARGET_HEIGHT - foreground.height) // 2
    else:
        target_face_y = TARGET_HEIGHT * FACE_TARGET_Y_RATIO
        y = int(round(target_face_y - face_anchor[1] * scale))
        y = max(0, min(y, TARGET_HEIGHT - foreground.height))

    canvas.paste(foreground, (x, y))
    return canvas


def _light_enhance(image: "Image.Image") -> "Image.Image":
    """
    Subtle enhancement only.

    Do not over-process because GFPGAN/SadTalker may also enhance later.
    """
    image = ImageEnhance.Contrast(image).enhance(1.05)
    image = ImageEnhance.Sharpness(image).enhance(1.08)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=3))
    return image


def normalize_portrait(source_path: Path, target_path: Path) -> tuple[Path, int | None, int | None]:
    """
    Normalize uploaded image for Reel/TikTok/IG talking-avatar generation.

    Output:
        - PNG
        - 1080x1920
        - 9:16 vertical
        - face-aware composition when a face is detected
        - valid centered fallback when no face is detected
    """
    target_path.parent.mkdir(parents=True, exist_ok=True)

    if Image is None or ImageOps is None:
        shutil.copyfile(source_path, target_path)
        return target_path, None, None

    with Image.open(source_path) as image:
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")

        faces = _detect_faces_pil(image)
        face = _largest_face(faces)

        processed = _compose_social_portrait(image, face)
        processed = _light_enhance(processed)

        processed.save(target_path, format="PNG", optimize=True)

        return target_path, TARGET_WIDTH, TARGET_HEIGHT