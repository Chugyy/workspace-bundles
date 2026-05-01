# app/core/jobs/sessions.py
#
# Business-logic layer for agent session workflows.
# Orchestrates CRUD + AgentManager service; returns raw dicts.

import asyncpg

from app.core.exceptions import NotFoundException, ValidationException
from app.core.services.agent import AgentManager
from app.database.crud.files import create_file_crud
from config.config import settings
from app.database.crud.messages import list_messages_crud
from app.database.crud.sessions import (
    create_session_crud,
    get_session_crud,
    update_session_status_crud,
)
from app.database.crud.workspaces import get_default_workspace_crud, get_workspace_crud


async def _persist_files(pool: asyncpg.Pool, session_id: str, files: list[dict]) -> None:
    for f in files:
        url = f"{settings.api_base_url.rstrip('/')}/files/{f['file_id']}"
        f["url"] = url
        # f["path"] already set by _read_uploads with correct extension
        await create_file_crud(
            pool,
            file_id=f["file_id"],
            session_id=session_id,
            filename=f["filename"],
            mime_type=f["mime_type"],
            size=f["size"],
            url=url,
        )


async def start_session_job(
    pool: asyncpg.Pool,
    prompt: str,
    allowed_tools: list[str] | None = None,
    workspace_id: str | None = None,
    files: list[dict] | None = None,
    initiated_by: str = "human",
    model: str | None = None,
) -> dict:
    """Create a new session and fire the agent in the background."""
    # Resolve workspace (fallback to default)
    if workspace_id:
        workspace = await get_workspace_crud(pool, workspace_id)
        if not workspace:
            raise NotFoundException(resource="Workspace", identifier=workspace_id)
    else:
        workspace = await get_default_workspace_crud(pool)

    cwd = f"{settings.base_workspaces_path}/{workspace['id']}"
    allowed_tools_str = ",".join(allowed_tools) if allowed_tools else None
    session = await create_session_crud(pool, allowed_tools_str, str(workspace["id"]), initiated_by)
    session_id = str(session["id"])

    if files:
        await _persist_files(pool, session_id, files)

    await AgentManager.get().start(session_id, prompt, pool, allowed_tools or [], None, files, cwd, model=model)
    return session


async def send_message_job(
    pool: asyncpg.Pool,
    session_id: str,
    prompt: str,
    files: list[dict] | None = None,
) -> dict:
    """Resume an existing session with a new prompt."""
    session = await get_session_crud(pool, session_id)
    if session is None:
        raise NotFoundException(resource="Session", identifier=session_id)

    if session["status"] == "active" and not AgentManager.get().is_running(session_id):
        # Session marked active but agent not running (e.g. server restart) — allow resume
        await update_session_status_crud(pool, session_id, "stopped", session["claude_session_id"])

    if AgentManager.get().is_running(session_id):
        raise ValidationException("Agent already running for this session")

    if files:
        await _persist_files(pool, session_id, files)

    resume_id = session["claude_session_id"]
    await update_session_status_crud(pool, session_id, "active", None)

    # Resolve workspace cwd for resumed session
    workspace = None
    if session.get("workspace_id"):
        workspace = await get_workspace_crud(pool, str(session["workspace_id"]))
    if not workspace:
        workspace = await get_default_workspace_crud(pool)
    cwd = f"{settings.base_workspaces_path}/{workspace['id']}"

    allowed_tools = session["allowed_tools"].split(",") if session["allowed_tools"] else []
    await AgentManager.get().start(session_id, prompt, pool, allowed_tools, resume_id, files, cwd)

    return await get_session_crud(pool, session_id)


async def stop_session_job(
    pool: asyncpg.Pool,
    session_id: str,
) -> dict:
    """Signal the running agent to stop; force status update if not running."""
    session = await get_session_crud(pool, session_id)
    if session is None:
        raise NotFoundException(resource="Session", identifier=session_id)

    was_running = await AgentManager.get().stop(session_id)
    if not was_running:
        await update_session_status_crud(pool, session_id, "stopped", session["claude_session_id"])

    return await get_session_crud(pool, session_id)


async def get_session_history_job(
    pool: asyncpg.Pool,
    session_id: str,
) -> dict:
    """Return session metadata + all messages."""
    session = await get_session_crud(pool, session_id)
    if session is None:
        raise NotFoundException(resource="Session", identifier=session_id)

    messages = await list_messages_crud(pool, session_id)
    return {"session": session, "messages": messages}
