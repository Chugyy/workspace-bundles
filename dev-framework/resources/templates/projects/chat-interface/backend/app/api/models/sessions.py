#!/usr/bin/env python3
# app/api/models/sessions.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from app.api.models.common import BaseSchema


# =====================================================
# REQUEST MODELS
# =====================================================

class SessionStartRequest(BaseSchema):
    prompt: str
    allowed_tools: list[str] | None = None


class SessionSendRequest(BaseSchema):
    prompt: str


# =====================================================
# RESPONSE MODELS
# =====================================================

class SessionResponse(BaseSchema):
    id: UUID
    claude_session_id: str | None = None
    status: str
    allowed_tools: str | None = None  # CSV string as-is (e.g. "Read,Write,Bash")
    workspace_id: UUID | None = None
    workspace_name: str | None = None
    workspace_color: str | None = None
    initiated_by: str = "human"
    first_message: str | None = None
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseSchema):
    id: UUID
    session_id: UUID
    role: str
    content: dict
    sequence_number: int
    created_at: datetime


class SessionHistoryResponse(BaseSchema):
    session: SessionResponse
    messages: list[MessageResponse]


class SessionListResponse(BaseSchema):
    sessions: list[SessionResponse]
    total: int
