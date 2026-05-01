#!/usr/bin/env python3
# app/api/routes/sessions.py

import asyncio
import json
from pathlib import Path
from uuid import UUID, uuid4

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse

from app.core.jobs.sessions import (
    get_session_history_job,
    send_message_job,
    start_session_job,
    stop_session_job,
)
from app.core.services.agent import AgentManager
from app.core.services.storage import UPLOADS_DIR, save_file
from app.core.utils.auth import require_auth, require_auth_query
from app.database.crud.sessions import delete_session_crud, get_session_crud, list_sessions_crud
from app.database.db import get_db_pool
from app.api.models.sessions import (
    MessageResponse,
    SessionHistoryResponse,
    SessionListResponse,
    SessionResponse,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def get_pool() -> asyncpg.Pool:
    return await get_db_pool()


async def _read_uploads(uploads: list[UploadFile]) -> list[dict]:
    files_data = []
    for f in uploads:
        data = await f.read()
        file_id = str(uuid4())
        ext = Path(f.filename).suffix if f.filename else ""
        disk_name = f"{file_id}{ext}"
        save_file(disk_name, data)
        files_data.append({
            "file_id": file_id,
            "filename": f.filename,
            "mime_type": f.content_type,
            "size": len(data),
            "bytes": data,
            "path": str(UPLOADS_DIR / disk_name),
        })
    return files_data


@router.post("/start", response_model=SessionResponse)
async def start_session(
    prompt: str = Form(...),
    allowed_tools: str | None = Form(None),
    workspace_id: str | None = Form(None),
    model: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    files_data = await _read_uploads(files)
    tools = allowed_tools.split(",") if allowed_tools else []
    result = await start_session_job(pool, prompt, tools, workspace_id, files_data or None, model=model)
    return SessionResponse.model_validate(result)


@router.post("/{session_id}/send", response_model=SessionResponse)
async def send_message(
    session_id: UUID,
    prompt: str = Form(...),
    files: list[UploadFile] = File(default=[]),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    files_data = await _read_uploads(files)
    result = await send_message_job(pool, str(session_id), prompt, files_data or None)
    return SessionResponse.model_validate(result)


@router.post("/{session_id}/stop", response_model=SessionResponse)
async def stop_session(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    result = await stop_session_job(pool, str(session_id))
    return SessionResponse.model_validate(result)


@router.get("/{session_id}/events")
async def session_events(session_id: UUID, _: str = Depends(require_auth_query)):
    """SSE stream of real-time agent events for a session."""
    agent = AgentManager.get()
    queue = agent.subscribe(str(session_id))

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield "event: ping\ndata: {}\n\n"
                    continue

                yield f"data: {json.dumps(event)}\n\n"

                if event.get("type") in ("completed", "stopped", "error"):
                    break
        finally:
            agent.unsubscribe(str(session_id))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{session_id}", response_model=SessionHistoryResponse)
async def get_session(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    result = await get_session_history_job(pool, str(session_id))
    return SessionHistoryResponse(
        session=SessionResponse.model_validate(result["session"]),
        messages=[MessageResponse.model_validate(m) for m in result["messages"]],
    )


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: UUID, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    session = await get_session_crud(pool, str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] == "active":
        raise HTTPException(status_code=409, detail="Cannot delete an active session")
    await delete_session_crud(pool, str(session_id))
    return Response(status_code=204)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    status: str | None = Query(default=None),
    workspace_id: str | None = Query(default=None),
    sort_by: str = Query(default="updated_at"),
    sort_order: str = Query(default="desc"),
    search: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    pool: asyncpg.Pool = Depends(get_pool),
    _: str = Depends(require_auth),
):
    sessions = await list_sessions_crud(
        pool, status, workspace_id, sort_by, sort_order, search, limit, offset
    )
    return SessionListResponse(
        sessions=[SessionResponse.model_validate(s) for s in sessions],
        total=len(sessions),
    )
