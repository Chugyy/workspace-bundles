#!/usr/bin/env python3
# app/api/models/users.py

"""
Pydantic schemas for users endpoints.

This file contains all request/response models for the /users endpoints.
Auto-generated/modified by create-entity-flow-agent.

⚠️ IMPORTANT:
- ALL schemas inherit from BaseSchema (automatic snake_case → camelCase conversion)
- Python code: ALWAYS snake_case (first_name, created_at)
- JSON output: ALWAYS camelCase (firstName, createdAt)
"""

from pydantic import EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Import common models (always check common.py before creating new models)
from app.api.models.common import BaseSchema, PaginationInfo


# =====================================================
# REQUEST SCHEMAS (Input)
# =====================================================

class UserCreateRequest(BaseSchema):
    """
    Request schema for creating a new user.

    Used by: POST /api/users/

    JSON input (camelCase accepted thanks to populate_by_name=True):
        {"email": "...", "password": "...", "firstName": "...", "lastName": "..."}
    """
    email: EmailStr = Field(..., description="User email address (must be unique)")
    password: str = Field(..., min_length=8, max_length=100, description="User password (min 8 characters)")
    first_name: Optional[str] = Field(None, max_length=100, description="User first name")
    last_name: Optional[str] = Field(None, max_length=100, description="User last name")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "securepassword123",
                "first_name": "John",
                "last_name": "Doe"
            }
        }


class UserUpdateRequest(BaseSchema):
    """
    Request schema for updating a user.

    Used by: PUT /api/users/{id}
    All fields are optional (partial update).

    JSON input: {"firstName": "Jane", "lastName": "Smith"}
    """
    email: Optional[EmailStr] = Field(None, description="New email address")
    first_name: Optional[str] = Field(None, max_length=100, description="New first name")
    last_name: Optional[str] = Field(None, max_length=100, description="New last name")

    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "Jane",
                "last_name": "Smith"
            }
        }


class UserLoginRequest(BaseSchema):
    """
    Request schema for user login.

    Used by: POST /auth/login

    JSON input: {"email": "...", "password": "..."}
    """
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "securepassword123"
            }
        }


# =====================================================
# RESPONSE SCHEMAS (Output)
# =====================================================

class UserResponse(BaseSchema):
    """
    Response schema for user data.

    Used by: GET /api/users/{id}, POST /api/users/, PUT /api/users/{id}

    Note: Password hash is never included in response.

    JSON output:
        {
            "id": 123,
            "email": "john.doe@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "createdAt": "2025-01-15T10:30:00Z",
            "updatedAt": "2025-01-20T14:45:00Z"
        }
    """
    id: int = Field(..., description="User unique identifier")
    email: str = Field(..., description="User email address")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 123,
                "email": "john.doe@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-20T14:45:00Z"
            }
        }


class UserListResponse(BaseSchema):
    """
    Response schema for paginated user list.

    Used by: GET /api/users/

    Combines user data with pagination metadata (using common.PaginationInfo).

    JSON output:
        {
            "users": [{"id": 123, "firstName": "John", ...}],
            "pagination": {"page": 1, "limit": 20, "total": 45, "totalPages": 3}
        }
    """
    users: List[UserResponse] = Field(..., description="List of users")
    pagination: PaginationInfo = Field(..., description="Pagination metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "users": [
                    {
                        "id": 123,
                        "email": "john.doe@example.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "created_at": "2025-01-15T10:30:00Z",
                        "updated_at": None
                    }
                ],
                "pagination": {
                    "page": 1,
                    "limit": 20,
                    "total": 45,
                    "totalPages": 3
                }
            }
        }
