# app/api/routes/files.py

from pathlib import Path
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.core.services.storage import file_exists, get_file_path
from app.core.utils.auth import require_auth
from app.database.crud.files import get_file_crud
from app.database.db import get_db_pool

router = APIRouter(prefix="/files", tags=["files"])


async def get_pool() -> asyncpg.Pool:
    return await get_db_pool()


@router.get("/{file_id}")
async def download_file(file_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    record = await get_file_crud(pool, str(file_id))
    if record is None:
        raise HTTPException(status_code=404, detail="File not found")

    ext = Path(record["filename"]).suffix if record["filename"] else ""
    disk_name = f"{file_id}{ext}"
    if not file_exists(disk_name):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=get_file_path(disk_name),
        media_type=record["mime_type"],
        filename=record["filename"],
    )
