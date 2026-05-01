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
#   docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t frontend-onboarding .
# Commande run: docker run -p 3000:3000 frontend-onboarding
# ============================================

# ==================== STAGE 1 : DEPENDENCIES ====================
FROM node:24.3-slim AS deps

WORKDIR /app

# Copier package files et lock file
COPY package.json package-lock.json ./

# Installer dépendances de production uniquement
RUN npm ci --omit=dev

# ==================== STAGE 2 : BUILDER ====================
FROM node:24.3-slim AS builder

WORKDIR /app

# ARG pour recevoir l'URL de l'API au moment du build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copier package files et lock file
COPY package.json package-lock.json ./

# Installer toutes les dépendances (dev + prod pour le build)
RUN npm ci

# Copier code source
COPY . .

# Build Next.js pour production (génère .next/)
# Désactiver télémétrie pendant le build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==================== STAGE 3 : RUNNER (PRODUCTION) ====================
FROM node:24.3-slim AS runner

# Installer curl pour healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Créer user non-root
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Copier uniquement les fichiers nécessaires depuis les stages précédents
# 1. Dépendances de production uniquement (depuis le stage deps optimisé)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 2. Build output Next.js (depuis le stage builder)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 3. Configuration Next.js
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Variables d'environnement production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Port
EXPOSE 3000

# Changer vers user non-root
USER nextjs

# Lancer Next.js en mode production
CMD ["npm", "start"]

# Healthcheck production
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1
