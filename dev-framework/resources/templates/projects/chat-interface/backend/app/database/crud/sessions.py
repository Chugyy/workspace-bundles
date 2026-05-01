# sessions.py - Agent Sessions CRUD Operations

from typing import Optional, Dict, Any, List
import asyncpg


async def create_session_crud(
    pool: asyncpg.Pool,
    allowed_tools: Optional[str] = None,
    workspace_id: Optional[str] = None,
    initiated_by: str = "human",
) -> Dict[str, Any]:
    query = """
        INSERT INTO agent_sessions (allowed_tools, workspace_id, initiated_by)
        VALUES ($1, $2::uuid, $3)
        RETURNING *
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, allowed_tools, workspace_id, initiated_by)
    return dict(row) if row else None


async def get_session_crud(
    pool: asyncpg.Pool,
    session_id: str
) -> Optional[Dict[str, Any]]:
    """
    Fetch a session by its UUID.

    Args:
        pool: Database connection pool
        session_id: UUID string of the session

    Returns:
        Dict containing session data or None if not found

    SQL:
        SELECT * FROM agent_sessions WHERE id = $1::uuid
    """
    query = """
        SELECT * FROM agent_sessions
        WHERE id = $1::uuid
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, session_id)
    return dict(row) if row else None


async def update_session_status_crud(
    pool: asyncpg.Pool,
    session_id: str,
    status: str,
    claude_session_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Update session status (and optionally set claude_session_id).

    Args:
        pool: Database connection pool
        session_id: UUID string of the session
        status: New status ('active', 'stopped', 'completed', 'error')
        claude_session_id: Claude SDK session ID to store (optional)

    Returns:
        Updated session dict or None if not found

    SQL (without claude_session_id):
        UPDATE agent_sessions SET status=$2, updated_at=NOW()
        WHERE id=$1::uuid RETURNING *

    SQL (with claude_session_id):
        UPDATE agent_sessions SET status=$2, updated_at=NOW(), claude_session_id=$3
        WHERE id=$1::uuid RETURNING *
    """
    if claude_session_id is not None:
        query = """
            UPDATE agent_sessions
            SET status = $2, updated_at = NOW(), claude_session_id = $3
            WHERE id = $1::uuid
            RETURNING *
        """
        async with pool.acquire() as conn:
            row = await conn.fetchrow(query, session_id, status, claude_session_id)
    else:
        query = """
            UPDATE agent_sessions
            SET status = $2, updated_at = NOW()
            WHERE id = $1::uuid
            RETURNING *
        """
        async with pool.acquire() as conn:
            row = await conn.fetchrow(query, session_id, status)

    return dict(row) if row else None


async def list_sessions_crud(
    pool: asyncpg.Pool,
    status: Optional[str] = None,
    workspace_id: Optional[str] = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    first_msg_subquery = """
        (SELECT content->>'text'
         FROM agent_messages
         WHERE session_id = s.id AND role = 'user'
         ORDER BY sequence_number ASC
         LIMIT 1) AS first_message
    """
    workspace_name_subquery = """
        (SELECT w.name FROM workspaces w WHERE w.id = s.workspace_id) AS workspace_name
    """
    workspace_color_subquery = """
        (SELECT w.color FROM workspaces w WHERE w.id = s.workspace_id) AS workspace_color
    """

    conditions = []
    params: list = []
    idx = 1

    if status is not None:
        conditions.append(f"s.status = ${idx}")
        params.append(status)
        idx += 1

    if workspace_id is not None:
        conditions.append(f"s.workspace_id = ${idx}::uuid")
        params.append(workspace_id)
        idx += 1

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Validate sort
    allowed_sorts = {"created_at", "updated_at"}
    col = sort_by if sort_by in allowed_sorts else "updated_at"
    direction = "ASC" if sort_order.lower() == "asc" else "DESC"

    query = f"""
        SELECT s.*, {first_msg_subquery}, {workspace_name_subquery}, {workspace_color_subquery}
        FROM agent_sessions s
        {where}
        ORDER BY s.{col} {direction}
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    params.extend([limit, offset])

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    results = [dict(row) for row in rows]

    # Client-side search on first_message (simpler than SQL full-text)
    if search:
        search_lower = search.lower()
        results = [r for r in results if search_lower in (r.get("first_message") or "").lower()]

    return results


async def delete_session_crud(
    pool: asyncpg.Pool,
    session_id: str
) -> Optional[str]:
    """
    Delete a session by its UUID. Messages are removed via ON DELETE CASCADE.

    Args:
        pool: Database connection pool
        session_id: UUID string of the session

    Returns:
        The deleted session UUID string, or None if not found

    SQL:
        DELETE FROM agent_sessions WHERE id = $1::uuid RETURNING id
    """
    query = """
        DELETE FROM agent_sessions
        WHERE id = $1::uuid
        RETURNING id
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, session_id)
    return str(row["id"]) if row else None
