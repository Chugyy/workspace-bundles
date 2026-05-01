"""Job spécifique : envoi email de résultat onboarding."""

import pathlib
import logging
from app.core.jobs.notification import send_notification_job

logger = logging.getLogger(__name__)

# Chemin vers templates email
TEMPLATE_DIR = pathlib.Path(__file__).parents[3] / "config" / "templates" / "email"

_TEMPLATE_MAP = {
    "constructeur": "constructeur.html",
    "stabilisateur": "stabilisateur.html",
    "performant": "performant.html",
}


def _load_template(route: str) -> str:
    """Charge le template HTML pour une route donnée."""
    filename = _TEMPLATE_MAP.get(route)
    if not filename:
        raise ValueError(f"No template for route '{route}'")

    template_path = TEMPLATE_DIR / filename
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")

    return template_path.read_text(encoding="utf-8")


def _render_template(
    template_html: str,
    respondent_name: str,
    score_total: float,
    score_technique: float,
    score_discipline: float,
    score_autonomie: float,
    score_maturite: float,
    route: str,
) -> str:
    """Remplace les variables dynamiques dans le template."""
    return template_html.format(
        respondent_name=respondent_name,
        score_total=score_total,
        score_technique=score_technique,
        score_discipline=score_discipline,
        score_autonomie=score_autonomie,
        score_maturite=score_maturite,
        route=route.capitalize(),
    )


async def send_onboarding_result_email_job(
    to_email: str,
    respondent_name: str,
    score_total: float,
    score_technique: float,
    score_discipline: float,
    score_autonomie: float,
    score_maturite: float,
    route: str,
) -> bool:
    """
    Job métier : envoie l'email de résultat onboarding personnalisé.

    Steps:
    1. Charge template HTML selon route
    2. Remplace variables dynamiques
    3. Envoie via job notification

    Returns:
        True si envoi réussi, False sinon
    """
    try:
        template_html = _load_template(route)
        html_body = _render_template(
            template_html=template_html,
            respondent_name=respondent_name,
            score_total=score_total,
            score_technique=score_technique,
            score_discipline=score_discipline,
            score_autonomie=score_autonomie,
            score_maturite=score_maturite,
            route=route,
        )

        return await send_notification_job(
            to_email=to_email,
            subject="Tes résultats HTR — Ta roadmap personnalisée",
            html_body=html_body,
        )

    except (ValueError, FileNotFoundError) as e:
        logger.error(f"Failed to send onboarding email: {e}")
        return False
