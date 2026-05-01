# users.py - User CRUD Operations (Template)
# This file will be REPLACED by generate-crud-operations agent during Phase 2.2

from typing import Optional, Dict, Any, List
import asyncpg


async def create_user(
    pool: asyncpg.Pool,
    email: str,
    password_hash: str,
    full_name: str
) -> Dict[str, Any]:
    """
    Create new user account.

    Args:
        pool: Database connection pool
        email: User email address
        password_hash: Hashed password (bcrypt)
        full_name: User's full name

    Returns:
        Dict containing user data (user_id, email, full_name, created_at)

    SQL:
        INSERT INTO users (email, password_hash, full_name)
        VALUES ($1, $2, $3)
        RETURNING *
    """
    query = """
        INSERT INTO users (email, password_hash, full_name)
        VALUES ($1, $2, $3)
        RETURNING user_id, email, full_name, created_at, updated_at
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, email, password_hash, full_name)

    return dict(row) if row else None


async def get_user_by_id(
    pool: asyncpg.Pool,
    user_id: int
) -> Optional[Dict[str, Any]]:
    """
    Fetch user by ID.

    Args:
        pool: Database connection pool
        user_id: User ID

    Returns:
        Dict containing user data or None if not found

    SQL:
        SELECT * FROM users
        WHERE user_id = $1 AND deleted_at IS NULL
    """
    query = """
        SELECT user_id, email, password_hash, full_name, created_at, updated_at
        FROM users
        WHERE user_id = $1 AND deleted_at IS NULL
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id)

    return dict(row) if row else None


async def get_user_by_email(
    pool: asyncpg.Pool,
    email: str
) -> Optional[Dict[str, Any]]:
    """
    Fetch user by email for login.

    Args:
        pool: Database connection pool
        email: User email

    Returns:
        Dict containing user data or None if not found

    SQL:
        SELECT * FROM users
        WHERE email = $1 AND deleted_at IS NULL
    """
    query = """
        SELECT user_id, email, password_hash, full_name, created_at, updated_at
        FROM users
        WHERE email = $1 AND deleted_at IS NULL
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, email)

    return dict(row) if row else None


async def list_users(
    pool: asyncpg.Pool,
    offset: int = 0,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    List all users with pagination.

    Args:
        pool: Database connection pool
        offset: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of user dicts

    SQL:
        SELECT * FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """
    query = """
        SELECT user_id, email, full_name, created_at, updated_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, limit, offset)

    return [dict(row) for row in rows]


async def update_user_password(
    pool: asyncpg.Pool,
    user_id: int,
    password_hash: str
) -> bool:
    """
    Update user password.

    Args:
        pool: Database connection pool
        user_id: User ID
        password_hash: New hashed password

    Returns:
        True if updated, False if user not found

    SQL:
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE user_id = $2 AND deleted_at IS NULL
    """
    query = """
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE user_id = $2 AND deleted_at IS NULL
    """

    async with pool.acquire() as conn:
        result = await conn.execute(query, password_hash, user_id)

    return int(result.split()[1]) > 0


async def delete_user(
    pool: asyncpg.Pool,
    user_id: int
) -> bool:
    """
    Soft delete user (set deleted_at).

    Args:
        pool: Database connection pool
        user_id: User ID

    Returns:
        True if deleted, False if user not found

    SQL:
        UPDATE users
        SET deleted_at = NOW()
        WHERE user_id = $1 AND deleted_at IS NULL
    """
    query = """
        UPDATE users
        SET deleted_at = NOW()
        WHERE user_id = $1 AND deleted_at IS NULL
    """

    async with pool.acquire() as conn:
        result = await conn.execute(query, user_id)

    return int(result.split()[1]) > 0


# ============================
# PASSWORD RESET TOKENS
# ============================

async def create_password_reset_token(
    pool: asyncpg.Pool,
    user_id: int,
    token: str,
    expires_at: str
) -> Dict[str, Any]:
    """
    Create password reset token.

    Args:
        pool: Database connection pool
        user_id: User ID
        token: Reset token
        expires_at: Expiration datetime

    Returns:
        Dict containing token data

    SQL:
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *
    """
    query = """
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING token_id, user_id, token, expires_at, is_used, created_at
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id, token, expires_at)

    return dict(row) if row else None


async def get_password_reset_token(
    pool: asyncpg.Pool,
    token: str
) -> Optional[Dict[str, Any]]:
    """
    Fetch valid password reset token.

    Args:
        pool: Database connection pool
        token: Reset token

    Returns:
        Dict containing token data or None if not found/used

    SQL:
        SELECT * FROM password_reset_tokens
        WHERE token = $1 AND is_used = 0
    """
    query = """
        SELECT token_id, user_id, token, expires_at, is_used, created_at
        FROM password_reset_tokens
        WHERE token = $1 AND is_used = 0
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, token)

    return dict(row) if row else None


async def mark_password_reset_token_used(
    pool: asyncpg.Pool,
    token: str
) -> bool:
    """
    Mark password reset token as used.

    Args:
        pool: Database connection pool
        token: Reset token

    Returns:
        True if marked, False if token not found

    SQL:
        UPDATE password_reset_tokens
        SET is_used = 1
        WHERE token = $1
    """
    query = """
        UPDATE password_reset_tokens
        SET is_used = 1
        WHERE token = $1
    """

    async with pool.acquire() as conn:
        result = await conn.execute(query, token)

    return int(result.split()[1]) > 0


# ============================
# IMPORTANT NOTE
# ============================
# This template file contains basic CRUD operations for demonstration.
# During Phase 2.2 of /greenfield:6-create-infrastructure, the
# generate-crud-operations agent will:
# 1. Read docs/architecture/schema.md
# 2. REPLACE this file (or create new entity-specific files)
# 3. Generate CRUD functions with pool parameter pattern
#
# Do NOT manually edit this file if you plan to use the agent.
