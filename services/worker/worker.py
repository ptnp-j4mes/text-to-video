from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Awaitable, Callable

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from services.api.app.db import async_session_maker, init_db
from services.api.app.models import Image, Job, Voice
from services.worker.engines.command_runner import CommandError
from services.worker.pipelines.avatar_pipeline import AvatarJobContext, AvatarPipeline
from services.worker.pipelines.veo_pipeline import VeoApiError, VeoImageToVideoJobContext, VeoImageToVideoPipeline

VEO_JOB_TYPE = "generate-veo-image-video"

avatar_pipeline = AvatarPipeline()
veo_pipeline = VeoImageToVideoPipeline()


async def mark_job_failed(job_id: str, message: str) -> None:
    async with async_session_maker() as session:
        row = await session.get(Job, job_id)
        if row is not None:
            row.status = "failed"
            row.error_message = message
            row.finished_at = datetime.now(timezone.utc).isoformat()
            row.progress = 100
            await session.commit()


async def run_job(job: Job, processor: Callable[[Job], Awaitable[None]]) -> None:
    async with async_session_maker() as session:
        row = await session.get(Job, job.id)
        if row is None or row.status != "queued":
            return
        row.status = "running"
        row.started_at = row.started_at or datetime.now(timezone.utc).isoformat()
        row.progress = 5
        await session.commit()

    try:
        await processor(job)
    except (CommandError, FileNotFoundError, ValueError, VeoApiError) as exc:
        await mark_job_failed(job.id, str(exc))
    except Exception as exc:  # pragma: no cover - defensive catch for runtime pipeline failures
        await mark_job_failed(job.id, f"Unexpected pipeline error: {exc}")


async def process_avatar_job(job: Job) -> None:
    async with async_session_maker() as session:
        job_row = await session.get(Job, job.id)
        if job_row is None:
            return
        voice = await session.get(Voice, job_row.voice_id) if job_row.voice_id else None
        image = await session.get(Image, job_row.image_id) if job_row.image_id else None
        if voice is None:
            raise ValueError("Voice not found for job")
        if image is None:
            raise ValueError("Image not found for job")
        reference_audio = voice.normalized_audio_path or voice.source_audio_path
        portrait_image = image.processed_image_path or image.source_image_path

        context = AvatarJobContext(
            job_id=job_row.id,
            text=job_row.text or "",
            language=job_row.language or "th",
            reference_audio=Path(reference_audio),
            portrait_image=Path(portrait_image),
            options_json=job_row.options_json,
        )
        job_row.progress = 20
        await session.commit()

    generated_audio = await asyncio.to_thread(avatar_pipeline.synthesize, job=context)
    async with async_session_maker() as session:
        row = await session.get(Job, job.id)
        if row is not None:
            row.progress = 55
            row.audio_output_path = str(generated_audio)
            await session.commit()

    async with async_session_maker() as session:
        row = await session.get(Job, job.id)
        if row is not None:
            row.progress = 65
            await session.commit()

    generated_video = await asyncio.to_thread(avatar_pipeline.render, job=context, audio_path=generated_audio)

    async with async_session_maker() as session:
        row = await session.get(Job, job.id)
        if row is None:
            return
        row.status = "completed"
        row.progress = 100
        row.audio_output_path = str(generated_audio)
        row.video_output_path = str(generated_video)
        row.finished_at = datetime.now(timezone.utc).isoformat()
        await session.commit()


async def process_veo_image_video_job(job: Job) -> None:
    async with async_session_maker() as session:
        job_row = await session.get(Job, job.id)
        if job_row is None:
            return
        options = json.loads(job_row.options_json or "{}")
        input_image_path = options.get("input_image_path")
        if not isinstance(input_image_path, str) or not input_image_path:
            raise ValueError("Veo job is missing input_image_path")
        context = VeoImageToVideoJobContext(
            job_id=job_row.id,
            prompt=job_row.text or "",
            input_image=Path(input_image_path),
            options=options,
        )
        job_row.progress = 25
        await session.commit()

    generated_video = await asyncio.to_thread(veo_pipeline.generate, job=context)

    async with async_session_maker() as session:
        row = await session.get(Job, job.id)
        if row is None:
            return
        row.status = "completed"
        row.progress = 100
        row.video_output_path = str(generated_video)
        row.finished_at = datetime.now(timezone.utc).isoformat()
        await session.commit()


async def process_one_job(job: Job) -> None:
    if job.job_type == VEO_JOB_TYPE:
        await run_job(job, process_veo_image_video_job)
        return
    await run_job(job, process_avatar_job)


async def poll_jobs() -> None:
    while True:
        async with async_session_maker() as session:
            rows = (await session.execute(select(Job).where(Job.status == "queued").order_by(Job.created_at.asc()))).scalars().all()
        for job in rows:
            await process_one_job(job)
        await asyncio.sleep(2)


async def main() -> None:
    await init_db()
    await poll_jobs()


if __name__ == "__main__":
    asyncio.run(main())
