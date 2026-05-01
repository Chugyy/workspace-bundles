#!/usr/bin/env python3
# app/core/exceptions.py

from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class BaseAPIException(HTTPException):
    """
    Exception de base pour toutes les exceptions API personnalisées.

    Attributes:
        status_code: Code HTTP de l'erreur
        detail: Message d'erreur détaillé
        headers: Headers HTTP optionnels
    """
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(BaseAPIException):
    """
    Exception levée quand une ressource n'est pas trouvée (404).

    Example:
        raise NotFoundException(resource="Submission", identifier="sub_123")
    """
    def __init__(
        self,
        resource: str,
        identifier: Optional[str] = None,
        detail: Optional[str] = None
    ):
        if detail is None:
            if identifier:
                detail = f"{resource} avec l'ID {identifier} non trouvé(e)"
            else:
                detail = f"{resource} non trouvé(e)"

        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class ValidationException(BaseAPIException):
    """
    Exception levée quand une validation échoue (400).

    Example:
        raise ValidationException(detail="Le format de l'email est invalide")
    """
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class UnauthorizedException(BaseAPIException):
    """
    Exception levée quand l'authentification échoue (401).

    Example:
        raise UnauthorizedException(detail="Token invalide ou expiré")
    """
    def __init__(self, detail: str = "Non autorisé"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenException(BaseAPIException):
    """
    Exception levée quand l'accès à une ressource est interdit (403).

    Example:
        raise ForbiddenException(detail="Accès refusé à cette ressource")
    """
    def __init__(self, detail: str = "Accès interdit"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class ConflictException(BaseAPIException):
    """
    Exception levée quand il y a un conflit avec l'état actuel (409).

    Example:
        raise ConflictException(detail="Un utilisateur avec cet email existe déjà")
    """
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class InternalServerException(BaseAPIException):
    """
    Exception levée pour les erreurs internes du serveur (500).

    Example:
        raise InternalServerException(operation="création de la soumission")
    """
    def __init__(
        self,
        operation: Optional[str] = None,
        detail: Optional[str] = None
    ):
        if detail is None:
            if operation:
                detail = f"Erreur lors de {operation}"
            else:
                detail = "Erreur interne du serveur"

        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )
