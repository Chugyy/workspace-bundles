"""
CRUD operations for notes
Pure database access functions with no business logic.
"""

from typing import Optional, List, Dict, Any
import asyncpg

NOTE_COLUMNS = "id, lead_id, title, content, created_at, updated_at"


# =====================================================
# CREATE
# =====================================================

async def create_note_db(
    pool: asyncpg.Pool,
    lead_id: int,
    title: str,
    content: Optional[str] = None
) -> int:
    """Create a new note. Returns the created note ID."""
    query = """
        INSERT INTO notes (lead_id, title, content)
        VALUES ($1, $2, $3)
        RETURNING id
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, lead_id, title, content)

    return row["id"]


# =====================================================
# READ
# =====================================================

async def get_note_by_id_db(
    pool: asyncpg.Pool,
    note_id: int
) -> Optional[Dict[str, Any]]:
    """Get note by ID."""
    query = f"SELECT {NOTE_COLUMNS} FROM notes WHERE id = $1"

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, note_id)

    return dict(row) if row else None


async def list_notes_db(
    pool: asyncpg.Pool,
    lead_id: int,
    offset: int = 0,
    limit: int = 50
) -> tuple[List[Dict[str, Any]], int]:
    """List all notes for a lead with pagination. Returns (notes, total)."""
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM notes WHERE lead_id = $1", lead_id)
        rows = await conn.fetch(
            f"SELECT {NOTE_COLUMNS} FROM notes WHERE lead_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            lead_id, limit, offset
        )

    return [dict(row) for row in rows], total


async def get_notes_by_lead_db(
    pool: asyncpg.Pool,
    lead_id: int,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get all notes for a specific lead."""
    query = f"""
        SELECT {NOTE_COLUMNS} FROM notes
        WHERE lead_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, lead_id, limit, offset)

    return [dict(row) for row in rows]


# =====================================================
# UPDATE
# =====================================================

async def update_note_db(
    pool: asyncpg.Pool,
    note_id: int,
    title: Optional[str] = None,
    content: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Update note by ID (partial update)."""
    set_clauses = []
    params = []
    param_idx = 1

    if title is not None:
        set_clauses.append(f"title = ${param_idx}")
        params.append(title)
        param_idx += 1

    if content is not None:
        set_clauses.append(f"content = ${param_idx}")
        params.append(content)
        param_idx += 1

    if not set_clauses:
        return None

    params.append(note_id)
    query = f"""
        UPDATE notes
        SET {", ".join(set_clauses)}, updated_at = NOW()
        WHERE id = ${param_idx}
        RETURNING {NOTE_COLUMNS}
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)

    return dict(row) if row else None


# =====================================================
# DELETE
# =====================================================

async def delete_note_db(pool: asyncpg.Pool, note_id: int) -> bool:
    """Delete note by ID."""
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM notes WHERE id = $1", note_id)
    return int(result.split()[1]) > 0


async def delete_notes_by_lead_db(pool: asyncpg.Pool, lead_id: int) -> int:
    """Delete all notes for a specific lead."""
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM notes WHERE lead_id = $1", lead_id)
    return int(result.split()[1])


# =====================================================
# BULK OPERATIONS
# =====================================================

async def bulk_create_notes_db(
    pool: asyncpg.Pool,
    notes: List[Dict[str, Any]]
) -> List[int]:
    """Bulk create multiple notes."""
    if not notes:
        return []

    values_clauses = []
    params = []
    param_idx = 1

    for note in notes:
        values_clauses.append(f"(${param_idx}, ${param_idx + 1}, ${param_idx + 2})")
        params.extend([note["lead_id"], note["title"], note.get("content")])
        param_idx += 3

    query = f"""
        INSERT INTO notes (lead_id, title, content)
        VALUES {", ".join(values_clauses)}
        RETURNING id
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    return [row["id"] for row in rows]


async def bulk_delete_notes_db(pool: asyncpg.Pool, note_ids: List[int]) -> int:
    """Bulk delete multiple notes by IDs."""
    if not note_ids:
        return 0

    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM notes WHERE id = ANY($1)", note_ids)

    return int(result.split()[1])


# =====================================================
# COUNT
# =====================================================

async def count_notes_by_lead_db(pool: asyncpg.Pool, lead_id: int) -> int:
    """Count total notes for a specific lead."""
    async with pool.acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM notes WHERE lead_id = $1", lead_id)
