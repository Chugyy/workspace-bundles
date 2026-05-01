"""
Utilitaire de vérification de clé API pour les endpoints admin.
"""

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from config.config import settings

# Header HTTP attendu: X-API-Key
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> bool:
    """
    Vérifie la validité de la clé API.

    Args:
        api_key: Clé API extraite du header X-API-Key

    Returns:
        True si la clé est valide

    Raises:
        HTTPException 403: Si la clé est absente ou invalide

    Example:
        @router.get("/admin/users")
        async def list_users(_: bool = Depends(verify_api_key)):
            ...
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key required. Please provide X-API-Key header."
        )

    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key"
        )

    return True
