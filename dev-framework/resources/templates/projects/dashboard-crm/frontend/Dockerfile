# ============================================
# CONFIGURATION DOCKER
# ============================================
# Port: 3000
#
# BUILD ARG REQUIS (à passer au moment du build):
#   - NEXT_PUBLIC_API_URL: URL du backend API
#
# DOKPLOY CONFIGURATION:
#   Dans Dokploy > Build Settings > Build Arguments:
#   Ajouter: NEXT_PUBLIC_API_URL=https://api.yourdomain.com
#   IMPORTANT: NE PAS mettre dans "Environment Variables" !
#
# Commande build locale:
#   docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t frontend-v2 .
# Commande run: docker run -p 3000:3000 frontend-v2
# ============================================

# ==================== STAGE 1 : DEPENDENCIES ====================
FROM node:24.3-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# Cache npm registry entre les builds
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# ==================== STAGE 2 : BUILDER ====================
FROM node:24.3-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Réutiliser node_modules depuis le stage deps (évite un 2e npm ci)
COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Cache .next/cache entre les builds pour éviter la recompilation complète
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ==================== STAGE 3 : RUNNER (PRODUCTION) ====================
FROM node:24.3-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Standalone output contient uniquement les fichiers nécessaires au runtime
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
