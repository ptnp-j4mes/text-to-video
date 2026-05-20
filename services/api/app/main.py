from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.app.db import init_db
from services.api.app.routes.files import router as files_router
from services.api.app.routes.health import router as health_router
from services.api.app.routes.images import router as images_router
from services.api.app.routes.jobs import router as jobs_router
from services.api.app.routes.voices import router as voices_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="AI Voice Avatar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5431", "http://127.0.0.1:5431"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(voices_router)
app.include_router(images_router)
app.include_router(jobs_router)
app.include_router(files_router)
