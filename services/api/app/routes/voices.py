from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from services.api.app.config import get_settings
from services.api.app.db import async_session_maker
from services.api.app.models import Voice
from services.api.app.schemas import VoiceResponse
from services.api.app.services.audio_service import normalize_reference_audio
from services.api.app.services.storage_service import save_upload, upload_folder
from services.api.app.utils.ids import new_id

router = APIRouter(prefix="/voices", tags=["voices"])
settings = get_settings()


@router.post("", response_model=VoiceResponse)
async def enroll_voice(
    name: str = Form(...),
    language: str = Form("th"),
    file: UploadFile = File(...),
) -> VoiceResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing voice file")

    upload_path = await save_upload(file, upload_folder("voices"), new_id("voice_raw"))
    normalized_path = upload_path.with_name(f"{upload_path.stem}_normalized.wav")
    normalized_audio_path, duration_seconds, sample_rate = normalize_reference_audio(upload_path, normalized_path)

    voice_id = new_id("voice")
    async with async_session_maker() as session:
        voice = Voice(
            id=voice_id,
            name=name,
            source_audio_path=str(upload_path),
            normalized_audio_path=str(normalized_audio_path),
            speaker_profile_path=None,
            duration_seconds=duration_seconds,
            sample_rate=sample_rate,
            language=language,
            status="ready",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session.add(voice)
        await session.commit()

    return VoiceResponse(
        voice_id=voice_id,
        name=name,
        status="ready",
        duration_seconds=duration_seconds,
    )


@router.get("", response_model=list[VoiceResponse])
async def list_voices() -> list[VoiceResponse]:
    async with async_session_maker() as session:
        rows = (await session.execute(select(Voice).order_by(Voice.created_at.desc()))).scalars().all()
    return [
        VoiceResponse(
            voice_id=row.id,
            name=row.name,
            status=row.status,
            duration_seconds=row.duration_seconds,
        )
        for row in rows
    ]
