#!/usr/bin/env python3
# app/api/main.py

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import settings
from config.logger import logger
from app.api.routes import health
from app.api.routes.user import auth_router, user_router
from app.api.routes.lead import router as lead_router
from app.api.routes.note import router as note_router
from app.api.routes.event import router as event_router
from app.api.routes.task import router as task_router

from app.database.db import init_db, init_db_pool, close_db_pool

async def lifespan(app: FastAPI):
   logger.info("🚀 Démarrage de l'application")
   await init_db_pool()
   await init_db()
   yield
   await close_db_pool()
   logger.info("🛑 Arrêt de l'application")

# --- Création de l'app ---
app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# --- Configuration CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusion des routes ---
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(lead_router)
app.include_router(note_router)
app.include_router(event_router)
app.include_router(task_router)
app.include_router(health.router)

# --- Lancement en mode script ---
if __name__ == "__main__":
    uvicorn.run ("app.api.main:app", host=settings.host, port=settings.port, reload=settings.debug, factory=False)