"""
CRUD operations for leads
Generated from schema.md
Pure database access functions with no business logic.
"""

import re
from typing import Optional, List, Dict, Any
import asyncpg


# =====================================================
# CREATE
# =====================================================

async def create_lead_db(
    pool: asyncpg.Pool,
    user_id: int,
    lead_data: dict
) -> Dict[str, Any]:
    """
    Create a new lead.

    Input:
    - user_id: int (FK to users.id)
    - lead_data: dict with keys (name, first_name, email, phone, company, address, instagram, linkedin, twitter, youtube, website, status, heat_level, city, ca, effectifs)

    Output: Lead object with all columns

    Table: leads
    Operation: INSERT
    """
    query = """
        INSERT INTO leads (
            user_id, name, first_name, email, phone, company, address,
            instagram, linkedin, twitter, youtube, website, status, heat_level, city,
            ca, effectifs
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, user_id, name, first_name, email, phone, company, address,
                  instagram, linkedin, twitter, youtube, website, status, heat_level,
                  city, ca, effectifs, created_at, updated_at
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            query,
            user_id,
            lead_data.get("name"),
            lead_data.get("first_name"),
            lead_data.get("email"),
            lead_data.get("phone"),
            lead_data.get("company"),
            lead_data.get("address"),
            lead_data.get("instagram"),
            lead_data.get("linkedin"),
            lead_data.get("twitter"),
            lead_data.get("youtube"),
            lead_data.get("website"),
            lead_data.get("status", "identified"),
            lead_data.get("heat_level", "cold"),
            lead_data.get("city"),
            lead_data.get("ca"),
            lead_data.get("effectifs"),
        )

    return dict(row)


# =====================================================
# READ
# =====================================================

LEAD_COLUMNS = """id, user_id, name, first_name, email, phone, company, address,
               instagram, linkedin, twitter, youtube, website, status, heat_level,
               city, ca, effectifs, created_at, updated_at, last_activity_at"""

async def get_lead_by_id_db(
    pool: asyncpg.Pool,
    lead_id: int
) -> Optional[Dict[str, Any]]:
    """Get lead by ID."""
    query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE id = $1
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, lead_id)

    return dict(row) if row else None


async def get_leads_by_user_db(
    pool: asyncpg.Pool,
    user_id: int,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get all leads for a specific user with pagination."""
    query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, user_id, limit, offset)

    return [dict(row) for row in rows]


async def get_leads_by_status_db(
    pool: asyncpg.Pool,
    user_id: int,
    status: str,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get all leads for a user filtered by status."""
    query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE user_id = $1 AND status = $2
        ORDER BY updated_at DESC
        LIMIT $3 OFFSET $4
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, user_id, status, limit, offset)

    return [dict(row) for row in rows]


async def get_leads_by_heat_level_db(
    pool: asyncpg.Pool,
    user_id: int,
    heat_level: str,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get all leads for a user filtered by heat level."""
    query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE user_id = $1 AND heat_level = $2
        ORDER BY updated_at DESC
        LIMIT $3 OFFSET $4
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, user_id, heat_level, limit, offset)

    return [dict(row) for row in rows]


async def list_leads_db(
    pool: asyncpg.Pool,
    user_id: int,
    filters: Optional[Dict[str, Any]] = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "updated_at",
    sort_order: str = "DESC"
) -> Dict[str, Any]:
    """List all leads for a user with pagination and optional filters."""
    offset = (page - 1) * page_size

    allowed_sort_fields = ["id", "name", "email", "status", "heat_level", "created_at", "updated_at", "last_activity_at"]
    if sort_by not in allowed_sort_fields:
        sort_by = "updated_at"

    if sort_order.upper() not in ["ASC", "DESC"]:
        sort_order = "DESC"

    where_clauses = ["user_id = $1"]
    params = [user_id]
    param_idx = 2

    if filters:
        if "status" in filters and filters["status"] is not None:
            where_clauses.append(f"status = ${param_idx}")
            params.append(filters["status"])
            param_idx += 1

        if "heat_level" in filters and filters["heat_level"] is not None:
            where_clauses.append(f"heat_level = ${param_idx}")
            params.append(filters["heat_level"])
            param_idx += 1

        if "city" in filters and filters["city"] is not None:
            city_clean = re.sub(r"[^a-zA-ZÀ-ɏ]", "", filters["city"])
            where_clauses.append(f"regexp_replace(lower(city), '[^[:alpha:]]', '', 'g') ILIKE ${param_idx}")
            params.append(f"%{city_clean.lower()}%")
            param_idx += 1

    where_sql = " AND ".join(where_clauses)

    count_query = f"SELECT COUNT(*) FROM leads WHERE {where_sql}"

    data_query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE {where_sql}
        ORDER BY {sort_by} {sort_order.upper()}
        LIMIT ${param_idx} OFFSET ${param_idx + 1}
    """

    params_with_pagination = params + [page_size, offset]

    async with pool.acquire() as conn:
        total = await conn.fetchval(count_query, *params)
        rows = await conn.fetch(data_query, *params_with_pagination)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "leads": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


async def get_lead_by_email_db(
    pool: asyncpg.Pool,
    user_id: int,
    email: str
) -> Optional[Dict[str, Any]]:
    """Get lead by email and user_id (unique constraint)."""
    query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE user_id = $1 AND email = $2
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id, email)

    return dict(row) if row else None


# =====================================================
# UPDATE
# =====================================================

async def update_lead_db(
    pool: asyncpg.Pool,
    lead_id: int,
    updates: dict
) -> Optional[Dict[str, Any]]:
    """Update lead by ID (partial update)."""
    set_clauses = []
    params = []
    param_idx = 1

    allowed_fields = [
        "name", "first_name", "email", "phone", "company", "address",
        "instagram", "linkedin", "twitter", "youtube", "website",
        "status", "heat_level", "city", "ca", "effectifs"
    ]

    for field in allowed_fields:
        if field in updates:
            set_clauses.append(f"{field} = ${param_idx}")
            params.append(updates[field])
            param_idx += 1

    if len(set_clauses) == 0:
        return None

    set_clauses.append("updated_at = NOW()")
    params.append(lead_id)

    query = f"""
        UPDATE leads
        SET {", ".join(set_clauses)}
        WHERE id = ${param_idx}
        RETURNING {LEAD_COLUMNS}
    """

    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)

    return dict(row) if row else None


# =====================================================
# DELETE
# =====================================================

async def delete_lead_db(
    pool: asyncpg.Pool,
    lead_id: int
) -> bool:
    """Delete lead by ID."""
    query = """
        DELETE FROM leads
        WHERE id = $1
    """

    async with pool.acquire() as conn:
        result = await conn.execute(query, lead_id)

    return int(result.split()[1]) > 0


# =====================================================
# BULK OPERATIONS
# =====================================================

async def bulk_create_leads_db(
    pool: asyncpg.Pool,
    user_id: int,
    leads_data: List[dict]
) -> List[int]:
    """Create multiple leads in a single transaction."""
    query = """
        INSERT INTO leads (
            user_id, name, first_name, email, phone, company, address,
            instagram, linkedin, twitter, youtube, website, status, heat_level, city,
            ca, effectifs
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
    """

    lead_ids = []

    async with pool.acquire() as conn:
        async with conn.transaction():
            for lead_data in leads_data:
                row = await conn.fetchrow(
                    query,
                    user_id,
                    lead_data.get("name"),
                    lead_data.get("first_name"),
                    lead_data.get("email"),
                    lead_data.get("phone"),
                    lead_data.get("company"),
                    lead_data.get("address"),
                    lead_data.get("instagram"),
                    lead_data.get("linkedin"),
                    lead_data.get("twitter"),
                    lead_data.get("youtube"),
                    lead_data.get("website"),
                    lead_data.get("status", "identified"),
                    lead_data.get("heat_level", "cold"),
                    lead_data.get("city"),
                    lead_data.get("ca"),
                    lead_data.get("effectifs"),
                )
                lead_ids.append(row["id"])

    return lead_ids


async def bulk_delete_leads_db(
    pool: asyncpg.Pool,
    lead_ids: List[int]
) -> int:
    """Delete multiple leads by IDs."""
    query = """
        DELETE FROM leads
        WHERE id = ANY($1::int[])
    """

    async with pool.acquire() as conn:
        result = await conn.execute(query, lead_ids)

    return int(result.split()[1])


# =====================================================
# SEARCH
# =====================================================

async def search_leads_db(
    pool: asyncpg.Pool,
    user_id: int,
    query: str,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """Search leads by query string (name, first_name, email, company)."""
    offset = (page - 1) * page_size

    where_clause = """
        user_id = $1 AND (
            name ILIKE $2 OR
            first_name ILIKE $2 OR
            email ILIKE $2 OR
            company ILIKE $2
        )
    """

    search_pattern = f"%{query}%"

    count_query = f"SELECT COUNT(*) FROM leads WHERE {where_clause}"

    data_query = f"""
        SELECT {LEAD_COLUMNS}
        FROM leads
        WHERE {where_clause}
        ORDER BY updated_at DESC
        LIMIT $3 OFFSET $4
    """

    async with pool.acquire() as conn:
        total = await conn.fetchval(count_query, user_id, search_pattern)
        rows = await conn.fetch(data_query, user_id, search_pattern, page_size, offset)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "leads": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# =====================================================
# COUNT OPERATIONS
# =====================================================

async def count_leads_by_user_db(
    pool: asyncpg.Pool,
    user_id: int,
    filters: Optional[Dict[str, Any]] = None
) -> int:
    """Count total leads for a user with optional filters."""
    where_clauses = ["user_id = $1"]
    params = [user_id]
    param_idx = 2

    if filters:
        if "status" in filters and filters["status"] is not None:
            where_clauses.append(f"status = ${param_idx}")
            params.append(filters["status"])
            param_idx += 1

        if "heat_level" in filters and filters["heat_level"] is not None:
            where_clauses.append(f"heat_level = ${param_idx}")
            params.append(filters["heat_level"])
            param_idx += 1

        if "city" in filters and filters["city"] is not None:
            city_clean = re.sub(r"[^a-zA-ZÀ-ɏ]", "", filters["city"])
            where_clauses.append(f"regexp_replace(lower(city), '[^[:alpha:]]', '', 'g') ILIKE ${param_idx}")
            params.append(f"%{city_clean.lower()}%")
            param_idx += 1

    where_sql = " AND ".join(where_clauses)
    query = f"SELECT COUNT(*) FROM leads WHERE {where_sql}"

    async with pool.acquire() as conn:
        count = await conn.fetchval(query, *params)

    return count
