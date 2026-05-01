#!/usr/bin/env python3
# app/api/main.py

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import settings
from config.logger import logger
from app.api.routes import auth, users, health, sessions, workspaces
from app.api.routes import profiles, files, transcription, layout, models

from app.database.db import get_db_pool, init_db
from app.core.services.profiles import ensure_default_profile
from app.core.services.workspaces import ensure_default_workspace

async def lifespan(app: FastAPI):
   logger.info("🚀 Démarrage de l'application")
   await init_db()
   pool = await get_db_pool()
   await ensure_default_profile(pool)
   await ensure_default_workspace(pool)
   yield
   logger.info("🛑 Arrêt de l'application")

# --- Création de l'app ---
app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# --- Configuration CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusion des routes ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(health.router)
app.include_router(sessions.router)
app.include_router(workspaces.router)
app.include_router(profiles.router)
app.include_router(files.router)
app.include_router(transcription.router)
app.include_router(layout.router)
app.include_router(models.router)

# --- Lancement en mode script ---
if __name__ == "__main__":
    uvicorn.run("app.api.main:app", host=settings.host, port=settings.port, reload=settings.debug, reload_dirs=["app", "config"])