#!/usr/bin/env python3
# app/api/routes/task.py

"""
API routes for tasks.
Route → CRUD directly (no jobs - pure CRUD operations).
Ownership: user_id baked into all CRUD queries.
Lead ownership verified inline when lead_id is provided.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Dict, Any, Optional

from app.database.db import get_db_pool
from app.api.dependencies.auth import get_current_user
from app.api.models.task import (
    TaskCreateRequest,
    TaskUpdateRequest,
    TaskResponse,
    TaskListResponse,
)
from app.api.models.common import IdResponse, MessageResponse
from app.database.crud.task import (
    create_task_db,
    get_task_by_id_db,
    list_tasks_db,
    count_overdue_tasks_db,
    update_task_db,
    delete_task_db,
)
from app.database.crud.lead import get_lead_by_id_db

router = APIRouter(prefix="/api", tags=["tasks"])


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

@router.post("/tasks", response_model=IdResponse, status_code=status.HTTP_201_CREATED)
async def create_task_endpoint(
    data: TaskCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    try:
        if data.lead_id:
            await verify_lead_ownership(pool, data.lead_id, current_user["id"])

        task_id = await create_task_db(
            pool,
            user_id=current_user["id"],
            title=data.title,
            category=data.category,
            status=data.status,
            priority=data.priority,
            description=data.description,
            lead_id=data.lead_id,
            due_date=data.due_date,
        )
        return IdResponse(id=task_id)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create task")


@router.get("/tasks/overdue-count", status_code=status.HTTP_200_OK)
async def get_overdue_count_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Count overdue tasks for Dashboard KPI."""
    pool = await get_db_pool()
    count = await count_overdue_tasks_db(pool, current_user["id"])
    return {"count": count}


@router.get("/tasks", response_model=TaskListResponse, status_code=status.HTTP_200_OK)
async def list_tasks_endpoint(
    lead_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    try:
        offset = (page - 1) * limit
        tasks, total = await list_tasks_db(
            pool,
            user_id=current_user["id"],
            lead_id=lead_id,
            category=category,
            status=status_filter,
            priority=priority,
            limit=limit,
            offset=offset,
        )
        return TaskListResponse(tasks=[TaskResponse(**t) for t in tasks], total=total)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch tasks")


@router.get("/tasks/{task_id}", response_model=TaskResponse, status_code=status.HTTP_200_OK)
async def get_task_endpoint(
    task_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    task = await get_task_by_id_db(pool, task_id, current_user["id"])
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    return TaskResponse(**task)


@router.put("/tasks/{task_id}", response_model=TaskResponse, status_code=status.HTTP_200_OK)
async def update_task_endpoint(
    task_id: int,
    data: TaskUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    try:
        updates = data.model_dump(exclude_unset=True)

        if "lead_id" in updates and updates["lead_id"] is not None:
            await verify_lead_ownership(pool, updates["lead_id"], current_user["id"])

        updated = await update_task_db(pool, task_id, current_user["id"], **updates)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
        return TaskResponse(**updated)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update task")


@router.delete("/tasks/{task_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_task_endpoint(
    task_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    pool = await get_db_pool()
    deleted = await delete_task_db(pool, task_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    return MessageResponse(message="Task deleted successfully")
