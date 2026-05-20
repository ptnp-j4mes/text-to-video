from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from services.api.app.db import async_session_maker
from services.api.app.models import Image, Job, Voice
from services.api.app.schemas import JobCreateRequest, JobDetailResponse, JobResponse
from services.api.app.services.queue_service import queue_service
from services.api.app.utils.ids import new_id

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/generate-avatar", response_model=JobResponse)
async def create_generation_job(payload: JobCreateRequest) -> JobResponse:
    async with async_session_maker() as session:
        voice = await session.get(Voice, payload.voice_id)
        image = await session.get(Image, payload.image_id)
        if voice is None:
            raise HTTPException(status_code=404, detail="Voice not found")
        if image is None:
            raise HTTPException(status_code=404, detail="Image not found")

        job_id = new_id("job")
        job = Job(
            id=job_id,
            job_type="generate-avatar",
            status="queued",
            voice_id=payload.voice_id,
            image_id=payload.image_id,
            text=payload.text,
            language=payload.language,
            options_json=json.dumps(payload.options.model_dump(), ensure_ascii=False),
            audio_output_path=None,
            video_output_path=None,
            error_message=None,
            progress=0,
            created_at=datetime.now(timezone.utc).isoformat(),
            started_at=None,
            finished_at=None,
        )
        session.add(job)
        await session.commit()

    queue_service.enqueue(job_id=job_id, job_type="generate-avatar")
    return JobResponse(job_id=job_id, status="queued")


@router.get("", response_model=list[JobDetailResponse])
async def list_jobs() -> list[JobDetailResponse]:
    async with async_session_maker() as session:
        rows = (await session.execute(select(Job).order_by(Job.created_at.desc()))).scalars().all()
    return [
        JobDetailResponse(
            id=row.id,
            job_type=row.job_type,
            status=row.status,
            voice_id=row.voice_id,
            image_id=row.image_id,
            text=row.text,
            language=row.language,
            options_json=row.options_json,
            audio_output_path=row.audio_output_path,
            video_output_path=row.video_output_path,
            error_message=row.error_message,
            progress=row.progress,
            created_at=row.created_at,
            started_at=row.started_at,
            finished_at=row.finished_at,
        )
        for row in rows
    ]


@router.get("/{job_id}", response_model=JobDetailResponse)
async def get_job(job_id: str) -> JobDetailResponse:
    async with async_session_maker() as session:
        row = await session.get(Job, job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobDetailResponse(
        id=row.id,
        job_type=row.job_type,
        status=row.status,
        voice_id=row.voice_id,
        image_id=row.image_id,
        text=row.text,
        language=row.language,
        options_json=row.options_json,
        audio_output_path=row.audio_output_path,
        video_output_path=row.video_output_path,
        error_message=row.error_message,
        progress=row.progress,
        created_at=row.created_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(job_id: str) -> JobResponse:
    async with async_session_maker() as session:
        row = await session.get(Job, job_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Job not found")
        if row.status not in {"failed", "completed"}:
            raise HTTPException(status_code=400, detail="Only finished jobs can be retried")
        if row.voice_id is None or row.image_id is None or row.text is None:
            raise HTTPException(status_code=400, detail="Job is missing required inputs")
        voice = await session.get(Voice, row.voice_id)
        image = await session.get(Image, row.image_id)
        if voice is None:
            raise HTTPException(status_code=404, detail="Voice not found")
        if image is None:
            raise HTTPException(status_code=404, detail="Image not found")

        new_job_id = new_id("job")
        job = Job(
            id=new_job_id,
            job_type=row.job_type,
            status="queued",
            voice_id=row.voice_id,
            image_id=row.image_id,
            text=row.text,
            language=row.language,
            options_json=row.options_json,
            audio_output_path=None,
            video_output_path=None,
            error_message=None,
            progress=0,
            created_at=datetime.now(timezone.utc).isoformat(),
            started_at=None,
            finished_at=None,
        )
        session.add(job)
        await session.commit()

    queue_service.enqueue(job_id=new_job_id, job_type=row.job_type)
    return JobResponse(job_id=new_job_id, status="queued")
