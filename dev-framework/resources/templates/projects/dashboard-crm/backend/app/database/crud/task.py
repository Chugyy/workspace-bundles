"""
CRUD operations for tasks.
Pure database access functions with no business logic.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg


# =====================================================
# CREATE
# =====================================================

async def create_task_db(
    pool: asyncpg.Pool,
    user_id: int,
    title: str,
    category: str,
    status: str = "todo",
    priority: str = "medium",
    description: Optional[str] = None,
    lead_id: Optional[int] = None,
    due_date: Optional[datetime] = None,
) -> int:
    query = """
        INSERT INTO tasks (user_id, lead_id, title, description, category, status, priority, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    """
    due_date_naive = due_date.replace(tzinfo=None) if due_date else None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id, lead_id, title, description, category, status, priority, due_date_naive)
    return row["id"]


# =====================================================
# READ
# =====================================================

async def get_task_by_id_db(
    pool: asyncpg.Pool,
    task_id: int,
    user_id: int,
) -> Optional[Dict[str, Any]]:
    query = """
        SELECT t.id, t.user_id, t.lead_id, t.title, t.description, t.category, t.status,
               t.priority, t.due_date, t.created_at, t.updated_at, l.name AS lead_name
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.id
        WHERE t.id = $1 AND t.user_id = $2
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, task_id, user_id)
    return dict(row) if row else None


async def list_tasks_db(
    pool: asyncpg.Pool,
    user_id: int,
    lead_id: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[List[Dict[str, Any]], int]:
    conditions = ["t.user_id = $1"]
    params: list = [user_id]
    idx = 2

    if lead_id is not None:
        conditions.append(f"t.lead_id = ${idx}")
        params.append(lead_id)
        idx += 1

    if category is not None:
        conditions.append(f"t.category = ${idx}")
        params.append(category)
        idx += 1

    if status is not None:
        conditions.append(f"t.status = ${idx}")
        params.append(status)
        idx += 1

    if priority is not None:
        conditions.append(f"t.priority = ${idx}")
        params.append(priority)
        idx += 1

    where = " AND ".join(conditions)

    count_query = f"SELECT COUNT(*) FROM tasks t WHERE {where}"
    data_query = f"""
        SELECT t.id, t.user_id, t.lead_id, t.title, t.description, t.category, t.status,
               t.priority, t.due_date, t.created_at, t.updated_at, l.name AS lead_name
        FROM tasks t
        LEFT JOIN leads l ON t.lead_id = l.id
        WHERE {where}
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
    """

    async with pool.acquire() as conn:
        total = await conn.fetchval(count_query, *params)
        rows = await conn.fetch(data_query, *params, limit, offset)

    return [dict(row) for row in rows], total


async def count_overdue_tasks_db(
    pool: asyncpg.Pool,
    user_id: int,
) -> int:
    """Count tasks past their due_date and not yet done. Used by Dashboard KPI."""
    query = """
        SELECT COUNT(*) FROM tasks
        WHERE user_id = $1
          AND due_date < NOW()
          AND status != 'done'
    """
    async with pool.acquire() as conn:
        return await conn.fetchval(query, user_id)


# =====================================================
# UPDATE
# =====================================================

async def update_task_db(
    pool: asyncpg.Pool,
    task_id: int,
    user_id: int,
    **fields,
) -> Optional[Dict[str, Any]]:
    allowed = {"title", "description", "category", "status", "priority", "due_date", "lead_id"}
    set_clauses = []
    params = []
    idx = 1

    for key, value in fields.items():
        if key in allowed:
            set_clauses.append(f"{key} = ${idx}")
            if key == "due_date" and value is not None and hasattr(value, "tzinfo") and value.tzinfo is not None:
                value = value.replace(tzinfo=None)
            params.append(value)
            idx += 1

    if not set_clauses:
        return None

    params.extend([task_id, user_id])
    query = f"""
        WITH upd AS (
            UPDATE tasks
            SET {", ".join(set_clauses)}
            WHERE id = ${idx} AND user_id = ${idx + 1}
            RETURNING id, user_id, lead_id, title, description, category, status, priority, due_date, created_at, updated_at
        )
        SELECT u.*, l.name AS lead_name
        FROM upd u
        LEFT JOIN leads l ON u.lead_id = l.id
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)
    return dict(row) if row else None


# =====================================================
# DELETE
# =====================================================

async def delete_task_db(
    pool: asyncpg.Pool,
    task_id: int,
    user_id: int,
) -> bool:
    query = "DELETE FROM tasks WHERE id = $1 AND user_id = $2"
    async with pool.acquire() as conn:
        result = await conn.execute(query, task_id, user_id)
    return int(result.split()[1]) > 0
