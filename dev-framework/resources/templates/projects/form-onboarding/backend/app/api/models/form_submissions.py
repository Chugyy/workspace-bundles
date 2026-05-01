#!/usr/bin/env python3
# app/api/models/form_submissions.py

"""
Pydantic schemas for form_submissions endpoints.

All schemas inherit from BaseSchema (snake_case → camelCase auto-conversion).
"""

from datetime import datetime
from typing import Literal
from pydantic import Field
from app.api.models.common import BaseSchema


class FormSubmissionCreateRequest(BaseSchema):
    """Input payload for POST /form-submissions."""
    answers: dict
    score_technique: float = Field(..., ge=0, le=25)
    score_discipline: float = Field(..., ge=0, le=25)
    score_autonomie: float = Field(..., ge=0, le=25)
    score_maturite: float = Field(..., ge=0, le=25)
    score_total: float = Field(..., ge=0, le=100)
    route: Literal["constructeur", "stabilisateur", "performant"]
    respondent_name: str | None = None
    respondent_email: str | None = None


class FormSubmissionResponse(BaseSchema):
    """Output schema for a single form submission."""
    submission_id: int
    respondent_name: str | None
    respondent_email: str | None
    answers: dict
    score_technique: float
    score_discipline: float
    score_autonomie: float
    score_maturite: float
    score_total: float
    route: str
    created_at: datetime


class FormSubmissionListResponse(BaseSchema):
    """Output schema for the paginated list of form submissions."""
    items: list[FormSubmissionResponse]
    total: int
