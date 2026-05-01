# crud/workspaces.py

import json
from typing import Optional
import asyncpg


async def create_workspace_crud(pool: asyncpg.Pool, name: str) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO workspaces (name) VALUES ($1) RETURNING *", name
        )
    return dict(row)


async def get_workspace_crud(pool: asyncpg.Pool, workspace_id: str) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM workspaces WHERE id = $1::uuid", workspace_id
        )
    return dict(row) if row else None


async def get_default_workspace_crud(pool: asyncpg.Pool) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM workspaces WHERE name = 'default' LIMIT 1"
        )
    return dict(row) if row else None


async def list_workspaces_crud(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM workspaces ORDER BY created_at ASC"
        )
    return [dict(r) for r in rows]


async def update_workspace_profile_crud(
    pool: asyncpg.Pool,
    workspace_id: str,
    profile_id: str,
    included_items: list[str],
) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE workspaces
            SET claude_profile_id = $2::uuid,
                included_items = $3::jsonb,
                applied_at = NOW()
            WHERE id = $1::uuid
            RETURNING *
            """,
            workspace_id,
            profile_id,
            json.dumps(included_items),
        )
    return dict(row) if row else None


async def update_workspace_name_crud(
    pool: asyncpg.Pool,
    workspace_id: str,
    name: str,
) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE workspaces SET name = $2 WHERE id = $1::uuid RETURNING *",
            workspace_id, name,
        )
    return dict(row) if row else None


async def update_workspace_color_crud(
    pool: asyncpg.Pool,
    workspace_id: str,
    color: str,
) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE workspaces SET color = $2 WHERE id = $1::uuid RETURNING *",
            workspace_id, color,
        )
    return dict(row) if row else None


async def count_workspace_sessions_crud(pool: asyncpg.Pool, workspace_id: str) -> int:
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT COUNT(*) FROM agent_sessions WHERE workspace_id = $1::uuid",
            workspace_id,
        )


async def delete_workspace_crud(pool: asyncpg.Pool, workspace_id: str) -> bool:
    async with pool.acquire() as conn:
        # Delete associated sessions + messages first
        await conn.execute(
            "DELETE FROM agent_messages WHERE session_id IN (SELECT id FROM agent_sessions WHERE workspace_id = $1::uuid)",
            workspace_id,
        )
        await conn.execute(
            "DELETE FROM agent_sessions WHERE workspace_id = $1::uuid",
            workspace_id,
        )
        row = await conn.fetchrow(
            "DELETE FROM workspaces WHERE id = $1::uuid AND name != 'default' RETURNING id",
            workspace_id,
        )
    return row is not None
