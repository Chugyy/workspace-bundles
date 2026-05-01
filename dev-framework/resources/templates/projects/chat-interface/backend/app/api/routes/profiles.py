# app/api/routes/profiles.py

import re
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from app.api.models.profiles import (
    ProfileCreateRequest,
    ProfileItemResponse,
    ProfileResponse,
    ProfileUpdateRequest,
)
from app.api.models.workspaces import BrowseResponse
from app.core.services import profiles as profile_service
from app.core.utils.auth import require_auth
from app.database.crud.profiles import (
    create_profile_crud,
    delete_profile_crud,
    get_profile_crud,
    list_profiles_crud,
    update_profile_color_crud,
)
from app.database.crud.workspaces import get_workspace_crud
from app.database.db import get_db_pool

router = APIRouter(prefix="/claude-profiles", tags=["profiles"])


async def get_pool() -> asyncpg.Pool:
    return await get_db_pool()


async def _get_or_404(pool: asyncpg.Pool, profile_id: str) -> dict:
    profile = await get_profile_crud(pool, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def _exec(fn, *args):
    try:
        return fn(*args)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProfileResponse])
async def list_profiles(pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    return await list_profiles_crud(pool)


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(body: ProfileCreateRequest, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    try:
        profile_service.validate_name(body.name)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    try:
        profile = await create_profile_crud(pool, body.name)
        profile_service.create_profile_dir(body.name)
        return profile
    except Exception:
        raise HTTPException(status_code=409, detail="Profile name already exists")


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    body: ProfileUpdateRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    if body.color is not None:
        if not re.match(r'^#[0-9a-fA-F]{6}$', body.color):
            raise HTTPException(status_code=422, detail="Invalid hex color")
        profile = await update_profile_color_crud(pool, str(profile_id), body.color)
    return profile


@router.get("/{profile_id}/items", response_model=list[ProfileItemResponse])
async def list_profile_items(
    profile_id: UUID,
    workspace_id: UUID | None = Query(default=None),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    applied_at: float | None = None
    if workspace_id:
        ws = await get_workspace_crud(pool, str(workspace_id))
        if ws and ws.get("applied_at"):
            applied_at = ws["applied_at"].timestamp()
    try:
        return profile_service.list_profile_items(profile["name"], applied_at)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    profile = await _get_or_404(pool, str(profile_id))
    if profile["name"] == "default":
        raise HTTPException(status_code=400, detail="Cannot delete the default profile")
    await delete_profile_crud(pool, str(profile_id))
    profile_service.delete_profile_dir(profile["name"])
    return Response(status_code=204)


# ── FILE OPERATIONS ───────────────────────────────────────────────────────────

@router.get("/{profile_id}/browse", response_model=BrowseResponse)
async def browse_profile(
    profile_id: UUID,
    path: str = Query(default=""),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    return _exec(profile_service.list_dir, profile["name"], path)


@router.get("/{profile_id}/file")
async def read_file(
    profile_id: UUID,
    path: str = Query(...),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    content, mime = _exec(profile_service.read_file, profile["name"], path)
    return {"path": path, "content": content, "type": mime}


@router.put("/{profile_id}/file")
async def write_file(
    profile_id: UUID,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    path = body.get("path", "")
    content = body.get("content", "")
    if not path:
        raise HTTPException(status_code=422, detail="path is required")
    _exec(profile_service.write_file, profile["name"], path, content)
    return {"path": path, "saved": True}


@router.delete("/{profile_id}/file")
async def delete_file(
    profile_id: UUID,
    path: str = Query(...),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    _exec(profile_service.delete_path, profile["name"], path)
    return {"path": path, "deleted": True}


@router.post("/{profile_id}/file/duplicate")
async def duplicate_file(
    profile_id: UUID,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    path = body.get("path", "")
    if not path:
        raise HTTPException(status_code=422, detail="path is required")
    new_path = _exec(profile_service.duplicate_path, profile["name"], path)
    return {"original": path, "duplicate": new_path}


@router.get("/{profile_id}/file/download")
async def download_file(
    profile_id: UUID,
    path: str = Query(...),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    profile = await _get_or_404(pool, str(profile_id))
    buf, filename = _exec(profile_service.download_path, profile["name"], path)
    media = "application/zip" if filename.endswith(".zip") else "application/octet-stream"
    return StreamingResponse(buf, media_type=media, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/{profile_id}/download")
async def download_profile(profile_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    profile = await _get_or_404(pool, str(profile_id))
    buf = profile_service.zip_profile(profile["name"])
    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{profile["name"]}.zip"'})
