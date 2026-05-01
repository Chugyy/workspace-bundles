"""
Générateur d'IDs préfixés (format: PREFIX_RANDOM)
Exemple: USR_a1B2c3, FLD_x9Y8z7, FIL_m4N5p6
"""

import string
from typing import Literal, Tuple

# Alphabet Base62: a-z A-Z 0-9 (62 caractères)
BASE62_ALPHABET = string.digits + string.ascii_lowercase + string.ascii_uppercase

# Mapping des préfixes par type d'entité
ID_PREFIXES = {
    "user": "USR",
    "folder": "FLD",
    "file": "FIL",
    "upload": "UPL",
    "token": "TOK",
}

# Reverse mapping pour décodage
PREFIX_TO_TYPE = {v: k for k, v in ID_PREFIXES.items()}


def int_to_base62(num: int, length: int = 6) -> str:
    """
    Convertit un entier en base62 (padding à gauche).

    Args:
        num: Nombre à convertir
        length: Longueur finale de la chaîne (padding avec '0')

    Returns:
        Chaîne base62 (ex: "000001", "0001zF")
    """
    if num == 0:
        return "0" * length

    result = []
    while num > 0:
        result.append(BASE62_ALPHABET[num % 62])
        num //= 62

    # Inverser et padding
    base62_str = "".join(reversed(result))
    return base62_str.zfill(length)


def base62_to_int(encoded: str) -> int:
    """
    Convertit une chaîne base62 en entier.

    Args:
        encoded: Chaîne base62 (ex: "0001zF")

    Returns:
        Entier décodé
    """
    num = 0
    for char in encoded:
        num = num * 62 + BASE62_ALPHABET.index(char)
    return num


def encode_id(
    numeric_id: int,
    entity_type: Literal["user", "folder", "file", "upload", "token"]
) -> str:
    """
    Encode un ID numérique en ID préfixé.

    Args:
        numeric_id: ID numérique (ex: 123)
        entity_type: Type d'entité

    Returns:
        ID préfixé (ex: "USR_00001z")

    Example:
        >>> encode_id(1, "user")
        "USR_000001"
        >>> encode_id(123, "file")
        "FIL_00001z"
    """
    prefix = ID_PREFIXES[entity_type]
    encoded = int_to_base62(numeric_id, length=6)
    return f"{prefix}_{encoded}"


def decode_id(prefixed_id: str) -> Tuple[int, str]:
    """
    Décode un ID préfixé en ID numérique + type.

    Args:
        prefixed_id: ID préfixé (ex: "USR_00001z")

    Returns:
        Tuple (numeric_id, entity_type)

    Raises:
        ValueError: Si le format est invalide

    Example:
        >>> decode_id("USR_00001z")
        (123, "user")
    """
    if "_" not in prefixed_id:
        raise ValueError(f"Invalid ID format: {prefixed_id}")

    prefix, encoded = prefixed_id.split("_", 1)

    if prefix not in PREFIX_TO_TYPE:
        raise ValueError(f"Unknown prefix: {prefix}")

    if len(encoded) != 6:
        raise ValueError(f"Invalid encoded part length: {encoded}")

    entity_type = PREFIX_TO_TYPE[prefix]
    numeric_id = base62_to_int(encoded)

    return numeric_id, entity_type


def validate_id(prefixed_id: str, expected_type: str) -> bool:
    """
    Valide qu'un ID a le bon préfixe et format.

    Args:
        prefixed_id: ID à valider
        expected_type: Type attendu

    Returns:
        True si valide, False sinon

    Example:
        >>> validate_id("USR_00001z", "user")
        True
        >>> validate_id("FLD_00001z", "user")
        False
    """
    try:
        _, entity_type = decode_id(prefixed_id)
        return entity_type == expected_type
    except (ValueError, KeyError):
        return False
