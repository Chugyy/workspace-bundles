"""
CRUD operations for events.
Pure database access functions with no business logic.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg


_SELECT_FIELDS = """
    id, user_id, lead_id, title, description, event_type,
    approach_type, event_date, is_completed, created_at, updated_at
"""


# =====================================================
# CREATE
# =====================================================

async def create_event_db(
    pool: asyncpg.Pool,
    user_id: int,
    title: str,
    event_type: str,
    event_date: datetime,
    description: Optional[str] = None,
    lead_id: Optional[int] = None,
    is_completed: bool = False,
    approach_type: Optional[str] = None,
) -> int:
    query = """
        INSERT INTO events (user_id, lead_id, title, description, event_type, approach_type, event_date, is_completed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    """
    event_date_naive = event_date.replace(tzinfo=None) if event_date and event_date.tzinfo else event_date
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id, lead_id, title, description, event_type, approach_type, event_date_naive, is_completed)
    return row["id"]


# =====================================================
# READ
# =====================================================

async def get_event_by_id_db(
    pool: asyncpg.Pool,
    event_id: int,
    user_id: int,
) -> Optional[Dict[str, Any]]:
    query = f"SELECT {_SELECT_FIELDS} FROM events WHERE id = $1 AND user_id = $2"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, event_id, user_id)
    return dict(row) if row else None


async def list_events_db(
    pool: asyncpg.Pool,
    user_id: int,
    lead_id: Optional[int] = None,
    event_type: Optional[str] = None,
    approach_type: Optional[str] = None,
    is_completed: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    order: str = "desc",
) -> tuple[List[Dict[str, Any]], int]:
    conditions = ["user_id = $1"]
    params: list = [user_id]
    idx = 2

    if lead_id is not None:
        conditions.append(f"lead_id = ${idx}"); params.append(lead_id); idx += 1
    if event_type is not None:
        conditions.append(f"event_type = ${idx}"); params.append(event_type); idx += 1
    if approach_type is not None:
        conditions.append(f"approach_type = ${idx}"); params.append(approach_type); idx += 1
    if is_completed is not None:
        conditions.append(f"is_completed = ${idx}"); params.append(is_completed); idx += 1

    where = " AND ".join(conditions)
    sort = "DESC" if order.lower() == "desc" else "ASC"

    count_query = f"SELECT COUNT(*) FROM events WHERE {where}"
    data_query = f"""
        SELECT {_SELECT_FIELDS}
        FROM events
        WHERE {where}
        ORDER BY event_date {sort}
        LIMIT ${idx} OFFSET ${idx + 1}
    """

    async with pool.acquire() as conn:
        total = await conn.fetchval(count_query, *params)
        rows = await conn.fetch(data_query, *params, limit, offset)

    return [dict(row) for row in rows], total


async def list_upcoming_events_db(
    pool: asyncpg.Pool,
    user_id: int,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Fetch upcoming reminders (future events not yet completed) for Dashboard."""
    query = f"""
        SELECT {_SELECT_FIELDS}
        FROM events
        WHERE user_id = $1
          AND event_date >= NOW()
          AND is_completed = FALSE
        ORDER BY event_date ASC
        LIMIT $2
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, user_id, limit)
    return [dict(row) for row in rows]


# =====================================================
# UPDATE
# =====================================================

async def update_event_db(
    pool: asyncpg.Pool,
    event_id: int,
    user_id: int,
    **fields,
) -> Optional[Dict[str, Any]]:
    allowed = {"title", "description", "event_type", "approach_type", "event_date", "is_completed", "lead_id"}
    set_clauses = []
    params = []
    idx = 1

    for key, value in fields.items():
        if key in allowed:
            set_clauses.append(f"{key} = ${idx}")
            if key == "event_date" and value is not None and hasattr(value, "tzinfo") and value.tzinfo is not None:
                value = value.replace(tzinfo=None)
            params.append(value)
            idx += 1

    if not set_clauses:
        return None

    params.extend([event_id, user_id])
    query = f"""
        UPDATE events
        SET {", ".join(set_clauses)}
        WHERE id = ${idx} AND user_id = ${idx + 1}
        RETURNING {_SELECT_FIELDS}
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)
    return dict(row) if row else None


# =====================================================
# DELETE
# =====================================================

async def delete_event_db(
    pool: asyncpg.Pool,
    event_id: int,
    user_id: int,
) -> bool:
    query = "DELETE FROM events WHERE id = $1 AND user_id = $2"
    async with pool.acquire() as conn:
        result = await conn.execute(query, event_id, user_id)
    return int(result.split()[1]) > 0
