#!/usr/bin/env python3
# app/api/models/admin.py

from pydantic import Field
from app.api.models.common import BaseSchema


class AdminAuthRequest(BaseSchema):
    password: str


class AdminTokenResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"


class QuestionStatItem(BaseSchema):
    answer: str
    count: int
    percentage: float


class QuestionStats(BaseSchema):
    question: str
    items: list[QuestionStatItem]


class AvgScores(BaseSchema):
    technique: float
    discipline: float
    autonomie: float
    maturite: float
    total: float


class AdminStatsResponse(BaseSchema):
    total_submissions: int
    route_distribution: list[QuestionStatItem]
    avg_scores: AvgScores
    questions: list[QuestionStats]
