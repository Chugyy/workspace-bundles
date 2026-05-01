#!/usr/bin/env python3
# app/api/models/__init__.py

"""
Pydantic schemas for API validation.

Structure:
- common.py: Shared models (Token, PaginationInfo, ErrorResponse, MessageResponse, IdResponse)
- {entity}.py: Entity-specific models (e.g., users.py, submissions.py)

This file provides centralized exports for backward compatibility and convenience.

Usage:
    # Import from specific module (recommended for clarity)
    from app.api.models.users import UserCreateRequest, UserResponse

    # Import from root models package (backward compatibility)
    from app.api.models import UserCreateRequest, UserResponse

    # Import common models
    from app.api.models import Token, PaginationInfo
"""

# =====================================================
# COMMON MODELS (always available)
# =====================================================

from app.api.models.common import (
    BaseSchema,         # Base class with snake_case → camelCase conversion
    Token,
    PaginationInfo,
    ErrorResponse,
    MessageResponse,
    IdResponse,
)

# =====================================================
# ENTITY-SPECIFIC MODELS
# =====================================================

# Users models
from app.api.models.users import (
    UserCreateRequest,
    UserUpdateRequest,
    UserLoginRequest,
    UserResponse,
    UserListResponse,
)

# Sessions models
from app.api.models.sessions import (
    SessionStartRequest,
    SessionSendRequest,
    SessionResponse,
    MessageResponse as SessionMessageResponse,
    SessionHistoryResponse,
    SessionListResponse,
)

# =====================================================
# EXPORTS
# =====================================================

__all__ = [
    # Common models
    "BaseSchema",       # Base class (ALL schemas must inherit from this)
    "Token",
    "PaginationInfo",
    "ErrorResponse",
    "MessageResponse",
    "IdResponse",
    # Users models
    "UserCreateRequest",
    "UserUpdateRequest",
    "UserLoginRequest",
    "UserResponse",
    "UserListResponse",
    # Sessions models
    "SessionStartRequest",
    "SessionSendRequest",
    "SessionResponse",
    "SessionMessageResponse",
    "SessionHistoryResponse",
    "SessionListResponse",
]
