from __future__ import annotations

from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from services.api.app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()


def _build_database_url() -> str:
    database_url = settings.database_url
    prefix = "sqlite+aiosqlite:///"
    if not database_url.startswith(prefix):
        return database_url

    raw_path = database_url[len(prefix) :]
    path = Path(raw_path)
    if not path.is_absolute():
        path = (settings.repo_root / raw_path).resolve()
    return f"{prefix}{path}"


engine = create_async_engine(_build_database_url(), echo=False, future=True)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    from services.api.app import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        result = await conn.execute(text("PRAGMA table_info(jobs)"))
        existing_columns = {row[1] for row in result.fetchall()}
        if "options_json" not in existing_columns:
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN options_json TEXT"))


async def ping_database() -> None:
    async with async_session_maker() as session:
        await session.execute(text("SELECT 1"))
