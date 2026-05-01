#!/usr/bin/env python3
# app/api/routes/models.py

from fastapi import APIRouter, Depends
from app.core.utils.auth import require_auth

router = APIRouter(prefix="/models", tags=["models"])

AVAILABLE_MODELS = [
    {"id": "claude-opus-4-6", "display_name": "Claude Opus 4.6"},
    {"id": "claude-sonnet-4-6", "display_name": "Claude Sonnet 4.6"},
    {"id": "claude-haiku-4-5-20251001", "display_name": "Claude Haiku 4.5"},
]


@router.get("")
async def list_models(_: str = Depends(require_auth)):
    return AVAILABLE_MODELS
