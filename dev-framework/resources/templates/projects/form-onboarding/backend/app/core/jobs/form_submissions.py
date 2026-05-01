# app/core/jobs/form_submissions.py

from app.database.crud.form_submissions import (
    create_form_submission_crud,
    get_form_submission_by_id_crud,
    list_form_submissions_crud,
)
from app.core.jobs.onboarding_email import send_onboarding_result_email_job
from app.core.jobs.notification import send_notification_job
from app.core.exceptions import NotFoundException

_VALID_ROUTES = {"constructeur", "stabilisateur", "performant"}


async def submit_form_job(
    pool,
    *,
    answers: dict,
    score_technique: float,
    score_discipline: float,
    score_autonomie: float,
    score_maturite: float,
    score_total: float,
    route: str,
    respondent_name: str | None = None,
    respondent_email: str | None = None,
) -> dict:
    """
    Workflow: Submit onboarding form and optionally send result email.

    Steps:
    1. Validate route value
    2. Persist submission (CRUD)
    3. Send result email if respondent_email provided (best-effort)

    Returns: submission dict (full row from DB)
    Raises: ValueError if route is invalid
    """
    if route not in _VALID_ROUTES:
        raise ValueError(f"Invalid route '{route}'. Must be one of: {_VALID_ROUTES}")

    submission = await create_form_submission_crud(
        pool,
        answers=answers,
        score_technique=score_technique,
        score_discipline=score_discipline,
        score_autonomie=score_autonomie,
        score_maturite=score_maturite,
        score_total=score_total,
        route=route,
        respondent_name=respondent_name,
        respondent_email=respondent_email,
    )

    if respondent_email:
        await send_onboarding_result_email_job(
            to_email=respondent_email,
            respondent_name=respondent_name or "Membre HTR",
            score_total=score_total,
            score_technique=score_technique,
            score_discipline=score_discipline,
            score_autonomie=score_autonomie,
            score_maturite=score_maturite,
            route=route,
        )

    # Admin notifications
    ADMIN_EMAILS = ["kilian.tiphaigne@gmail.com", "julienlagae.htr@gmail.com"]
    admin_subject = f"🔔[ONBOARDING] — Nouvelle soumission de {respondent_name or 'Anonyme'}"
    admin_html_body = f"""
<html>
<body>
    <h2>🔔 Nouvelle soumission d'onboarding</h2>

    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>👤 Nom:</strong> {respondent_name or 'Non renseigné'}</p>
        <p><strong>📧 Email:</strong> {respondent_email or 'Non renseigné'}</p>
        <p><strong>🎯 Route:</strong> <span style="color: #4CAF50; font-weight: bold;">{route.upper()}</span></p>
    </div>

    <div style="margin: 20px 0;">
        <h3>📊 Scores</h3>
        <p style="font-size: 18px;"><strong>Score total:</strong> <span style="color: #2196F3; font-weight: bold;">{score_total}</span></p>

        <ul style="list-style: none; padding: 0;">
            <li>🔧 <strong>Technique:</strong> {score_technique}</li>
            <li>💪 <strong>Discipline:</strong> {score_discipline}</li>
            <li>🚀 <strong>Autonomie:</strong> {score_autonomie}</li>
            <li>🌱 <strong>Maturité:</strong> {score_maturite}</li>
        </ul>
    </div>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    <p style="color: #666; font-size: 12px;">ID Soumission: {submission.get('id', 'N/A')}</p>
</body>
</html>
"""

    for admin_email in ADMIN_EMAILS:
        await send_notification_job(
            to_email=admin_email,
            subject=admin_subject,
            html_body=admin_html_body,
        )

    return submission


async def get_form_submission_job(pool, submission_id: int) -> dict:
    """
    Workflow: Retrieve a single form submission by ID.

    Raises: NotFoundException (HTTP 404) if submission does not exist
    Returns: submission dict
    """
    submission = await get_form_submission_by_id_crud(pool, submission_id)
    if submission is None:
        raise NotFoundException(resource="Submission", identifier=str(submission_id))
    return submission


async def list_form_submissions_job(
    pool, limit: int = 20, offset: int = 0
) -> list[dict]:
    """
    Workflow: List form submissions with pagination.

    Returns: list of submission dicts (empty list if none)
    """
    return await list_form_submissions_crud(pool, limit, offset)
