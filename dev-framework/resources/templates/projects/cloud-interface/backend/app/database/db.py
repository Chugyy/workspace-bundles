# db.py - Gestion de base de données asynchrone minimaliste

import asyncpg
import uuid
from config.config import settings

# Pool de connexions global
_pool: asyncpg.Pool = None

async def get_async_db_connection():
    """Retourne une connexion PostgreSQL asynchrone."""
    return await asyncpg.connect(
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        user=settings.db_user,
        password=settings.db_password
    )

async def get_db_pool() -> asyncpg.Pool:
    """Retourne le pool de connexions (crée si nécessaire)."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
            min_size=5,
            max_size=20
        )
    return _pool

async def close_db_pool():
    """Ferme le pool de connexions."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

async def init_db():
    """Crée la base de données et ses tables si elles n'existent pas."""
    conn = await get_async_db_connection()
    try:
        # Table users
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR NOT NULL,
                last_name VARCHAR NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                password_hash VARCHAR NOT NULL DEFAULT '',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)

        # Table password_reset_tokens
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token VARCHAR NOT NULL UNIQUE,
                expires_at VARCHAR NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),

                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # Table folders
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name VARCHAR NOT NULL,
                parent_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP DEFAULT NULL,

                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE
            )
        """)

        # Table files
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                folder_id INTEGER,
                name VARCHAR NOT NULL,
                size BIGINT NOT NULL,
                path VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP DEFAULT NULL,

                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
            )
        """)

        # Migration: rendre folder_id nullable et ajouter user_id dans files
        await conn.execute("""
            DO $$
            BEGIN
                -- Rendre folder_id nullable
                ALTER TABLE files ALTER COLUMN folder_id DROP NOT NULL;
            EXCEPTION
                WHEN others THEN NULL;
            END $$;
        """)

        await conn.execute("""
            DO $$
            DECLARE
                first_user_id INTEGER;
            BEGIN
                -- Ajouter user_id si n'existe pas
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'files' AND column_name = 'user_id'
                ) THEN
                    -- Ajouter la colonne (nullable temporairement)
                    ALTER TABLE files ADD COLUMN user_id INTEGER;

                    -- Remplir user_id depuis les folders pour les fichiers dans un dossier
                    UPDATE files f
                    SET user_id = (SELECT user_id FROM folders WHERE id = f.folder_id)
                    WHERE f.folder_id IS NOT NULL;

                    -- Pour les fichiers à la racine (folder_id=NULL), utiliser le premier user
                    SELECT id INTO first_user_id FROM users LIMIT 1;
                    UPDATE files
                    SET user_id = first_user_id
                    WHERE folder_id IS NULL AND user_id IS NULL;

                    -- Rendre NOT NULL
                    ALTER TABLE files ALTER COLUMN user_id SET NOT NULL;

                    -- Ajouter la contrainte FK
                    ALTER TABLE files ADD CONSTRAINT files_user_id_fkey
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)

        # Ajouter la colonne deleted_at si elle n'existe pas (migration)
        await conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'folders' AND column_name = 'deleted_at'
                ) THEN
                    ALTER TABLE folders ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'files' AND column_name = 'deleted_at'
                ) THEN
                    ALTER TABLE files ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
                END IF;
            END $$;
        """)

        # Index pour optimiser les requêtes sur deleted_at
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_folders_deleted_at ON folders(deleted_at)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at)
        """)

        # Ajouter la colonne is_favorite si elle n'existe pas (migration)
        await conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'folders' AND column_name = 'is_favorite'
                ) THEN
                    ALTER TABLE folders ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'files' AND column_name = 'is_favorite'
                ) THEN
                    ALTER TABLE files ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;
                END IF;
            END $$;
        """)

        # Index pour optimiser les requêtes sur is_favorite
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_folders_is_favorite ON folders(is_favorite)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(is_favorite)
        """)

        # Table shared_links
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS shared_links (
                id SERIAL PRIMARY KEY,
                file_id INTEGER NOT NULL,
                token VARCHAR(32) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token)
        """)

        print("Database initialized successfully")
    finally:
        await conn.close()