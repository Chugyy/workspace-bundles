# ============================================
# DOKPLOY CONFIGURATION REQUISE
# ============================================
# Mounts:
#   - Type: Volume mount
#   - Name: uploads_data
#   - Container path: /app/uploads
#
# Environment variables:
#   - APP_NAME="Personal Cloud API"
#   - DEBUG=false
#   - HOST=0.0.0.0
#   - PORT=8000
#   - JWT_SECRET_KEY (générer avec: openssl rand -hex 32)
#   - JWT_ALGORITHM=HS256
#   - JWT_EXPIRATION_HOURS=24
#   - ADMIN_TOKEN (générer avec: openssl rand -hex 32)
#   - API_KEY (générer avec: openssl rand -hex 32)
#   - PRODUCTION=true
#   - DB_PROD_URL=postgresql://user:pass@host:port/dbname
#   - DB_HOST=postgres
#   - DB_PORT=5432
#   - DB_NAME=personal_cloud
#   - DB_USER=<user>
#   - DB_PASSWORD=<password>
#   - FRONTEND_URL=https://your-frontend-url.com
#
# Ports:
#   - Container: 8000
#   - Public: Yes
# ============================================

FROM python:3.13.1-slim

# Installer dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Créer user non-root
RUN useradd -m -u 1000 appuser

# Définir workdir
WORKDIR /app

# Copier requirements
COPY config/requirements.txt ./config/requirements.txt

# Installer dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r config/requirements.txt

# Créer dossier uploads avec bonnes permissions
RUN mkdir -p /app/uploads && \
    chown -R appuser:appuser /app/uploads && \
    touch /app/app.log && \
    chown appuser:appuser /app/app.log

# Copier code source
COPY --chown=appuser:appuser . .

# Changer vers user non-root
USER appuser

# Exposer port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Mode production : uvicorn sans hot-reload
CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
