#!/usr/bin/env python3
# app/api/models/event.py

"""
Pydantic schemas for event endpoints.
ALL schemas inherit from BaseSchema (automatic snake_case → camelCase).
"""

from pydantic import Field
from typing import Optional, List, Literal
from datetime import datetime

from app.api.models.common import BaseSchema


EventType = Literal["call", "email", "meeting", "followup", "other"]
ApproachType = Literal["first", "followup"]


# =====================================================
# REQUEST SCHEMAS
# =====================================================

class EventCreateRequest(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None)
    event_type: EventType = Field(..., description="Type of event / channel")
    approach_type: Optional[ApproachType] = Field(None, description="première approche or relance")
    event_date: datetime = Field(..., description="When the event occurs/occurred")
    lead_id: Optional[int] = Field(None, gt=0)
    is_completed: bool = Field(False)


class EventUpdateRequest(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None)
    event_type: Optional[EventType] = Field(None)
    approach_type: Optional[ApproachType] = Field(None)
    event_date: Optional[datetime] = Field(None)
    lead_id: Optional[int] = Field(None, gt=0)
    is_completed: Optional[bool] = Field(None)


# =====================================================
# RESPONSE SCHEMAS
# =====================================================

class EventResponse(BaseSchema):
    id: int
    user_id: int
    lead_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    event_type: str
    approach_type: Optional[str] = None
    event_date: datetime
    is_completed: bool
    created_at: datetime
    updated_at: datetime


class EventListResponse(BaseSchema):
    events: List[EventResponse]
    total: int
