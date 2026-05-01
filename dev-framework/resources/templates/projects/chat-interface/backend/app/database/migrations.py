"""Système de migrations automatiques."""

from pathlib import Path
import asyncpg
from config.logger import logger
from app.database.db import get_async_db_connection


async def init_migrations_table():
    """Crée la table de tracking des migrations si elle n'existe pas."""
    conn = await get_async_db_connection()
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        logger.info("✅ Table _migrations initialisée")
    finally:
        await conn.close()


async def get_applied_migrations() -> set:
    """Récupère la liste des migrations déjà appliquées."""
    conn = await get_async_db_connection()
    try:
        rows = await conn.fetch("SELECT filename FROM _migrations ORDER BY id")
        return {row['filename'] for row in rows}
    finally:
        await conn.close()


async def mark_migration_applied(filename: str):
    """Marque une migration comme appliquée."""
    conn = await get_async_db_connection()
    try:
        await conn.execute(
            "INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
            filename
        )
    finally:
        await conn.close()


def parse_sql_statements(sql: str) -> list:
    """
    Parse SQL en statements, en gérant correctement les blocs PL/pgSQL ($$...$$).
    """
    statements = []
    current_stmt = []
    in_dollar_quote = False
    dollar_tag = None

    lines = sql.split('\n')

    for line in lines:
        stripped = line.strip()

        # Ignorer les commentaires vides
        if not stripped or stripped.startswith('--'):
            continue

        # Détecter le début/fin d'un bloc dollar-quoted
        if '$$' in line:
            if not in_dollar_quote:
                # Début d'un bloc dollar-quoted
                in_dollar_quote = True
                # Extraire le tag si présent (ex: $tag$)
                dollar_parts = line.split('$$')
                if len(dollar_parts) > 0 and dollar_parts[0].strip().endswith('$'):
                    dollar_tag = dollar_parts[0].strip()
                else:
                    dollar_tag = '$$'
                current_stmt.append(line)
            else:
                # Fin du bloc dollar-quoted
                current_stmt.append(line)
                in_dollar_quote = False
                dollar_tag = None
        elif in_dollar_quote:
            # À l'intérieur d'un bloc dollar-quoted
            current_stmt.append(line)
        else:
            # Hors d'un bloc dollar-quoted
            if ';' in line:
                # Statement terminé
                parts = line.split(';')
                current_stmt.append(parts[0])
                stmt = '\n'.join(current_stmt).strip()
                if stmt:
                    statements.append(stmt)
                current_stmt = []
                # Gérer le reste après le ;
                if len(parts) > 1 and parts[1].strip():
                    current_stmt.append(parts[1])
            else:
                current_stmt.append(line)

    # Ajouter le dernier statement s'il existe
    if current_stmt:
        stmt = '\n'.join(current_stmt).strip()
        if stmt:
            statements.append(stmt)

    return statements


async def run_migration(filepath: Path):
    """Exécute une migration SQL."""
    conn = await get_async_db_connection()
    try:
        with open(filepath, 'r') as f:
            sql = f.read()

        # Parser les statements SQL correctement
        statements = parse_sql_statements(sql)

        # Exécuter chaque statement
        for stmt in statements:
            try:
                if stmt.strip():
                    await conn.execute(stmt)
            except asyncpg.exceptions.DuplicateTableError:
                logger.debug(f"⚠️ Élément déjà existant (ignoré)")
            except asyncpg.exceptions.DuplicateObjectError:
                logger.debug(f"⚠️ Objet déjà existant (ignoré)")
            except Exception as e:
                # Pour les DROP IF EXISTS, les erreurs sont normales
                if 'does not exist' in str(e) and any(x in stmt.upper() for x in ['DROP TABLE', 'DROP FUNCTION', 'DROP INDEX']):
                    logger.debug(f"⚠️ DROP ignoré (élément inexistant)")
                else:
                    logger.error(f"❌ Erreur SQL: {e}")
                    logger.error(f"Statement: {stmt[:200]}...")
                    raise

        # Marquer comme appliquée
        await mark_migration_applied(filepath.name)

        logger.info(f"✅ Migration appliquée : {filepath.name}")

    except Exception as e:
        logger.error(f"❌ Erreur lors de la migration {filepath.name}: {e}")
        raise
    finally:
        await conn.close()


async def run_pending_migrations():
    """Exécute toutes les migrations en attente dans l'ordre."""

    # 1. Initialiser la table de tracking
    await init_migrations_table()

    # 2. Récupérer les migrations appliquées
    applied = await get_applied_migrations()

    # 3. Lister tous les fichiers de migration
    migrations_dir = Path(__file__).parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.warning("⚠️ Aucun fichier de migration trouvé")
        return

    # 4. Exécuter les migrations non appliquées
    pending_count = 0
    for filepath in migration_files:
        if filepath.name not in applied:
            logger.info(f"🔄 Application de la migration : {filepath.name}")
            await run_migration(filepath)
            pending_count += 1

    if pending_count == 0:
        logger.info("✅ Toutes les migrations sont déjà appliquées")
    else:
        logger.info(f"✅ {pending_count} migration(s) appliquée(s) avec succès")
