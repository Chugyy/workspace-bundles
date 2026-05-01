#!/usr/bin/env python3
# app/api/routes/event.py

"""
API routes for events.
Route → CRUD directly (no jobs - pure CRUD operations).
Ownership: user_id baked into all CRUD queries.
Lead ownership verified inline when lead_id is provided.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Dict, Any, Optional

from app.database.db import get_db_pool
from app.api.dependencies.auth import get_current_user
from app.api.models.event import (
    EventCreateRequest,
    EventUpdateRequest,
    EventResponse,
    EventListResponse,
)
from app.api.models.common import IdResponse, MessageResponse
from app.database.crud.event import (
    create_event_db,
    get_event_by_id_db,
    list_events_db,
    list_upcoming_events_db,
    update_event_db,
    delete_event_db,
)

from app.database.crud.lead import get_lead_by_id_db

router = APIRouter(prefix="/api", tags=["events"])


# =====================================================
# HELPER
# =====================================================

async def verify_lead_ownership(pool, lead_id: int, user_id: int) -> None:
    lead = await get_lead_by_id_db(pool, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Lead {lead_id} not found")
    if lead["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this lead")


# =====================================================
# ENDPOINTS
# =====================================================

@router.post("/events", response_model=IdResponse, status_code=status.HTTP_201_CREATED)
async def create_event_endpoint(
    data: EventCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    try:
        if data.lead_id:
            await verify_lead_ownership(pool, data.lead_id, current_user["id"])

        event_id = await create_event_db(
            pool,
            user_id=current_user["id"],
            title=data.title,
            event_type=data.event_type,
            approach_type=data.approach_type,
            event_date=data.event_date,
            description=data.description,
            lead_id=data.lead_id,
            is_completed=data.is_completed,
        )
        return IdResponse(id=event_id)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create event")


@router.get("/events/upcoming", response_model=EventListResponse, status_code=status.HTTP_200_OK)
async def get_upcoming_events_endpoint(
    limit: int = Query(10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upcoming reminders for Dashboard widget."""
    pool = await get_db_pool()
    try:
        events = await list_upcoming_events_db(pool, current_user["id"], limit=limit)
        return EventListResponse(events=[EventResponse(**e) for e in events], total=len(events))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch upcoming events")


@router.get("/events", response_model=EventListResponse, status_code=status.HTTP_200_OK)
async def list_events_endpoint(
    lead_id: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    approach_type: Optional[str] = Query(None),
    is_completed: Optional[bool] = Query(None),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    try:
        offset = (page - 1) * limit
        events, total = await list_events_db(
            pool,
            user_id=current_user["id"],
            lead_id=lead_id,
            event_type=event_type,
            approach_type=approach_type,
            is_completed=is_completed,
            limit=limit,
            offset=offset,
            order=order,
        )
        return EventListResponse(events=[EventResponse(**e) for e in events], total=total)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch events")


@router.get("/events/{event_id}", response_model=EventResponse, status_code=status.HTTP_200_OK)
async def get_event_endpoint(
    event_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    event = await get_event_by_id_db(pool, event_id, current_user["id"])
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
    return EventResponse(**event)


@router.put("/events/{event_id}", response_model=EventResponse, status_code=status.HTTP_200_OK)
async def update_event_endpoint(
    event_id: int,
    data: EventUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    try:
        updates = data.model_dump(exclude_unset=True)

        if "lead_id" in updates and updates["lead_id"] is not None:
            await verify_lead_ownership(pool, updates["lead_id"], current_user["id"])

        updated = await update_event_db(pool, event_id, current_user["id"], **updates)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
        return EventResponse(**updated)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update event")


@router.delete("/events/{event_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_event_endpoint(
    event_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    deleted = await delete_event_db(pool, event_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
    return MessageResponse(message="Event deleted successfully")
