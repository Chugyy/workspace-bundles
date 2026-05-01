# crud/profiles.py

from typing import Optional
import asyncpg


async def create_profile_crud(pool: asyncpg.Pool, name: str) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO claude_profiles (name) VALUES ($1) RETURNING *", name
        )
    return dict(row)


async def get_profile_crud(pool: asyncpg.Pool, profile_id: str) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM claude_profiles WHERE id = $1::uuid", profile_id
        )
    return dict(row) if row else None


async def get_default_profile_crud(pool: asyncpg.Pool) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM claude_profiles WHERE name = 'default' LIMIT 1"
        )
    return dict(row) if row else None


async def list_profiles_crud(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM claude_profiles ORDER BY created_at ASC"
        )
    return [dict(r) for r in rows]


async def update_profile_color_crud(pool: asyncpg.Pool, profile_id: str, color: str) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE claude_profiles SET color = $2 WHERE id = $1::uuid RETURNING *",
            profile_id, color,
        )
    return dict(row) if row else None


async def delete_profile_crud(pool: asyncpg.Pool, profile_id: str) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "DELETE FROM claude_profiles WHERE id = $1::uuid AND name != 'default' RETURNING id",
            profile_id,
        )
    return row is not None
