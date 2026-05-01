"""Job générique pour envoyer des emails de notification."""

from app.core.services.email import send_email


async def send_notification_job(
    to_email: str,
    subject: str,
    html_body: str,
    from_email: str | None = None,
) -> bool:
    """
    Job générique : envoie un email de notification.

    Wrapper autour du service email pour usage dans workflows métier.

    Returns:
        True si envoi réussi, False sinon
    """
    return await send_email(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        from_email=from_email,
    )
