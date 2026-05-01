# ============================================
# CONFIGURATION DOCKER
# ============================================
# Port: 8000
# Commande build: docker build -t backend-onboarding .
# Commande run: docker run -p 8000:8000 --env-file config/.env backend-onboarding
#
# Variables d'environnement requises (voir config/.env):
# APP_NAME, DEBUG, HOST, PORT
# JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, ADMIN_TOKEN
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# FRONTEND_URL
# ============================================

FROM python:3.13-slim

# Installer dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Créer user non-root
RUN useradd -m -u 1001 appuser

# Définir workdir
WORKDIR /app

# Copier requirements
COPY config/requirements.txt ./config/requirements.txt

# Installer dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r config/requirements.txt

# Copier code source
COPY --chown=appuser:appuser . .

# Changer vers user non-root
USER appuser

# Exposer port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Mode dev : uvicorn avec hot-reload
CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
