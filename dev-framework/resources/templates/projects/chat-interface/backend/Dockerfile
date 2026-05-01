# ============================================================
# DOCKERFILE — Backend FastAPI
# ============================================================
# Image unique (pas de multi-stage) : l'app Python est légère
# et le build est déjà rapide sans optimisation supplémentaire.
#
# BUILD local :
#   docker build -t backend .
# BUILD via compose :
#   docker compose build backend
#
# VARIABLES D'ENVIRONNEMENT requises au runtime (via docker-compose) :
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
#   JWT_SECRET_KEY, APP_PASSWORD, CLAUDE_CODE_OAUTH_TOKEN
# ============================================================

FROM python:3.11-slim

# Dépendances système :
# - libpq-dev + gcc : compilation asyncpg / psycopg2
# - nodejs           : requis par claude-agent-sdk (appel CLI `claude`)
# - curl             : healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier requirements en premier pour bénéficier du cache Docker
# (couche reconstruite seulement si requirements.txt change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
