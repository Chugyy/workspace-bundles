# messages.py - Agent Messages CRUD Operations

from typing import Dict, Any, List
import asyncpg
import json


async def create_message_crud(
    pool: asyncpg.Pool,
    session_id: str,
    role: str,
    content: dict,
    sequence_number: int
) -> Dict[str, Any]:
    """
    Insert a new message into agent_messages.

    Args:
        pool: Database connection pool
        session_id: UUID string of the parent session
        role: Message role ('user', 'assistant', 'tool')
        content: Message content as dict (serialized to JSON for asyncpg)
        sequence_number: Order index within the session

    Returns:
        Dict containing the created message row

    SQL:
        INSERT INTO agent_messages (session_id, role, content, sequence_number)
        VALUES ($1::uuid, $2, $3, $4) RETURNING *
    """
    query = """
        INSERT INTO agent_messages (session_id, role, content, sequence_number)
        VALUES ($1::uuid, $2, $3, $4)
        RETURNING *
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, session_id, role, json.dumps(content), sequence_number)
    if not row:
        return None
    result = dict(row)
    result["content"] = json.loads(result["content"]) if isinstance(result["content"], str) else result["content"]
    return result


async def list_messages_crud(
    pool: asyncpg.Pool,
    session_id: str
) -> List[Dict[str, Any]]:
    """
    List all messages for a session ordered by sequence_number.

    Args:
        pool: Database connection pool
        session_id: UUID string of the session

    Returns:
        List of message dicts ordered by sequence_number ASC

    SQL:
        SELECT * FROM agent_messages WHERE session_id=$1::uuid ORDER BY sequence_number ASC
    """
    query = """
        SELECT * FROM agent_messages
        WHERE session_id = $1::uuid
        ORDER BY sequence_number ASC
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, session_id)
    result = []
    for row in rows:
        d = dict(row)
        d["content"] = json.loads(d["content"]) if isinstance(d["content"], str) else d["content"]
        result.append(d)
    return result


async def update_message_content_crud(
    pool: asyncpg.Pool,
    message_id: str,
    content: dict,
) -> None:
    """Update the content of an existing message by ID."""
    query = "UPDATE agent_messages SET content = $1 WHERE id = $2::uuid"
    async with pool.acquire() as conn:
        await conn.execute(query, json.dumps(content), message_id)


async def count_messages_crud(
    pool: asyncpg.Pool,
    session_id: str
) -> int:
    """
    Count total messages in a session.

    Args:
        pool: Database connection pool
        session_id: UUID string of the session

    Returns:
        Integer count of messages

    SQL:
        SELECT COUNT(*) FROM agent_messages WHERE session_id=$1::uuid
    """
    query = """
        SELECT COUNT(*) FROM agent_messages
        WHERE session_id = $1::uuid
    """
    async with pool.acquire() as conn:
        count = await conn.fetchval(query, session_id)
    return int(count)
