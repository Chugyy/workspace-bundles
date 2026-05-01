#!/usr/bin/env python3
# app/api/routes/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.utils.auth import create_access_token, require_auth
from app.api.models.common import Token
from config.config import settings
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])


class AccessRequest(BaseModel):
    password: str


@router.post("/login", response_model=Token)
async def login(data: AccessRequest):
    """Single-password access for personal use."""
    if data.password != settings.app_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_access_token(data={"sub": "personal-agent"})
    return Token(access_token=token, token_type="bearer")


@router.get("/me")
async def get_me(sub: str = Depends(require_auth)):
    """Returns authenticated identity."""
    return {"username": sub}
