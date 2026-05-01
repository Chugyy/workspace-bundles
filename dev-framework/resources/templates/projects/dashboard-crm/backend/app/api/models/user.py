#!/usr/bin/env python3
# app/api/models/user.py

"""
Pydantic schemas for user endpoints.
Generated from docs/architecture/backend/api/user.md

⚠️ IMPORTANT:
- ALL schemas inherit from BaseSchema (automatic snake_case → camelCase)
- Python code: ALWAYS snake_case (first_name, created_at)
- JSON output: ALWAYS camelCase (firstName, createdAt)
"""

from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime

# ALWAYS check common.py before creating new models
from app.api.models.common import BaseSchema, Token


# =====================================================
# REQUEST SCHEMAS (Input)
# =====================================================

class RegisterRequest(BaseSchema):
    """
    Request schema for user registration.

    Used by: POST /api/auth/register

    JSON input example:
        {
            "email": "user@example.com",
            "password": "SecurePass123",
            "name": "John Doe"
        }
    """
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        description="Password (minimum 8 characters, must contain at least 1 letter and 1 digit)"
    )
    name: Optional[str] = Field(
        None,
        max_length=100,
        description="User full name (optional)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123",
                "name": "John Doe"
            }
        }


class LoginRequest(BaseSchema):
    """
    Request schema for user login.

    Used by: POST /api/auth/login

    JSON input example:
        {
            "email": "user@example.com",
            "password": "SecurePass123"
        }
    """
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password (plaintext)")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123"
            }
        }


# =====================================================
# RESPONSE SCHEMAS (Output)
# =====================================================

class UserResponse(BaseSchema):
    """
    Response schema for user profile data.

    Used by: GET /api/users/{id}

    JSON output:
        {
            "id": 123,
            "email": "user@example.com",
            "name": "John Doe",
            "createdAt": "2025-01-15T10:30:00Z",
            "updatedAt": "2025-01-20T14:45:00Z"
        }
    """
    id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email address")
    name: Optional[str] = Field(None, description="User full name")
    created_at: datetime = Field(..., description="Account creation timestamp (ISO 8601 UTC)")
    updated_at: datetime = Field(..., description="Last update timestamp (ISO 8601 UTC)")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 123,
                "email": "john.doe@example.com",
                "name": "John Doe",
                "createdAt": "2025-01-15T10:30:00Z",
                "updatedAt": "2025-01-20T14:45:00Z"
            }
        }


# =====================================================
# NOTES
# =====================================================

# Token model is already defined in common.py:
# - Used by: POST /api/auth/register, POST /api/auth/login
# - Fields: access_token, token_type, user_id
# - Import: from app.api.models.common import Token
