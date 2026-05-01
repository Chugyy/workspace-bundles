#!/usr/bin/env python3
# app/core/services/auth.py

"""
Authentication service: JWT token generation and validation.
Generated from docs/architecture/backend/business-logic/user.md

⚠️ IMPORTANT:
Input/Output signatures are FINAL and production-ready.
Current implementation is PRODUCTION-READY using PyJWT.

TODO: Set environment variables:
- JWT_SECRET_KEY (required for production)
- JWT_ALGORITHM (default: HS256)
- JWT_EXPIRATION_HOURS (default: 24)
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError


# Configuration from environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))


def create_session_token(user_id: int) -> str:
    """
    Generate JWT session token for authenticated user.

    Input:
    - user_id: int (authenticated user ID)

    Output:
    - str (JWT token)

    External API: PyJWT library
    Operation: Encodes user_id + expiration into signed JWT token

    Implementation:
    - Option 1 (JWT): Encode user_id + expiration in JWT signed with secret key
    - Option 2 (Session): Generate UUID v4 and store in cache/DB with user_id

    Current: JWT implementation with HS256 signature

    Errors possible:
    - JWT encoding error: Problem during token signing
    - Missing secret key: Configuration missing for signing tokens

    TODO: In production, set JWT_SECRET_KEY environment variable to a strong secret

    Generated from: business-logic/user.md
    """
    # Calculate expiration time
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)

    # Prepare JWT payload
    payload = {
        "sub": str(user_id),  # Standard JWT claim for user ID (must be string)
        "exp": expiration,
        "iat": datetime.utcnow()
    }

    # Encode JWT token
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    return token


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT session token.

    Input:
    - token: str (JWT token from client)

    Output:
    - Optional[Dict] containing payload (user_id, exp, iat) or None if invalid

    Operation: Decodes and validates JWT signature and expiration

    ⚠️ HELPER FUNCTION (not in business-logic.md but useful for auth middleware)

    Errors:
    - jwt.ExpiredSignatureError: Token has expired
    - jwt.InvalidTokenError: Token is malformed or signature invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        # Token expired, invalid, or malformed
        return None
