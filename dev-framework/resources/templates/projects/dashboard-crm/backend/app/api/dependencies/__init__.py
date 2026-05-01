#!/usr/bin/env python3
# app/api/dependencies/__init__.py

"""
FastAPI dependencies for routes.

Available dependencies:
- auth.get_current_user: Extract authenticated user from JWT token (Protected endpoints)
- auth.get_current_user_optional: Extract user if token provided, None otherwise (Public endpoints)
"""

from app.api.dependencies.auth import get_current_user, get_current_user_optional

__all__ = [
    "get_current_user",
    "get_current_user_optional",
]
