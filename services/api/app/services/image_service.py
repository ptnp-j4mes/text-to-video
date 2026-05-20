from __future__ import annotations

import shutil
from pathlib import Path

try:
    import cv2
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

try:
    from PIL import Image
except Exception:  # pragma: no cover - optional dependency
    Image = None


def detect_face(image_path: Path) -> bool:
    if cv2 is None:
        return True

    image = cv2.imread(str(image_path))
    if image is None:
        return False

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    return len(faces) > 0


def normalize_portrait(source_path: Path, target_path: Path) -> tuple[Path, int | None, int | None]:
    target_path.parent.mkdir(parents=True, exist_ok=True)

    if Image is None:
        shutil.copyfile(source_path, target_path)
        return target_path, None, None

    with Image.open(source_path) as image:
        rgb = image.convert("RGB")
        rgb.save(target_path)
        return target_path, rgb.width, rgb.height

