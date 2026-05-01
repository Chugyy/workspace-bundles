#!/usr/bin/env python3
# app/api/models/note.py

"""
Pydantic schemas for note endpoints.

IMPORTANT:
- ALL schemas inherit from BaseSchema (automatic snake_case → camelCase)
- Python code: ALWAYS snake_case (lead_id, created_at, updated_at)
- JSON output: ALWAYS camelCase (leadId, createdAt, updatedAt)
"""

from pydantic import Field
from typing import Optional, List
from datetime import datetime

from app.api.models.common import BaseSchema


# =====================================================
# REQUEST SCHEMAS
# =====================================================

class NoteCreateRequest(BaseSchema):
    """Used by: POST /api/notes"""
    lead_id: int = Field(..., gt=0, description="ID of the lead this note belongs to")
    title: str = Field(..., min_length=1, max_length=255, description="Note title (required)")
    content: Optional[str] = Field(None, description="Note content (optional)")

    class Config:
        json_schema_extra = {
            "example": {
                "leadId": 123,
                "title": "Premier appel",
                "content": "Client intéressé par l'offre premium."
            }
        }


class NoteUpdateRequest(BaseSchema):
    """Used by: PUT /api/notes/{id} — all fields optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Note title")
    content: Optional[str] = Field(None, description="Note content")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Suivi appel",
                "content": "Client a confirmé son intérêt."
            }
        }


# =====================================================
# RESPONSE SCHEMAS
# =====================================================

class NoteResponse(BaseSchema):
    """Used by: GET /api/notes/{id}, PUT /api/notes/{id}"""
    id: int = Field(..., description="Note ID")
    lead_id: int = Field(..., description="Lead ID this note belongs to")
    title: str = Field(..., description="Note title")
    content: Optional[str] = Field(None, description="Note content")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 456,
                "leadId": 123,
                "title": "Premier appel",
                "content": "Client intéressé par l'offre premium.",
                "createdAt": "2025-01-15T10:30:00Z",
                "updatedAt": "2025-01-15T14:20:00Z"
            }
        }


class NoteListResponse(BaseSchema):
    """Used by: GET /api/leads/{lead_id}/notes"""
    notes: List[NoteResponse] = Field(..., description="List of notes for the lead")
