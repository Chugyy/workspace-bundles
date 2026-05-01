# app/database/crud/files.py

import asyncpg


async def create_file_crud(
    pool: asyncpg.Pool,
    file_id: str,
    session_id: str,
    filename: str,
    mime_type: str,
    size: int,
    url: str,
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO uploaded_files (id, session_id, filename, mime_type, size, url)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
            RETURNING *
            """,
            file_id,
            session_id,
            filename,
            mime_type,
            size,
            url,
        )
        return dict(row)


async def get_file_crud(pool: asyncpg.Pool, file_id: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM uploaded_files WHERE id = $1::uuid",
            file_id,
        )
        return dict(row) if row else None
