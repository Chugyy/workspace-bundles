#!/usr/bin/env python3
# app/api/routes/note.py

"""
API routes for notes.
Generated from docs/architecture/backend/api/note.md

All routes are production-ready and import functions from:
- app/core/jobs/note (business logic)
- app/database/crud/lead (ownership verification)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any

# Import database pool
from app.database.db import get_db_pool

# Import auth dependency
from app.api.dependencies.auth import get_current_user

# Import Pydantic schemas
from app.api.models.note import (
    NoteCreateRequest,
    NoteUpdateRequest,
    NoteResponse,
    NoteListResponse,
)
from app.api.models.common import IdResponse, MessageResponse

# Import functions (Jobs from Phase 3.1)
from app.core.jobs.note import (
    create_note,
    get_note_by_id,
    get_notes_by_lead,
    update_note,
    delete_note,
)

# Import CRUD functions for ownership verification
from app.database.crud.lead import get_lead_by_id_db
from app.database.crud.note import get_note_by_id_db

router = APIRouter(
    prefix="/api",
    tags=["notes"]
)


# =====================================================
# HELPER FUNCTIONS
# =====================================================

async def verify_lead_ownership(lead_id: int, user_id: int) -> None:
    """
    Verify that the lead belongs to the authenticated user.

    Args:
        lead_id: Lead ID to verify
        user_id: Authenticated user ID

    Raises:
        HTTPException:
            - 404: Lead not found
            - 403: Lead not owned by user
    """
    pool = await get_db_pool()
    lead = await get_lead_by_id_db(pool, lead_id)

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead {lead_id} not found"
        )

    if lead["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this lead"
        )


async def verify_note_ownership(note_id: int, user_id: int) -> Dict[str, Any]:
    """
    Verify that the note belongs to a lead owned by the authenticated user.

    Args:
        note_id: Note ID to verify
        user_id: Authenticated user ID

    Returns:
        Note dict if ownership verified

    Raises:
        HTTPException:
            - 404: Note not found
            - 403: Note's lead not owned by user
    """
    pool = await get_db_pool()
    note = await get_note_by_id_db(pool, note_id)

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note {note_id} not found"
        )

    # Check lead ownership
    lead = await get_lead_by_id_db(pool, note["lead_id"])

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead {note['lead_id']} not found"
        )

    if lead["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this note"
        )

    return note


# =====================================================
# ENDPOINTS
# =====================================================

@router.post("/notes", response_model=IdResponse, status_code=status.HTTP_201_CREATED)
async def create_note_endpoint(
    data: NoteCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new note attached to a specific lead.

    Protected endpoint - requires authentication.
    User must own the lead to create notes for it.

    Args:
        data: Note creation data (leadId, title, content, description)
        current_user: Authenticated user from JWT token

    Returns:
        IdResponse: ID of created note

    Raises:
        HTTPException:
            - 400: Validation error (invalid data, title/content empty)
            - 401: Unauthorized (missing/invalid token)
            - 404: Lead not found
            - 403: Lead not owned by authenticated user
            - 500: Internal server error
    """
    pool = await get_db_pool()

    try:
        # Verify lead exists and is owned by user
        await verify_lead_ownership(data.lead_id, current_user["id"])

        # Call Job function
        result = await create_note(
            pool=pool,
            lead_id=data.lead_id,
            title=data.title,
            content=data.content
        )

        return IdResponse(id=result["id"])

    except HTTPException:
        raise

    except ValueError as e:
        # Validation errors from job
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create note"
        )


@router.get("/notes/{note_id}", response_model=NoteResponse, status_code=status.HTTP_200_OK)
async def get_note_endpoint(
    note_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get note details by ID.

    Protected endpoint - requires authentication and ownership.
    Note must belong to a lead owned by the authenticated user.

    Args:
        note_id: Note ID
        current_user: Authenticated user from JWT token

    Returns:
        NoteResponse: Note details

    Raises:
        HTTPException:
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (note's lead not owned by user)
            - 404: Note not found
    """
    try:
        # Verify ownership and get note
        note = await verify_note_ownership(note_id, current_user["id"])
        return NoteResponse(**note)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch note"
        )


@router.put("/notes/{note_id}", response_model=NoteResponse, status_code=status.HTTP_200_OK)
async def update_note_endpoint(
    note_id: int,
    data: NoteUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update note fields by ID.

    Protected endpoint - requires authentication and ownership.
    Supports partial updates (only provided fields are updated).
    The lead_id is immutable and cannot be changed.

    Args:
        note_id: Note ID
        data: Note update data (title, description, content - all optional)
        current_user: Authenticated user from JWT token

    Returns:
        NoteResponse: Updated note

    Raises:
        HTTPException:
            - 400: Validation error (title/content empty if provided)
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (note's lead not owned by user)
            - 404: Note not found
            - 500: Internal server error
    """
    pool = await get_db_pool()

    try:
        # Verify ownership
        await verify_note_ownership(note_id, current_user["id"])

        # Call Job function (handles validation)
        result = await update_note(
            pool=pool,
            note_id=note_id,
            updates=data.dict(exclude_unset=True)  # Only send provided fields
        )

        return NoteResponse(**result)

    except HTTPException:
        raise

    except ValueError as e:
        # Not found or validation error
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update note"
        )


@router.delete("/notes/{note_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_note_endpoint(
    note_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete note by ID (hard delete).

    Protected endpoint - requires authentication and ownership.
    This operation is irreversible.

    Args:
        note_id: Note ID
        current_user: Authenticated user from JWT token

    Returns:
        MessageResponse: Success confirmation message

    Raises:
        HTTPException:
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (note's lead not owned by user)
            - 404: Note not found
            - 500: Internal server error
    """
    pool = await get_db_pool()

    try:
        # Verify ownership
        await verify_note_ownership(note_id, current_user["id"])

        # Call Job function
        success = await delete_note(pool=pool, note_id=note_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note {note_id} not found"
            )

        return MessageResponse(message="Note deleted successfully")

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete note"
        )


@router.get("/leads/{lead_id}/notes", response_model=NoteListResponse, status_code=status.HTTP_200_OK)
async def get_notes_by_lead_endpoint(
    lead_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all notes for a specific lead.

    Protected endpoint - requires authentication and ownership.
    Returns notes sorted chronologically (most recent first).
    Returns empty list if no notes found.

    Args:
        lead_id: Lead ID to fetch notes for
        current_user: Authenticated user from JWT token

    Returns:
        NoteListResponse: List of notes for the lead

    Raises:
        HTTPException:
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (lead not owned by user)
            - 404: Lead not found
    """
    pool = await get_db_pool()

    try:
        # Verify lead exists and is owned by user
        await verify_lead_ownership(lead_id, current_user["id"])

        # Call Job function
        notes = await get_notes_by_lead(pool=pool, lead_id=lead_id)

        # Convert to response models
        note_responses = [NoteResponse(**note) for note in notes]

        return NoteListResponse(notes=note_responses)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notes"
        )
