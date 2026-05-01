#!/usr/bin/env python3
# app/api/models/lead.py

"""
Pydantic schemas for lead endpoints.
Generated from docs/architecture/backend/api/lead.md

IMPORTANT:
- ALL schemas inherit from BaseSchema (automatic snake_case -> camelCase)
- Python code: ALWAYS snake_case (first_name, created_at, heat_level)
- JSON output: ALWAYS camelCase (firstName, createdAt, heatLevel)
"""

from pydantic import Field, model_validator
from typing import Optional, List, Any
from datetime import datetime

# ALWAYS check common.py before creating new models
from app.api.models.common import BaseSchema, PaginationInfo


# =====================================================
# REQUEST SCHEMAS
# =====================================================

class LeadCreateRequest(BaseSchema):
    """
    Request schema for creating a new lead.

    Used by: POST /api/leads

    JSON input example (camelCase accepted):
    {
        "name": "Doe",
        "firstName": "John",
        "email": "john@example.com",
        "phone": "+33612345678",
        "company": "Example Corp",
        "address": "123 Main St, Paris",
        "instagram": "https://instagram.com/john",
        "linkedin": "https://linkedin.com/in/john",
        "twitter": "https://twitter.com/john",
        "youtube": "https://youtube.com/@john",
        "website": "https://example.com",
        "status": "identified",
        "heatLevel": "cold"
    }
    """
    name: str = Field(..., min_length=1, max_length=255, description="Last name (required)")
    first_name: Optional[str] = Field(None, max_length=255, description="First name (optional)")
    email: Optional[str] = Field(None, max_length=255, description="Email address (optional, format NOT enforced per PRD FR10)")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number (optional)")
    company: Optional[str] = Field(None, max_length=255, description="Company name (optional)")
    address: Optional[str] = Field(None, max_length=500, description="Full address (optional)")
    instagram: Optional[str] = Field(None, max_length=255, description="Instagram link (optional)")
    linkedin: Optional[str] = Field(None, max_length=255, description="LinkedIn link (optional)")
    twitter: Optional[str] = Field(None, max_length=255, description="Twitter link (optional)")
    youtube: Optional[str] = Field(None, max_length=255, description="YouTube link (optional)")
    website: Optional[str] = Field(None, max_length=255, description="Website URL (optional)")
    status: Optional[str] = Field("identified", description="Lead status (default: identified)")
    heat_level: Optional[str] = Field("cold", description="Lead heat level (default: cold)")
    city: Optional[str] = Field(None, max_length=255, description="City (optional)")
    ca: Optional[int] = Field(None, description="Annual revenue in euros (optional)")
    effectifs: Optional[str] = Field(None, max_length=50, description="Headcount range e.g. '3-5' (optional)")

    @model_validator(mode='before')
    @classmethod
    def empty_strings_to_none(cls, data: Any) -> Any:
        """Transform empty strings to None for all string fields"""
        if isinstance(data, dict):
            return {k: (None if v == "" else v) for k, v in data.items()}
        return data

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Doe",
                "firstName": "John",
                "email": "john@example.com",
                "phone": "+33612345678",
                "company": "Example Corp",
                "address": "123 Main St, Paris",
                "instagram": "https://instagram.com/john",
                "linkedin": "https://linkedin.com/in/john",
                "twitter": "https://twitter.com/john",
                "youtube": "https://youtube.com/@john",
                "website": "https://example.com",
                "status": "identified",
                "heatLevel": "cold",
            }
        }


class LeadUpdateRequest(BaseSchema):
    """
    Request schema for updating a lead.

    Used by: PUT /api/leads/{id}

    All fields are optional (partial update).

    JSON input example (camelCase accepted):
    {
        "status": "contacted",
        "heatLevel": "warm"
    }
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Last name")
    first_name: Optional[str] = Field(None, max_length=255, description="First name")
    email: Optional[str] = Field(None, max_length=255, description="Email address")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    company: Optional[str] = Field(None, max_length=255, description="Company name")
    address: Optional[str] = Field(None, max_length=500, description="Full address")
    instagram: Optional[str] = Field(None, max_length=255, description="Instagram link")
    linkedin: Optional[str] = Field(None, max_length=255, description="LinkedIn link")
    twitter: Optional[str] = Field(None, max_length=255, description="Twitter link")
    youtube: Optional[str] = Field(None, max_length=255, description="YouTube link")
    website: Optional[str] = Field(None, max_length=255, description="Website URL")
    status: Optional[str] = Field(None, description="Lead status (identified|qualified|contacted|follow_up|lost|closed|onboarded|delivered|upsold)")
    heat_level: Optional[str] = Field(None, description="Lead heat level (cold|warm|hot|very_hot)")
    city: Optional[str] = Field(None, max_length=255, description="City")
    ca: Optional[int] = Field(None, description="Annual revenue in euros")
    effectifs: Optional[str] = Field(None, max_length=50, description="Headcount range e.g. '3-5'")

    @model_validator(mode='before')
    @classmethod
    def empty_strings_to_none(cls, data: Any) -> Any:
        """Transform empty strings to None for all string fields"""
        if isinstance(data, dict):
            return {k: (None if v == "" else v) for k, v in data.items()}
        return data

    class Config:
        json_schema_extra = {
            "example": {
                "status": "contacted",
                "heatLevel": "warm",
            }
        }


# =====================================================
# RESPONSE SCHEMAS
# =====================================================

class LeadResponse(BaseSchema):
    """
    Response schema for lead data.

    Used by: GET /api/leads/{id}, POST /api/leads (via IdResponse), PUT /api/leads/{id}

    JSON output (camelCase generated automatically):
    {
        "id": 123,
        "userId": 456,
        "name": "Doe",
        "firstName": "John",
        "email": "john@example.com",
        "phone": "+33612345678",
        "company": "Example Corp",
        "address": "123 Main St, Paris",
        "instagram": "https://instagram.com/john",
        "linkedin": "https://linkedin.com/in/john",
        "twitter": "https://twitter.com/john",
        "youtube": "https://youtube.com/@john",
        "website": "https://example.com",
        "status": "identified",
        "heatLevel": "cold",
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
    }
    """
    id: int = Field(..., description="Lead ID")
    user_id: int = Field(..., description="Owner user ID")
    name: str = Field(..., description="Last name")
    first_name: Optional[str] = Field(None, description="First name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    company: Optional[str] = Field(None, description="Company name")
    address: Optional[str] = Field(None, description="Full address")
    instagram: Optional[str] = Field(None, description="Instagram link")
    linkedin: Optional[str] = Field(None, description="LinkedIn link")
    twitter: Optional[str] = Field(None, description="Twitter link")
    youtube: Optional[str] = Field(None, description="YouTube link")
    website: Optional[str] = Field(None, description="Website URL")
    status: str = Field(..., description="Lead status (identified|qualified|contacted|follow_up|lost|closed|onboarded|delivered|upsold)")
    heat_level: str = Field(..., description="Lead heat level (cold|warm|hot|very_hot)")
    city: Optional[str] = Field(None, description="City")
    ca: Optional[int] = Field(None, description="Annual revenue in euros")
    effectifs: Optional[str] = Field(None, description="Headcount range e.g. '3-5'")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_activity_at: datetime = Field(..., description="Last activity timestamp (includes notes, tasks, events)")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 123,
                "userId": 456,
                "name": "Doe",
                "firstName": "John",
                "email": "john@example.com",
                "phone": "+33612345678",
                "company": "Example Corp",
                "address": "123 Main St, Paris",
                "instagram": "https://instagram.com/john",
                "linkedin": "https://linkedin.com/in/john",
                "twitter": "https://twitter.com/john",
                "youtube": "https://youtube.com/@john",
                "website": "https://example.com",
                "status": "identified",
                "heatLevel": "cold",
                "createdAt": "2025-01-15T10:30:00Z",
                "updatedAt": "2025-01-15T10:30:00Z"
            }
        }


class LeadListResponse(BaseSchema):
    """
    Paginated lead list response.

    Used by: GET /api/leads

    JSON output (camelCase generated automatically):
    {
        "leads": [LeadResponse, ...],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 150,
            "totalPages": 8
        }
    }
    """
    leads: List[LeadResponse] = Field(..., description="List of leads")
    pagination: PaginationInfo = Field(..., description="Pagination metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "leads": [
                    {
                        "id": 123,
                        "userId": 456,
                        "name": "Doe",
                        "firstName": "John",
                        "email": "john@example.com",
                        "status": "to_contact",
                        "heatLevel": "cold"
                    }
                ],
                "pagination": {
                    "page": 1,
                    "limit": 20,
                    "total": 150,
                    "totalPages": 8
                }
            }
        }
