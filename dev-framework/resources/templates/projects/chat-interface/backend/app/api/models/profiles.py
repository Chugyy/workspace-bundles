# app/api/models/profiles.py

from datetime import datetime
from uuid import UUID

from app.api.models.common import BaseSchema


class ProfileCreateRequest(BaseSchema):
    name: str


class ProfileUpdateRequest(BaseSchema):
    color: str | None = None


class ProfileResponse(BaseSchema):
    id: UUID
    name: str
    color: str = '#9ca3af'
    created_at: datetime


class ProfileItemResponse(BaseSchema):
    path: str
    type: str  # "file" | "dir"
    is_new: bool = False
