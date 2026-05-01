#!/usr/bin/env python3
# app/api/routes/form_submissions.py

"""
Routes for form_submissions — zero business logic, pure delegation to Jobs.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.database.db import get_db_pool
from app.core.jobs.form_submissions import (
    submit_form_job,
    get_form_submission_job,
    list_form_submissions_job,
)
from app.api.models.form_submissions import (
    FormSubmissionCreateRequest,
    FormSubmissionResponse,
    FormSubmissionListResponse,
)

router = APIRouter(prefix="/form-submissions", tags=["form-submissions"])


async def get_pool():
    return await get_db_pool()


@router.post("", response_model=FormSubmissionResponse, status_code=201)
async def create_form_submission(
    body: FormSubmissionCreateRequest,
    pool=Depends(get_pool),
):
    try:
        result = await submit_form_job(
            pool,
            answers=body.answers,
            score_technique=body.score_technique,
            score_discipline=body.score_discipline,
            score_autonomie=body.score_autonomie,
            score_maturite=body.score_maturite,
            score_total=body.score_total,
            route=body.route,
            respondent_name=body.respondent_name,
            respondent_email=body.respondent_email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.get("", response_model=FormSubmissionListResponse, status_code=200)
async def list_form_submissions(
    limit: int = 20,
    offset: int = 0,
    pool=Depends(get_pool),
):
    items = await list_form_submissions_job(pool, limit=limit, offset=offset)
    return FormSubmissionListResponse(items=items, total=len(items))


@router.get("/{submission_id}", response_model=FormSubmissionResponse, status_code=200)
async def get_form_submission(
    submission_id: int,
    pool=Depends(get_pool),
):
    return await get_form_submission_job(pool, submission_id)
