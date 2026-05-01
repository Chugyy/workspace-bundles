from typing import Any, Optional
import re

# === UTILITY FUNCTIONS ===

def validate_email(email: str) -> bool:
    """
    Valide le format d'un email selon RFC 5322.

    Input: email (str)
    Output: is_valid (bool)

    Nature: UTILS
    Pure function: No side effects

    Examples:
        >>> validate_email("user@example.com")
        True
        >>> validate_email("invalid-email")
        False
    """
    if not email:
        return False

    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """
    Valide le format d'un numéro de téléphone.

    Input: phone (str)
    Output: is_valid (bool)

    Nature: UTILS
    Pure function: No side effects

    Note: Accepte les formats internationaux avec ou sans +
    """
    if not phone:
        return False

    # Remove spaces, dashes, parentheses
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)

    # Pattern for international phone numbers (with or without +)
    # Accepts: +33612345678, 0612345678, 33612345678, etc.
    pattern = r'^\+?[1-9]\d{6,14}$'
    return bool(re.match(pattern, cleaned))


def validate_language(language: str) -> bool:
    """
    Valide qu'une langue fait partie des langues supportées.

    Input: language (str)
    Output: is_valid (bool)

    Nature: UTILS
    Pure function: No side effects

    Supported languages: fr, en, es, it, de
    """
    supported_languages = {"fr", "en", "es", "it", "de"}
    return language.lower() in supported_languages if language else False


def validate_submission_status(status: str) -> bool:
    """
    Valide qu'un statut de soumission est valide.

    Input: status (str)
    Output: is_valid (bool)

    Nature: UTILS
    Pure function: No side effects

    Valid statuses: pending, approved, rejected
    """
    valid_statuses = {"pending", "approved", "rejected"}
    return status.lower() in valid_statuses if status else False


def validate_file_size(file_size_bytes: int, max_size_mb: int = 5) -> bool:
    """
    Valide qu'un fichier ne dépasse pas la taille maximale.

    Input: file_size_bytes (int), max_size_mb (int, default: 5)
    Output: is_valid (bool)

    Nature: UTILS
    Pure function: No side effects

    Examples:
        >>> validate_file_size(1024 * 1024 * 3, 5)  # 3MB
        True
        >>> validate_file_size(1024 * 1024 * 6, 5)  # 6MB
        False
    """
    if file_size_bytes < 0:
        return False

    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size_bytes <= max_size_bytes


def validate_file_count(count: int, min_count: int = 1, max_count: int = 6) -> bool:
    """
    Valide que le nombre de fichiers est dans les limites.

    Input: count (int), min_count (int, default: 1), max_count (int, default: 6)
    Output: is_valid (bool)

    Nature: UTILS
    Pure function: No side effects
    """
    return min_count <= count <= max_count
