#!/usr/bin/env python3
# app/api/main.py

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import settings
from config.logger import logger
from app.api.routes import auth, users, health

from app.database.db import init_db

async def lifespan(app: FastAPI):
   logger.info("🚀 Démarrage de l'application")
   init_db()
   yield
   logger.info("🛑 Arrêt de l'application")

# --- Création de l'app ---
app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan, redirect_slashes=False)

# --- Configuration CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusion des routes ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(health.router)

# --- Lancement en mode script ---
if __name__ == "__main__":
    uvicorn.run ("app.api.main:app", host=settings.host, port=settings.port, reload=settings.debug, factory=False)