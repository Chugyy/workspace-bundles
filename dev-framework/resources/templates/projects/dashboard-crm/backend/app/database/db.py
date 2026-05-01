# db.py - Database Connection Pool Management

import asyncpg
import os
from typing import Optional
from config.logger import logger

# ============================
# Global connection pool
# ============================

_db_pool: Optional[asyncpg.Pool] = None


async def init_db_pool():
    """Initialize database connection pool."""
    global _db_pool

    if _db_pool is not None:
        logger.warning("Database pool already initialized")
        return _db_pool

    db_url = os.getenv('DATABASE_URL')

    try:
        pool_kwargs = dict(
            min_size=5,
            max_size=20,
            command_timeout=60,
            server_settings={'timezone': 'UTC'},
        )

        if db_url:
            _db_pool = await asyncpg.create_pool(db_url, **pool_kwargs)
        else:
            from config.config import settings
            _db_pool = await asyncpg.create_pool(
                host=settings.db_host,
                port=settings.db_port,
                database=settings.db_name,
                user=settings.db_user,
                password=settings.db_password,
                **pool_kwargs
            )

        logger.info("✅ Database connection pool initialized")
        return _db_pool

    except Exception as e:
        logger.error(f"❌ Failed to initialize database pool: {e}")
        raise


async def get_db_pool() -> asyncpg.Pool:
    """Get database connection pool (initialize if needed)."""
    global _db_pool

    if _db_pool is None:
        await init_db_pool()

    return _db_pool


async def close_db_pool():
    """Close database connection pool."""
    global _db_pool

    if _db_pool:
        await _db_pool.close()
        _db_pool = None
        logger.info("✅ Database pool closed")


# ============================
# Legacy function (kept for compatibility)
# ============================

async def get_async_db_connection():
    """
    Legacy function - returns a single connection.
    For new code, prefer using get_db_pool() and pool.acquire().
    """
    db_url = os.getenv('DATABASE_URL')

    if db_url:
        return await asyncpg.connect(db_url)
    else:
        from config.config import settings
        return await asyncpg.connect(
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password
        )


async def init_db():
    """Initialize database via migration system."""
    from app.database.migrations import run_pending_migrations

    logger.info("🔄 Initializing database...")
    try:
        await run_pending_migrations()
        logger.info("✅ Database initialized successfully")

    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
