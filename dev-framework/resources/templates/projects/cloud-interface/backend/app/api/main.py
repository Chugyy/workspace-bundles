#!/usr/bin/env python3
# app/api/main.py

import uvicorn
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from config.config import settings
from config.logger import logger
from app.api.routes import auth, health, storage, trash, admin
from app.database import crud

from app.database.db import init_db, close_db_pool
from app.core.tasks.cleanup import run_cleanup_scheduler

async def lifespan(app: FastAPI):
   logger.info("🚀 Démarrage de l'application")
   await init_db()

   # Lancer le cleanup scheduler en background
   cleanup_task = asyncio.create_task(run_cleanup_scheduler(interval_hours=24, days=30))

   yield

   # Arrêter le cleanup scheduler
   cleanup_task.cancel()
   try:
      await cleanup_task
   except asyncio.CancelledError:
      logger.info("Cleanup scheduler stopped")

   # Fermer le pool de connexions
   await close_db_pool()
   logger.info("🛑 Arrêt de l'application")

# --- Création de l'app ---
app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# --- Configuration CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "null"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusion des routes ---
app.include_router(auth.router)
app.include_router(health.router)
app.include_router(storage.router)
app.include_router(trash.router)
app.include_router(admin.router)

# --- Route publique de partage ---
@app.get("/share/{token}")
async def download_shared_file(token: str):
    """Télécharge un fichier via lien de partage public (pas d'auth)."""
    shared_link = await crud.get_shared_link(token)
    if not shared_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    import mimetypes
    guessed_type, _ = mimetypes.guess_type(shared_link["name"])
    media_type = guessed_type or "application/octet-stream"

    return FileResponse(
        path=shared_link["path"],
        media_type=media_type
    )

# --- Lancement en mode script ---
if __name__ == "__main__":
    uvicorn.run ("app.api.main:app", host=settings.host, port=settings.port, reload=settings.debug, factory=False)