from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from services.api.app.services import image_service
from services.api.app.services.image_service import FaceBox, normalize_portrait


def _save_source(path: Path, size: tuple[int, int], face_box: FaceBox) -> None:
    image = Image.new("RGB", size, (44, 72, 108))
    draw = ImageDraw.Draw(image)

    x, y, w, h = face_box
    draw.rectangle((x, y, x + w, y + h), fill=(240, 32, 32))
    draw.rectangle((x - w, y + h, x + w * 2, min(size[1], y + h * 4)), fill=(48, 172, 96))

    image.save(path)


def test_normalize_portrait_writes_social_vertical_png(tmp_path, monkeypatch) -> None:
    source = tmp_path / "wide.jpg"
    target = tmp_path / "processed.png"
    face = FaceBox(520, 130, 160, 160)
    _save_source(source, (1200, 800), face)
    monkeypatch.setattr(image_service, "_detect_faces_pil", lambda _image: [face])

    normalized_path, width, height = normalize_portrait(source, target)

    assert normalized_path == target
    assert width == 1080
    assert height == 1920
    with Image.open(target) as processed:
        assert processed.size == (1080, 1920)
        assert processed.format == "PNG"


def test_normalize_portrait_places_detected_face_in_upper_middle(tmp_path, monkeypatch) -> None:
    source = tmp_path / "portrait.jpg"
    target = tmp_path / "processed.png"
    face = FaceBox(410, 120, 180, 180)
    _save_source(source, (1000, 1200), face)
    monkeypatch.setattr(image_service, "_detect_faces_pil", lambda _image: [face])

    normalize_portrait(source, target)

    with Image.open(target) as processed:
        rgb = processed.convert("RGB")
        red_pixels = [
            (x, y)
            for y in range(rgb.height)
            for x in range(rgb.width)
            if rgb.getpixel((x, y))[0] > 210
            and rgb.getpixel((x, y))[1] < 70
            and rgb.getpixel((x, y))[2] < 70
        ]

    assert red_pixels
    center_x = sum(x for x, _y in red_pixels) / len(red_pixels)
    center_y = sum(y for _x, y in red_pixels) / len(red_pixels)
    assert 1080 * 0.35 <= center_x <= 1080 * 0.65
    assert 1920 * 0.34 <= center_y <= 1920 * 0.46


def test_normalize_portrait_handles_common_source_aspects(tmp_path, monkeypatch) -> None:
    cases = [
        ("wide.jpg", (1600, 900), FaceBox(700, 140, 160, 160)),
        ("square.jpg", (1000, 1000), FaceBox(420, 120, 160, 160)),
        ("vertical.jpg", (900, 1600), FaceBox(360, 240, 150, 150)),
    ]

    for filename, size, face in cases:
        source = tmp_path / filename
        target = tmp_path / f"{Path(filename).stem}_processed.png"
        _save_source(source, size, face)
        monkeypatch.setattr(image_service, "_detect_faces_pil", lambda _image, found=face: [found])

        _path, width, height = normalize_portrait(source, target)

        assert width == 1080
        assert height == 1920
        with Image.open(target) as processed:
            assert processed.size == (1080, 1920)
            assert processed.format == "PNG"
