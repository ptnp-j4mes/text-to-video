from fastapi import APIRouter

from services.api.app.config import get_settings
from services.api.app.schemas import HealthResponse

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        device=settings.tts_device,
        tts_engine=settings.tts_engine,
        avatar_engine=settings.avatar_engine,
    )

