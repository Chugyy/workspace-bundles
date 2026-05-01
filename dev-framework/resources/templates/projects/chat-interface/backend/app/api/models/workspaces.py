# app/api/models/workspaces.py

from datetime import datetime
from uuid import UUID

from app.api.models.common import BaseSchema


class WorkspaceCreateRequest(BaseSchema):
    name: str


class ApplyProfileRequest(BaseSchema):
    profile_id: UUID
    items: list[str]  # relative paths from profile root


class WorkspaceUpdateRequest(BaseSchema):
    name: str | None = None
    color: str | None = None


class WorkspaceResponse(BaseSchema):
    id: UUID
    name: str
    color: str = '#9ca3af'
    claude_profile_id: UUID | None = None
    included_items: list[str] = []
    applied_at: datetime | None = None
    created_at: datetime


class BrowseEntry(BaseSchema):
    name: str
    type: str  # "file" | "dir"
    size: int | None = None


class BrowseResponse(BaseSchema):
    path: str
    entries: list[BrowseEntry]
