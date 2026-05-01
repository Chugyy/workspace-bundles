#!/usr/bin/env python3
# app/api/models/task.py

"""
Pydantic schemas for task endpoints.
ALL schemas inherit from BaseSchema (automatic snake_case → camelCase).
"""

from pydantic import Field
from typing import Optional, List, Literal
from datetime import datetime

from app.api.models.common import BaseSchema


TaskCategory = Literal["commercial", "delivery"]
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]


# =====================================================
# REQUEST SCHEMAS
# =====================================================

class TaskCreateRequest(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None)
    category: TaskCategory = Field(...)
    status: TaskStatus = Field("todo")
    priority: TaskPriority = Field("medium")
    due_date: Optional[datetime] = Field(None)
    lead_id: Optional[int] = Field(None, gt=0)


class TaskUpdateRequest(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None)
    category: Optional[TaskCategory] = Field(None)
    status: Optional[TaskStatus] = Field(None)
    priority: Optional[TaskPriority] = Field(None)
    due_date: Optional[datetime] = Field(None)
    lead_id: Optional[int] = Field(None, gt=0)


# =====================================================
# RESPONSE SCHEMAS
# =====================================================

class TaskResponse(BaseSchema):
    id: int
    user_id: int
    lead_id: Optional[int] = None
    lead_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseSchema):
    tasks: List[TaskResponse]
    total: int
