#!/usr/bin/env python3
# app/api/routes/admin.py

from fastapi import APIRouter, Depends
from app.database.db import get_db_pool
from app.core.jobs.admin import authenticate_admin_job, verify_admin_token, get_admin_stats_job
from app.core.jobs.form_submissions import list_form_submissions_job
from app.api.models.admin import AdminAuthRequest, AdminTokenResponse, AdminStatsResponse
from app.api.models.form_submissions import FormSubmissionListResponse

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_pool():
    return await get_db_pool()


@router.post("/auth", response_model=AdminTokenResponse, status_code=200)
async def admin_auth(body: AdminAuthRequest):
    token = authenticate_admin_job(body.password)
    return AdminTokenResponse(access_token=token)


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    status_code=200,
    dependencies=[Depends(verify_admin_token)],
)
async def admin_stats(pool=Depends(get_pool)):
    return await get_admin_stats_job(pool)


@router.get(
    "/submissions",
    response_model=FormSubmissionListResponse,
    status_code=200,
    dependencies=[Depends(verify_admin_token)],
)
async def admin_submissions(
    limit: int = 50,
    offset: int = 0,
    pool=Depends(get_pool),
):
    items = await list_form_submissions_job(pool, limit=limit, offset=offset)
    return FormSubmissionListResponse(items=items, total=len(items))
