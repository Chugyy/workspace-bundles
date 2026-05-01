#!/usr/bin/env python3
# app/api/dependencies/auth.py

"""
Authentication dependencies for FastAPI routes.

Provides JWT token validation and user extraction for protected endpoints.
"""

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config.config import settings
from app.database.db import get_db_pool
from app.database.crud.users import get_user_by_id_db


# HTTP Bearer security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token.

    Used by: Protected endpoints requiring authentication

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        Dict with user data (id, email, first_name, last_name, created_at, updated_at)

    Raises:
        HTTPException:
            - 401: Missing, invalid, or expired token
            - 401: User not found in database
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        from config.logger import logger
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )

        # Extract user ID from token (stored as "sub" as string)
        user_id_str: str = payload.get("sub")

        if user_id_str is None:
            logger.error("❌ user_id is None in token payload")
            raise credentials_exception

        # Convert to integer
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError) as e:
            logger.error(f"❌ Failed to convert user_id to int: {e}")
            raise credentials_exception

    except JWTError as e:
        logger.error(f"❌ JWT decode error: {e}")
        raise credentials_exception

    # Get user from database
    pool = await get_db_pool()
    user = await get_user_by_id_db(pool, user_id)

    if user is None:
        raise credentials_exception

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """
    Get current user if token is provided (optional authentication).

    Used by: Public endpoints that need to differentiate between authenticated/anonymous users

    Args:
        credentials: Optional HTTP Bearer token

    Returns:
        Dict with user data if authenticated, None if anonymous

    Raises:
        HTTPException:
            - 401: Invalid or expired token (if provided)
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        # If token is invalid, return None instead of raising
        # (change this behavior if you want strict validation)
        return None
