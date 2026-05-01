# ============================================================
# DOCKERFILE — Frontend Next.js (multi-stage optimisé)
# ============================================================
# 3 stages pour minimiser la taille de l'image finale et
# maximiser l'utilisation du cache Docker entre les builds.
#
# BUILD ARG requis :
#   NEXT_PUBLIC_API_URL  URL du backend API (baked at build time)
#
# BUILD local :
#   docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t frontend .
# BUILD via compose :
#   docker compose build frontend
#
# IMPORTANT : NEXT_PUBLIC_API_URL est injecté au BUILD (pas au runtime).
# Changer l'URL nécessite un rebuild de l'image.
# ============================================================

# ==================== STAGE 1 : DEPENDENCIES ====================
# But : isoler npm ci dans sa propre couche cachée.
# Résultat : node_modules réutilisés par le stage builder sans re-téléchargement.
FROM node:24.3-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# Cache du registre npm monté en volume (persist entre les builds Docker)
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# ==================== STAGE 2 : BUILDER ====================
# But : compiler l'app Next.js en mode standalone.
# Le cache .next/cache évite la recompilation complète à chaque build.
FROM node:24.3-slim AS builder

WORKDIR /app

# Injecté au build — baked dans le bundle JS (pas disponible au runtime)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Récupérer node_modules du stage deps (évite un 2e npm ci)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Cache .next/cache monté en volume (évite la recompilation complète)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ==================== STAGE 3 : RUNNER ====================
# But : image de production minimale.
# Standalone output = seulement les fichiers nécessaires au runtime,
# sans node_modules complet (~10x plus léger).
FROM node:24.3-slim AS runner

# curl uniquement pour le HEALTHCHECK
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Utilisateur non-root pour la sécurité
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Copier uniquement les artefacts du build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

USER nextjs

CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1
