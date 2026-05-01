"""Service SMTP pour envoi d'emails (async, low-level)."""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config.config import settings

logger = logging.getLogger(__name__)


def _send_email_sync(
    to_email: str,
    subject: str,
    html_body: str,
    from_email: str | None = None,
) -> bool:
    """Envoie email via SMTP (synchrone, wrapped dans asyncio.to_thread)."""
    from_addr = settings.smtp_from

    if not settings.smtp_host:
        logger.warning("SMTP not configured — email skipped")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(from_addr, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}")
        return True

    except Exception:
        logger.exception(f"SMTP send failed to {to_email}")
        return False


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    from_email: str | None = None,
) -> bool:
    """
    Envoie un email HTML via SMTP (async wrapper).

    Returns:
        True si envoi réussi, False sinon (jamais d'exception)
    """
    return await asyncio.to_thread(
        _send_email_sync,
        to_email,
        subject,
        html_body,
        from_email,
    )
