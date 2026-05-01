#!/usr/bin/env python3
# app/core/jobs/admin.py

from datetime import datetime, timedelta, timezone
from fastapi import Header, HTTPException
from jose import jwt, JWTError
from config.config import settings
from app.database.crud.admin import get_global_stats_crud, get_question_stats_crud

_ALGORITHM = "HS256"
_TOKEN_EXPIRE_HOURS = 8
_QUESTIONS = [f"q{i}" for i in range(1, 20)]  # q1 → q19


def authenticate_admin_job(password: str) -> str:
    if password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    expire = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_EXPIRE_HOURS)
    token = jwt.encode(
        {"sub": "admin", "exp": expire},
        settings.admin_jwt_secret,
        algorithm=_ALGORITHM,
    )
    return token


async def verify_admin_token(authorization: str = Header(...)) -> None:
    try:
        token = authorization.removeprefix("Bearer ")
        jwt.decode(token, settings.admin_jwt_secret, algorithms=[_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_admin_stats_job(pool) -> dict:
    global_stats = await get_global_stats_crud(pool)
    questions = []
    for key in _QUESTIONS:
        items = await get_question_stats_crud(pool, key)
        questions.append({"question": key, "items": items})
    return {
        "total_submissions": global_stats["total_submissions"],
        "route_distribution": global_stats["route_distribution"],
        "avg_scores": {
            "technique": global_stats["avg_technique"],
            "discipline": global_stats["avg_discipline"],
            "autonomie": global_stats["avg_autonomie"],
            "maturite": global_stats["avg_maturite"],
            "total": global_stats["avg_total"],
        },
        "questions": questions,
    }
