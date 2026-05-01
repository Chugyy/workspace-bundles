#!/usr/bin/env python3
# app/core/utils/password.py

"""
Password hashing and verification utilities.
Generated from docs/architecture/backend/business-logic/user.md

⚠️ IMPORTANT:
Input/Output signatures are FINAL and production-ready.
Current implementations use bcrypt (production-ready).
"""

import bcrypt


def hash_password(password: str) -> str:
    """
    Hash password with bcrypt.

    Input:
    - password: str (plaintext password)

    Output:
    - str (bcrypt hash of password)

    Rules:
    - Uses bcrypt with automatic salt generation
    - Cost factor: 12 rounds (recommended minimum)
    - Hash includes salt and algorithm identifier

    Operation:
    - Generates unique salt automatically
    - Returns hash in bcrypt standard format ($2b$12$...)

    Generated from: business-logic/user.md
    """
    # Generate salt with cost factor 12
    salt = bcrypt.gensalt(rounds=12)

    # Hash password with salt
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

    # Return hash as string
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify password against stored bcrypt hash.

    Input:
    - password: str (plaintext password provided by user)
    - hashed_password: str (bcrypt hash stored in database)

    Output:
    - bool (True if match, False otherwise)

    Rules:
    - Compares plaintext password with bcrypt hash
    - Uses bcrypt.checkpw() for timing-attack resistance
    - Extracts salt from stored hash automatically

    Operation:
    - Extracts salt from hashed_password
    - Hashes provided password with same salt
    - Compares hashes securely
    - Returns True if exact match, False otherwise

    Generated from: business-logic/user.md
    """
    try:
        # bcrypt.checkpw handles salt extraction and comparison
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        # Invalid hash format or comparison error
        return False
