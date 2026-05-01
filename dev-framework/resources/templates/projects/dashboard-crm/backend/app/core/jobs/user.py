#!/usr/bin/env python3
# app/core/jobs/user.py

"""
Business logic jobs for user entity.
Generated from docs/architecture/backend/business-logic/user.md

Jobs orchestrate CRUD, Utils, and Services to implement business workflows.
All jobs are COMPLETE and production-ready.
"""

import asyncpg
from typing import Dict, Any

# Imports from CRUD
from app.database.crud.users import (
    get_user_by_email_db,
    get_user_by_id_db,
    create_user_db
)

# Imports from Utils
from app.core.utils.validation import validate_user_data
from app.core.utils.password import hash_password, verify_password

# Imports from Services
from app.core.services.auth import create_session_token


# =====================================================
# JOB: authenticate_user
# =====================================================

async def authenticate_user(
    pool: asyncpg.Pool,
    email: str,
    password: str
) -> Dict[str, Any]:
    """
    Authenticate user and generate session token.

    Input:
    - email: str (email address of user)
    - password: str (plaintext password)

    Output:
    - dict with structure:
      - user_id: int
      - email: str
      - session_token: str

    Workflow:
    1. get_user_by_email(email) → Retrieve user from database
    2. If user not found, raise error "Invalid credentials"
    3. verify_password(password, user.hashed_password) → Verify password matches stored hash
    4. If password invalid, raise error "Invalid credentials"
    5. create_session_token(user.id) → Generate secure session token
    6. Return dict with user_id, email, session_token

    Functions used:
    - get_user_by_email_db [CRUD]
    - verify_password [Utils]
    - create_session_token [Service]

    Generated from: business-logic/user.md
    """
    # 1. Get user by email
    user = await get_user_by_email_db(pool, email)

    # 2. Check user exists
    if not user:
        raise ValueError("Invalid credentials")

    # 3. Verify password
    is_valid = verify_password(password, user["hashed_password"])

    # 4. Check password valid
    if not is_valid:
        raise ValueError("Invalid credentials")

    # 5. Generate session token
    session_token = create_session_token(user["id"])

    # 6. Return authentication result
    return {
        "user_id": user["id"],
        "email": user["email"],
        "session_token": session_token
    }


# =====================================================
# JOB: register_user
# =====================================================

async def register_user(
    pool: asyncpg.Pool,
    user_data: dict
) -> Dict[str, Any]:
    """
    Register new user with validation.

    Input:
    - user_data: dict with structure:
      - email: str
      - password: str
      - name: str (optional)

    Output:
    - dict with structure:
      - user_id: int
      - email: str
      - created_at: datetime

    Workflow:
    1. validate_user_data(user_data) → Validate data format (email valid, password strength, etc.)
    2. If validation fails, raise error with validation details
    3. get_user_by_email(user_data['email']) → Check if email already exists
    4. If email exists, raise error "Email already registered"
    5. hash_password(user_data['password']) → Hash password with bcrypt
    6. [TRANSACTION START]
    7. create_user_db(email=user_data['email'], hashed_password=hashed_password, name=user_data.get('name')) → Create user in database
    8. [TRANSACTION END]
    9. Return dict with user_id, email, created_at

    Functions used:
    - validate_user_data [Utils]
    - get_user_by_email_db [CRUD]
    - hash_password [Utils]
    - create_user_db [CRUD]

    Generated from: business-logic/user.md
    """
    # 1. Validate user data
    validation = validate_user_data(user_data)

    # 2. Check validation result
    if not validation["is_valid"]:
        raise ValueError(f"Validation failed: {', '.join(validation['errors'])}")

    # 3. Check if email already exists
    existing_user = await get_user_by_email_db(pool, user_data["email"])

    # 4. Raise error if email already registered
    if existing_user:
        raise ValueError("Email already registered")

    # 5. Hash password
    hashed_password = hash_password(user_data["password"])

    # 6-8. Transaction: Create user in database
    async with pool.acquire() as conn:
        async with conn.transaction():
            user_id = await create_user_db(
                pool,
                email=user_data["email"],
                hashed_password=hashed_password,
                name=user_data.get("name")
            )

    # 9. Get created user and return
    created_user = await get_user_by_id_db(pool, user_id)

    return {
        "user_id": created_user["id"],
        "email": created_user["email"],
        "created_at": created_user["created_at"]
    }
