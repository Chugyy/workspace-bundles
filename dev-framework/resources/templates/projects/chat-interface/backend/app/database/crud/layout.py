# crud/layout.py

import json
import asyncpg


async def get_layout_crud(pool: asyncpg.Pool) -> list:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT tree FROM workspace_layout LIMIT 1")
    if not row:
        return []
    tree = row["tree"]
    return json.loads(tree) if isinstance(tree, str) else tree


async def save_layout_crud(pool: asyncpg.Pool, tree: list) -> list:
    tree_json = json.dumps(tree)
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT COUNT(*) FROM workspace_layout")
        if exists:
            await conn.execute(
                "UPDATE workspace_layout SET tree = $1::jsonb, updated_at = NOW()",
                tree_json,
            )
        else:
            await conn.execute(
                "INSERT INTO workspace_layout (tree) VALUES ($1::jsonb)",
                tree_json,
            )
    return tree
