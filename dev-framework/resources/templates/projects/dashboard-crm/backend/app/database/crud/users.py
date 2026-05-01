"""
CRUD operations for users
Generated from schema.md
Pure database access functions with no business logic.
"""

from typing import Optional, List, Dict, Any
import asyncpg


# =====================================================
# CREATE
# =====================================================

async def create_user_db(
    pool: asyncpg.Pool,
    email: str,
    hashed_password: str,
    name: Optional[str] = None
) -> int:
    """
    Create a new user.

    Args:
        pool: Database connection pool
        email: User email (unique)
        hashed_password: Bcrypt hashed password
        name: User name (optional)

    Returns:
        User ID (int)

    SQL:
        INSERT INTO users (email, hashed_password, name)
        VALUES ($1, $2, $3)
        RETURNING id
    """
    query = """
        INSERT INTO users (email, hashed_password, name)
        VALUES ($1, $2, $3)
        RETURNING id
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, email, hashed_password, name)

    return row["id"] if row else None


# =====================================================
# READ
# =====================================================

async def get_user_by_id_db(
    pool: asyncpg.Pool,
    user_id: int
) -> Optional[Dict[str, Any]]:
    """
    Get user by ID.

    Args:
        pool: Database connection pool
        user_id: Primary key

    Returns:
        Dict containing user data or None if not found

    SQL:
        SELECT * FROM users
        WHERE id = $1
    """
    query = """
        SELECT id, email, hashed_password, name, created_at, updated_at
        FROM users
        WHERE id = $1
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id)

    return dict(row) if row else None


async def get_user_by_email_db(
    pool: asyncpg.Pool,
    email: str
) -> Optional[Dict[str, Any]]:
    """
    Get user by email (for authentication).

    Args:
        pool: Database connection pool
        email: User email

    Returns:
        Dict containing user data or None if not found

    SQL:
        SELECT * FROM users
        WHERE email = $1
    """
    query = """
        SELECT id, email, hashed_password, name, created_at, updated_at
        FROM users
        WHERE email = $1
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, email)

    return dict(row) if row else None


async def list_users_db(
    pool: asyncpg.Pool,
    offset: int = 0,
    limit: int = 50
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
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """
    query = """
        SELECT id, email, name, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, limit, offset)

    return [dict(row) for row in rows]


async def count_users_db(
    pool: asyncpg.Pool
) -> int:
    """
    Count total users.

    Args:
        pool: Database connection pool

    Returns:
        Total number of users

    SQL:
        SELECT COUNT(*) FROM users
    """
    query = "SELECT COUNT(*) FROM users"

    async with pool.acquire() as conn:
        count = await conn.fetchval(query)

    return count


# =====================================================
# UPDATE
# =====================================================

async def update_user_db(
    pool: asyncpg.Pool,
    user_id: int,
    email: Optional[str] = None,
    hashed_password: Optional[str] = None,
    name: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Update user by ID.

    Args:
        pool: Database connection pool
        user_id: Primary key
        email: Optional new email
        hashed_password: Optional new hashed password
        name: Optional new name

    Returns:
        Dict containing updated user data or None if not found

    SQL:
        UPDATE users
        SET [fields]
        WHERE id = $1
        RETURNING *

    Note: updated_at is auto-updated by trigger (trigger_set_updated_at)
    """
    # Build SET clause dynamically
    set_clauses = []
    params = []
    param_idx = 1

    if email is not None:
        set_clauses.append(f"email = ${param_idx}")
        params.append(email)
        param_idx += 1

    if hashed_password is not None:
        set_clauses.append(f"hashed_password = ${param_idx}")
        params.append(hashed_password)
        param_idx += 1

    if name is not None:
        set_clauses.append(f"name = ${param_idx}")
        params.append(name)
        param_idx += 1

    # If no fields to update, return None
    if not set_clauses:
        return None

    params.append(user_id)

    query = f"""
        UPDATE users
        SET {", ".join(set_clauses)}
        WHERE id = ${param_idx}
        RETURNING id, email, hashed_password, name, created_at, updated_at
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)

    return dict(row) if row else None


# =====================================================
# DELETE
# =====================================================

async def delete_user_db(
    pool: asyncpg.Pool,
    user_id: int
) -> bool:
    """
    Delete user by ID.

    Args:
        pool: Database connection pool
        user_id: Primary key

    Returns:
        True if deleted, False if not found

    SQL:
        DELETE FROM users
        WHERE id = $1

    Note: This will fail if user has leads (ON DELETE RESTRICT constraint)
    """
    query = """
        DELETE FROM users
        WHERE id = $1
    """

    async with pool.acquire() as conn:
        result = await conn.execute(query, user_id)

    return int(result.split()[1]) > 0
