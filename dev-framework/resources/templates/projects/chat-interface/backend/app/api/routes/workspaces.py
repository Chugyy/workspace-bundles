# app/api/routes/workspaces.py

from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from app.api.models.workspaces import (
    ApplyProfileRequest,
    BrowseResponse,
    WorkspaceCreateRequest,
    WorkspaceResponse,
    WorkspaceUpdateRequest,
)
from app.core.services import workspaces as workspace_service
from app.core.services.profiles import apply_profile_to_workspace
from app.core.utils.auth import require_auth
from app.database.crud.profiles import get_profile_crud
from app.database.crud.workspaces import (
    count_workspace_sessions_crud,
    create_workspace_crud,
    delete_workspace_crud,
    get_workspace_crud,
    list_workspaces_crud,
    update_workspace_color_crud,
    update_workspace_name_crud,
    update_workspace_profile_crud,
)
from app.database.db import get_db_pool

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


async def get_pool() -> asyncpg.Pool:
    return await get_db_pool()


async def _get_or_404(pool: asyncpg.Pool, workspace_id: str) -> dict:
    workspace = await get_workspace_crud(pool, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


async def _serialize(ws: dict, pool: asyncpg.Pool) -> dict:
    import json as _json
    items = ws.get("included_items") or []
    if isinstance(items, str):
        items = _json.loads(items)
    return {**ws, "included_items": items}


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    workspaces = await list_workspaces_crud(pool)
    return [await _serialize(w, pool) for w in workspaces]


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(body: WorkspaceCreateRequest, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")

    workspace = await create_workspace_crud(pool, body.name)
    workspace_service.create_workspace_dir(str(workspace["id"]))
    return await _serialize(workspace, pool)


@router.post("/{workspace_id}/apply-profile", response_model=WorkspaceResponse)
async def apply_profile(
    workspace_id: UUID,
    body: ApplyProfileRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    workspace = await _get_or_404(pool, str(workspace_id))
    profile = await get_profile_crud(pool, str(body.profile_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    apply_profile_to_workspace(profile["name"], str(workspace["id"]), body.items)
    updated = await update_workspace_profile_crud(
        pool, str(workspace_id), str(body.profile_id), body.items
    )
    return await _serialize(updated, pool)


@router.get("/{workspace_id}/browse", response_model=BrowseResponse)
async def browse_workspace(
    workspace_id: UUID,
    path: str = Query(default=""),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    try:
        return workspace_service.list_dir(str(workspace_id), path)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{workspace_id}/file")
async def read_file(
    workspace_id: UUID,
    path: str = Query(...),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    try:
        content, mime = workspace_service.read_file(str(workspace_id), path)
        return {"path": path, "content": content, "type": mime}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{workspace_id}/file")
async def write_file(
    workspace_id: UUID,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    path = body.get("path", "")
    content = body.get("content", "")
    if not path:
        raise HTTPException(status_code=422, detail="path is required")
    try:
        workspace_service.write_file(str(workspace_id), path, content)
        return {"path": path, "saved": True}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{workspace_id}/file")
async def delete_file(
    workspace_id: UUID,
    path: str = Query(...),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    try:
        workspace_service.delete_path(str(workspace_id), path)
        return {"path": path, "deleted": True}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{workspace_id}/file/duplicate")
async def duplicate_file(
    workspace_id: UUID,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    path = body.get("path", "")
    if not path:
        raise HTTPException(status_code=422, detail="path is required")
    try:
        new_path = workspace_service.duplicate_path(str(workspace_id), path)
        return {"original": path, "duplicate": new_path}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{workspace_id}/file/download")
async def download_file(
    workspace_id: UUID,
    path: str = Query(...),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    try:
        buf, filename = workspace_service.download_path(str(workspace_id), path)
        media = "application/zip" if filename.endswith(".zip") else "application/octet-stream"
        return StreamingResponse(
            buf,
            media_type=media,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{workspace_id}/file/copy")
async def copy_file(
    workspace_id: UUID,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    src_path = body.get("path", "")
    dst_workspace_id = body.get("dst_workspace_id", str(workspace_id))
    dst_path = body.get("dst_path", "")
    if not src_path:
        raise HTTPException(status_code=422, detail="path is required")
    await _get_or_404(pool, dst_workspace_id)
    try:
        new_path = workspace_service.copy_path(str(workspace_id), src_path, dst_workspace_id, dst_path)
        return {"new_path": new_path, "dst_workspace_id": dst_workspace_id}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{workspace_id}/file/move")
async def move_file(
    workspace_id: UUID,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    await _get_or_404(pool, str(workspace_id))
    src_path = body.get("path", "")
    dst_workspace_id = body.get("dst_workspace_id", str(workspace_id))
    dst_path = body.get("dst_path", "")
    if not src_path:
        raise HTTPException(status_code=422, detail="path is required")
    await _get_or_404(pool, dst_workspace_id)
    try:
        new_path = workspace_service.move_path(str(workspace_id), src_path, dst_workspace_id, dst_path)
        return {"new_path": new_path, "dst_workspace_id": dst_workspace_id}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{workspace_id}/download")
async def download_workspace(workspace_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    await _get_or_404(pool, str(workspace_id))
    buf = workspace_service.zip_workspace(str(workspace_id))
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{workspace_id}.zip"'},
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    body: WorkspaceUpdateRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    workspace = await _get_or_404(pool, str(workspace_id))
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        if workspace["name"] == "default":
            raise HTTPException(status_code=400, detail="Cannot rename the default workspace")
        workspace = await update_workspace_name_crud(pool, str(workspace_id), body.name.strip())
    if body.color is not None:
        import re
        if not re.match(r'^#[0-9a-fA-F]{6}$', body.color):
            raise HTTPException(status_code=422, detail="Invalid hex color")
        workspace = await update_workspace_color_crud(pool, str(workspace_id), body.color)
    return await _serialize(workspace, pool)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(workspace_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    await _get_or_404(pool, str(workspace_id))
    await delete_workspace_crud(pool, str(workspace_id))
    workspace_service.delete_workspace_dir(str(workspace_id))
    return Response(status_code=204)
