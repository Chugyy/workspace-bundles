#!/usr/bin/env python3
# app/api/routes/lead.py

"""
API routes for leads.
Generated from docs/architecture/backend/api/lead.md

All routes are production-ready and import functions from:
- app/core/jobs/lead (business logic wrappers)
- app/database/crud/lead (database operations)
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional

# Import database pool
from app.database.db import get_db_pool

# Import auth dependencies
from app.api.dependencies.auth import get_current_user

# Import Pydantic schemas
from app.api.models.lead import (
    LeadCreateRequest,
    LeadUpdateRequest,
    LeadResponse,
    LeadListResponse
)
from app.api.models.common import IdResponse, MessageResponse, PaginationInfo

# Import CRUD functions (jobs are thin wrappers around CRUD)
from app.database.crud.lead import (
    create_lead_db,
    get_lead_by_id_db,
    update_lead_db,
    delete_lead_db,
    list_leads_db,
    get_lead_by_email_db
)

router = APIRouter(
    prefix="/api/leads",
    tags=["leads"]
)


# =====================================================
# POST /api/leads - Create new lead
# =====================================================

@router.post("", response_model=IdResponse, status_code=status.HTTP_201_CREATED)
async def create_lead_endpoint(
    data: LeadCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new lead with contact information and metadata.

    Protected endpoint - requires authentication.

    Args:
        data: Lead creation data
        current_user: Authenticated user from JWT token

    Returns:
        IdResponse: ID of created lead

    Raises:
        HTTPException:
            - 400: Validation error (missing required field: name/email, invalid field format)
            - 401: Unauthorized (missing/invalid token)
            - 409: Conflict (lead with same email already exists for this user)
            - 500: Internal server error
    """
    pool = await get_db_pool()

    try:
        # Check if lead with same email already exists for this user (only if email is provided)
        if data.email:
            existing_lead = await get_lead_by_email_db(pool, current_user["id"], data.email)
            if existing_lead:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Lead with email '{data.email}' already exists for this user"
                )

        # Create lead
        lead = await create_lead_db(
            pool=pool,
            user_id=current_user["id"],
            lead_data=data.dict()
        )

        return IdResponse(id=lead["id"])

    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lead"
        )


# =====================================================
# GET /api/leads - List leads with filters
# =====================================================

@router.get("", response_model=LeadListResponse, status_code=status.HTTP_200_OK)
async def list_leads_endpoint(
    # Pagination
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    limit: int = Query(20, ge=1, le=2000, description="Items per page (max 2000)"),
    # Filters
    lead_status: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by status",
        pattern="^(identified|qualified|contacted|follow_up|lost|closed|onboarded|delivered|upsold)$"
    ),
    heat_level: Optional[str] = Query(
        None,
        alias="heatLevel",
        description="Filter by heat level",
        pattern="^(cold|warm|hot|very_hot)$"
    ),
    city: Optional[str] = Query(None, description="Filter by city"),
    # Search
    search: Optional[str] = Query(None, description="Full-text search query (searches in: name, first_name, email, company)"),
    # Sorting
    sort_by: Optional[str] = Query(
        "updated_at",
        alias="sortBy",
        description="Sort field",
        pattern="^(updated_at|created_at|last_activity_at|name|email)$"
    ),
    order: Optional[str] = Query(
        "desc",
        description="Sort direction",
        pattern="^(asc|desc)$"
    ),
    # Auth
    current_user: dict = Depends(get_current_user)
):
    """
    List all leads for authenticated user with pagination, filters, sorting and search.

    Protected endpoint - requires authentication.

    Args:
        page: Page number (starts at 1)
        limit: Items per page (max 2000)
        lead_status: Filter by lead status
        heat_level: Filter by heat level
        search: Full-text search query
        sort_by: Sort field (updated_at, created_at, name, email)
        order: Sort direction (asc, desc)
        current_user: Authenticated user

    Returns:
        LeadListResponse: List of leads with pagination metadata

    Raises:
        HTTPException:
            - 400: Invalid query parameters (invalid enum value, limit out of range)
            - 401: Unauthorized (missing/invalid token)
    """
    pool = await get_db_pool()

    try:
        # If search query is provided, use search function
        if search:
            from app.database.crud.lead import search_leads_db
            result = await search_leads_db(
                pool=pool,
                user_id=current_user["id"],
                query=search,
                page=page,
                page_size=limit
            )
        else:
            # Build filters
            filters = {}
            if lead_status:
                filters["status"] = lead_status
            if heat_level:
                filters["heat_level"] = heat_level
            if city:
                filters["city"] = city

            # Use list function with filters
            result = await list_leads_db(
                pool=pool,
                user_id=current_user["id"],
                filters=filters,
                page=page,
                page_size=limit,
                sort_by=sort_by,
                sort_order=order.upper()
            )

        # Map result to response schema
        pagination = PaginationInfo(
            page=result["page"],
            limit=result["page_size"],
            total=result["total"],
            total_pages=result["total_pages"]
        )

        return LeadListResponse(
            leads=[LeadResponse(**lead) for lead in result["leads"]],
            pagination=pagination
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch leads"
        )


# =====================================================
# GET /api/leads/{id} - Get lead by ID
# =====================================================

@router.get("/{lead_id}", response_model=LeadResponse, status_code=status.HTTP_200_OK)
async def get_lead_endpoint(
    lead_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get lead details by ID with ownership check.

    Protected endpoint - requires authentication and ownership.

    Args:
        lead_id: Lead ID
        current_user: Authenticated user

    Returns:
        LeadResponse: Lead details

    Raises:
        HTTPException:
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (user is not the owner of this lead)
            - 404: Lead not found
    """
    pool = await get_db_pool()

    try:
        # Get lead
        lead = await get_lead_by_id_db(pool=pool, lead_id=lead_id)

        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lead {lead_id} not found"
            )

        # Check ownership
        if lead["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the owner of this lead"
            )

        return LeadResponse(**lead)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch lead"
        )


# =====================================================
# PUT /api/leads/{id} - Update lead
# =====================================================

@router.put("/{lead_id}", response_model=LeadResponse, status_code=status.HTTP_200_OK)
async def update_lead_endpoint(
    lead_id: int,
    data: LeadUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update lead fields with partial update support.

    Protected endpoint - requires authentication and ownership.

    Args:
        lead_id: Lead ID
        data: Lead update data (all fields optional)
        current_user: Authenticated user

    Returns:
        LeadResponse: Updated lead data

    Raises:
        HTTPException:
            - 400: Validation error (invalid field format, invalid enum value)
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (user is not the owner of this lead)
            - 404: Lead not found
            - 500: Internal server error
    """
    pool = await get_db_pool()

    try:
        # Check if lead exists
        lead = await get_lead_by_id_db(pool=pool, lead_id=lead_id)

        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lead {lead_id} not found"
            )

        # Check ownership
        if lead["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the owner of this lead"
            )

        # Update lead (only provided fields)
        updated_lead = await update_lead_db(
            pool=pool,
            lead_id=lead_id,
            updates=data.dict(exclude_unset=True)
        )

        if not updated_lead:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update lead"
            )

        return LeadResponse(**updated_lead)

    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update lead"
        )


# =====================================================
# DELETE /api/leads/{id} - Delete lead
# =====================================================

@router.delete("/{lead_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_lead_endpoint(
    lead_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete lead permanently with cascade deletion of associated notes.

    Protected endpoint - requires authentication and ownership.

    Args:
        lead_id: Lead ID
        current_user: Authenticated user

    Returns:
        MessageResponse: Deletion confirmation

    Raises:
        HTTPException:
            - 401: Unauthorized (missing/invalid token)
            - 403: Forbidden (user is not the owner of this lead)
            - 404: Lead not found
            - 500: Internal server error
    """
    pool = await get_db_pool()

    try:
        # Check if lead exists
        lead = await get_lead_by_id_db(pool=pool, lead_id=lead_id)

        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lead {lead_id} not found"
            )

        # Check ownership
        if lead["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the owner of this lead"
            )

        # Delete lead (cascade deletes notes)
        success = await delete_lead_db(pool=pool, lead_id=lead_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete lead"
            )

        return MessageResponse(message="Lead deleted successfully")

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete lead"
        )
