"""
Tâche de nettoyage automatique de la corbeille.
Supprime définitivement les items supprimés depuis > 30 jours.
"""

import asyncio
from datetime import datetime
from app.database import crud
from app.core.storage import delete_file_on_disk
from config.logger import logger


async def cleanup_old_trash(days: int = 30):
    """
    Supprime définitivement les fichiers et dossiers en corbeille depuis > X jours.

    Args:
        days: Nombre de jours avant suppression définitive (défaut: 30)
    """
    try:
        logger.info(f"Starting trash cleanup (items older than {days} days)...")

        # Utiliser la fonction CRUD pour récupérer les fichiers à supprimer
        files_deleted, folders_deleted = await crud.cleanup_old_trash(days)

        logger.info(f"Trash cleanup completed: {files_deleted} files, {folders_deleted} folders deleted")

        return files_deleted, folders_deleted

    except Exception as e:
        logger.error(f"Error during trash cleanup: {e}")
        return 0, 0


async def run_cleanup_scheduler(interval_hours: int = 24, days: int = 30):
    """
    Exécute le cleanup de manière périodique.

    Args:
        interval_hours: Intervalle entre chaque exécution (défaut: 24h)
        days: Nombre de jours avant suppression définitive
    """
    logger.info(f"Trash cleanup scheduler started (interval: {interval_hours}h, retention: {days} days)")

    while True:
        try:
            await cleanup_old_trash(days)
        except Exception as e:
            logger.error(f"Unexpected error in cleanup scheduler: {e}")

        # Attendre avant la prochaine exécution
        await asyncio.sleep(interval_hours * 3600)
