#!/usr/bin/env python3
# app/core/utils/pagination.py

from math import ceil
from app.api.models.common import PaginationInfo
from app.core.exceptions import ValidationException
from app.core.utils.error_messages import (
    PAGINATION_LIMIT_EXCEEDED,
    PAGINATION_INVALID_PAGE,
    format_error
)

# Configuration par défaut
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def validate_pagination_params(page: int, limit: int, max_limit: int = MAX_LIMIT) -> None:
    """
    Valide les paramètres de pagination.

    Args:
        page: Numéro de la page (doit être >= 1)
        limit: Nombre d'éléments par page (doit être entre 1 et max_limit)
        max_limit: Limite maximale autorisée (défaut: 100)

    Raises:
        ValidationException: Si les paramètres sont invalides

    Example:
        validate_pagination_params(page=1, limit=20)  # OK
        validate_pagination_params(page=0, limit=20)  # Raises ValidationException
        validate_pagination_params(page=1, limit=200)  # Raises ValidationException
    """
    if page < 1:
        raise ValidationException(detail=PAGINATION_INVALID_PAGE)

    if limit > max_limit:
        raise ValidationException(
            detail=format_error(PAGINATION_LIMIT_EXCEEDED, max_limit=max_limit)
        )

    if limit < 1:
        raise ValidationException(detail="La limite doit être au moins 1")


def calculate_offset(page: int, limit: int) -> int:
    """
    Calcule l'offset SQL à partir du numéro de page et de la limite.

    Args:
        page: Numéro de la page (commence à 1)
        limit: Nombre d'éléments par page

    Returns:
        Offset pour la requête SQL

    Example:
        calculate_offset(page=1, limit=20)  # Returns 0
        calculate_offset(page=2, limit=20)  # Returns 20
        calculate_offset(page=3, limit=20)  # Returns 40
    """
    return (page - 1) * limit


def calculate_total_pages(total: int, limit: int) -> int:
    """
    Calcule le nombre total de pages.

    Args:
        total: Nombre total d'éléments
        limit: Nombre d'éléments par page

    Returns:
        Nombre total de pages

    Example:
        calculate_total_pages(total=45, limit=20)  # Returns 3
        calculate_total_pages(total=0, limit=20)   # Returns 0
        calculate_total_pages(total=20, limit=20)  # Returns 1
    """
    if total == 0:
        return 0
    return ceil(total / limit)


def build_pagination_info(page: int, limit: int, total: int) -> PaginationInfo:
    """
    Construit un objet PaginationInfo complet.

    Args:
        page: Numéro de la page actuelle
        limit: Nombre d'éléments par page
        total: Nombre total d'éléments

    Returns:
        Objet PaginationInfo avec tous les champs calculés

    Example:
        info = build_pagination_info(page=2, limit=20, total=45)
        # Returns: PaginationInfo(page=2, limit=20, total=45, totalPages=3)
    """
    total_pages = calculate_total_pages(total=total, limit=limit)

    return PaginationInfo(
        page=page,
        limit=limit,
        total=total,
        totalPages=total_pages
    )


def apply_pagination_to_query(query, page: int, limit: int):
    """
    Applique la pagination à une requête SQLAlchemy.

    Args:
        query: Requête SQLAlchemy
        page: Numéro de la page
        limit: Nombre d'éléments par page

    Returns:
        Requête avec LIMIT et OFFSET appliqués

    Example:
        query = session.query(Submission)
        paginated_query = apply_pagination_to_query(query, page=2, limit=20)
        results = paginated_query.all()
    """
    offset = calculate_offset(page=page, limit=limit)
    return query.offset(offset).limit(limit)
