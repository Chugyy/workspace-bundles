#!/usr/bin/env python3
# app/api/routes/user.py

"""
API routes for user and authentication endpoints.
Generated from docs/architecture/backend/api/user.md

All routes are production-ready and import functions from:
- app/core/jobs/user (business logic)
- app/database/crud/users (database operations)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any

# Import database pool
from app.database.db import get_db_pool

# Import auth dependencies
from app.api.dependencies.auth import get_current_user

# Import Pydantic schemas
from app.api.models.user import (
    RegisterRequest,
    LoginRequest,
    UserResponse
)
from app.api.models.common import Token

# Import Jobs functions
from app.core.jobs.user import (
    register_user,
    authenticate_user
)

# Import CRUD functions
from app.database.crud.users import get_user_by_id_db


# =====================================================
# AUTHENTICATION ROUTER
# =====================================================

auth_router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"]
)


@auth_router.post("/register", status_code=status.HTTP_410_GONE)
async def register_endpoint(data: RegisterRequest):
    # DISABLED — registration is closed
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Registration is disabled")


@auth_router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login_endpoint(data: LoginRequest):
    """
    Authenticate user with email/password credentials.

    Validates credentials against stored hash and generates a session JWT token.

    Public endpoint - accessible without token.

    Args:
        data: User login credentials (email, password)

    Returns:
        Token: JWT access token with user_id

    Raises:
        HTTPException:
            - 400: Invalid request format (missing email/password)
            - 401: Invalid credentials (user not found or password mismatch)
            - 500: Internal server error (database failure, JWT encoding error)
    """
    pool = await get_db_pool()

    try:
        # Call authenticate_user Job function
        result = await authenticate_user(
            pool=pool,
            email=data.email,
            password=data.password
        )

        return Token(
            access_token=result["session_token"],
            token_type="bearer",
            user_id=result["user_id"]
        )

    except ValueError as e:
        # Invalid credentials (user not found or wrong password)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user"
        )


# =====================================================
# USER ROUTER
# =====================================================

user_router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)


@user_router.get("/{id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_user_endpoint(
    id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieve user profile information by user ID.

    Protected endpoint - requires authentication and ownership.
    JWT user_id must match requested user ID.

    Args:
        id: User ID to retrieve
        current_user: Authenticated user from JWT token

    Returns:
        UserResponse: User profile data

    Raises:
        HTTPException:
            - 401: Missing or invalid JWT token
            - 403: JWT user_id does not match requested user ID (not owner)
            - 404: User with given ID does not exist
    """
    # Check ownership: JWT user_id must match requested user ID
    if current_user["id"] != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own profile"
        )

    pool = await get_db_pool()

    try:
        # Call get_user_by_id CRUD function
        user = await get_user_by_id_db(pool=pool, user_id=id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {id} not found"
            )

        return UserResponse(**user)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user profile"
        )


# =====================================================
# EXPORTS
# =====================================================

# Export both routers for inclusion in main app
__all__ = ["auth_router", "user_router"]
