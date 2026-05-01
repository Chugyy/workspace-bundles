#!/usr/bin/env python3
# app/core/jobs/note.py

"""
Business logic jobs for note.
Note entity is CRUD-only with no complex business logic.
Jobs are thin wrappers around CRUD operations with basic validation.
"""

import asyncpg
from typing import List, Optional, Dict, Any

from app.database.crud.note import (
    create_note_db,
    get_note_by_id_db,
    get_notes_by_lead_db,
    update_note_db,
    delete_note_db,
)


async def create_note(
    pool: asyncpg.Pool,
    lead_id: int,
    title: str,
    content: Optional[str] = None
) -> Dict[str, Any]:
    """Create new note attached to lead."""
    if not title or not title.strip():
        raise ValueError("title is required and cannot be empty")

    if len(title) > 255:
        raise ValueError("title must not exceed 255 characters")

    note_id = await create_note_db(pool, lead_id, title, content)

    note = await get_note_by_id_db(pool, note_id)
    if not note:
        raise RuntimeError(f"Failed to retrieve created note {note_id}")

    return note


async def get_note_by_id(pool: asyncpg.Pool, note_id: int) -> Optional[Dict[str, Any]]:
    """Get note by ID."""
    return await get_note_by_id_db(pool, note_id)


async def get_notes_by_lead(pool: asyncpg.Pool, lead_id: int) -> List[Dict[str, Any]]:
    """Get all notes for a specific lead (sorted by created_at DESC)."""
    return await get_notes_by_lead_db(pool, lead_id)


async def update_note(
    pool: asyncpg.Pool,
    note_id: int,
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    """Update note by ID (partial update)."""
    title = updates.get("title")
    content = updates.get("content")

    if title is not None:
        if not title.strip():
            raise ValueError("title cannot be empty if provided")
        if len(title) > 255:
            raise ValueError("title must not exceed 255 characters")

    updated_note = await update_note_db(pool, note_id, title=title, content=content)

    if not updated_note:
        raise ValueError(f"Note {note_id} not found")

    return updated_note


async def delete_note(pool: asyncpg.Pool, note_id: int) -> bool:
    """Delete note by ID."""
    return await delete_note_db(pool, note_id)
