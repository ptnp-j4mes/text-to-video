from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from services.api.app.db import async_session_maker
from services.api.app.models import Image
from services.api.app.schemas import ImageResponse
from services.api.app.services.image_service import detect_face, normalize_portrait
from services.api.app.services.storage_service import save_upload, upload_folder
from services.api.app.utils.ids import new_id

router = APIRouter(prefix="/images", tags=["images"])


@router.post("", response_model=ImageResponse)
async def upload_image(
    name: str = Form(...),
    file: UploadFile = File(...),
) -> ImageResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing image file")

    upload_path = await save_upload(file, upload_folder("images"), new_id("image_raw"))
    face_detected = detect_face(upload_path)
    if not face_detected:
        raise HTTPException(status_code=422, detail="No face detected in image")

    processed_path = upload_path.with_name(f"{upload_path.stem}_processed.png")
    normalized_path, width, height = normalize_portrait(upload_path, processed_path)

    image_id = new_id("img")
    async with async_session_maker() as session:
        image = Image(
            id=image_id,
            name=name,
            source_image_path=str(upload_path),
            processed_image_path=str(normalized_path),
            width=width,
            height=height,
            face_detected=1,
            status="ready",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(image)
        await session.commit()

    return ImageResponse(
        image_id=image_id,
        name=name,
        status="ready",
        face_detected=True,
    )


@router.get("", response_model=list[ImageResponse])
async def list_images() -> list[ImageResponse]:
    async with async_session_maker() as session:
        rows = (await session.execute(select(Image).order_by(Image.created_at.desc()))).scalars().all()
    return [
        ImageResponse(
            image_id=row.id,
            name=row.name,
            status=row.status,
            face_detected=bool(row.face_detected),
        )
        for row in rows
    ]
