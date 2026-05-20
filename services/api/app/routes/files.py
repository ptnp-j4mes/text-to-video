from __future__ import annotations

import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services.api.app.config import get_settings
from services.api.app.schemas import FileRevealRequest

router = APIRouter(tags=["files"])
settings = get_settings()


def _is_within_root(file_path: Path, root: Path) -> bool:
    root_resolved = root.resolve()
    return root_resolved in file_path.parents or file_path == root_resolved


@router.get("/files/{category}/{file_name:path}")
async def get_file(category: str, file_name: str) -> FileResponse:
    root_map = {
        "uploads": settings.upload_path,
        "outputs": settings.output_path,
        "cache": settings.cache_path,
        "temp": settings.temp_path,
    }
    root = root_map.get(category)
    if root is None:
        raise HTTPException(status_code=404, detail="Unknown file category")

    file_path = (root / file_name).resolve()
    if not _is_within_root(file_path, root):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.post("/files/reveal")
async def reveal_file(request: FileRevealRequest) -> dict[str, str]:
    file_path = Path(request.path).resolve()
    allowed_roots = [settings.upload_path, settings.output_path, settings.cache_path, settings.temp_path]
    if not any(_is_within_root(file_path, root) for root in allowed_roots):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    subprocess.run(["open", "-R", str(file_path)], check=False)
    return {"status": "ok"}
