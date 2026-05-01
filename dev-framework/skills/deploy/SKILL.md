---
name: deploy
description: >
  Deploie une application complete sur Dokploy Cloud. Genere les Dockerfiles,
  le workflow GitHub Actions (CI/CD), push sur GitHub, cree le projet Dokploy,
  configure Docker provider (GHCR), env, domaines, health checks, rollback auto,
  cree la DB, deploie et verifie les logs runtime.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, mcp__dokploy__project-all, mcp__dokploy__project-create, mcp__dokploy__project-one, mcp__dokploy__application-create, mcp__dokploy__application-one, mcp__dokploy__application-update, mcp__dokploy__application-deploy, mcp__dokploy__application-redeploy, mcp__dokploy__application-reload, mcp__dokploy__application-stop, mcp__dokploy__application-start, mcp__dokploy__application-saveDockerProvider, mcp__dokploy__application-saveBuildType, mcp__dokploy__domain-create, mcp__dokploy__postgres-create, mcp__ssh-mcp-personal-vps__execute-command, mcp__hostinger__DNS_getDNSRecordsV1, mcp__hostinger__DNS_validateDNSRecordsV1, mcp__hostinger__DNS_updateDNSRecordsV1, mcp__hostinger__domains_getDomainListV1
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif (ex: `./tests-note/docs/prd.md`). Le dossier projet est communique par l'utilisateur ou le workflow parent.

# Deploiement sur Dokploy Cloud (CI/CD)

Deploie le contenu de `dev/` sur Dokploy Cloud. Le dossier `dev/` EST le repo GitHub (backend/ + frontend/ a la racine du repo).

**Architecture CI/CD** : GitHub Actions build les images Docker et les push sur GHCR (GitHub Container Registry). Le VPS ne fait que pull + run — aucun build sur le serveur de prod.

## Prerequisites

> `dev/backend/` et `dev/frontend/` existent avec du code fonctionnel
> `.mcp.json` configure avec `dokploy` et `ssh-mcp-personal-vps`
> L'utilisateur fournit : nom de domaine (ex: `app.mondomaine.fr`)
> Le repo GitHub existe (l'utilisateur fournit l'URL)

## Constantes

### Dokploy Cloud

Recuperer le `serverId` depuis une application existante :

```
Appeler project-all → prendre une app existante → application-one → extraire serverId
```

### Credentials GHCR & Dokploy

Toutes les credentials sont stockees dans `.claude/.env` (gitignore). Lire ce fichier pour obtenir :
- `GHCR_REGISTRY_URL`, `GHCR_USERNAME`, `GHCR_PAT` — Docker provider GHCR
- `DOKPLOY_API_KEY`, `DOKPLOY_URL` — API Dokploy pour le redeploy

---

## Phase 1 — Preparation du code

### 1.1 Dockerfiles

**Backend** (`dev/backend/Dockerfile`) :

```dockerfile
FROM python:3.13-slim

RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

**Points critiques backend :**
- `COPY requirements.txt` (pas `config/requirements.txt`) — le fichier a la racine du backend
- `requirements.txt` doit etre un `pip freeze` complet (pas de versions min, toutes les deps transitives)
- User non-root `appuser`
- Healthcheck sur `/health`

**Frontend** (`dev/frontend/Dockerfile`) :

```dockerfile
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" || exit 1

CMD ["node", "server.js"]
```

**Points critiques frontend :**
- `node:22-slim` (LTS) — PAS node:24 (pas de prebuilt binaries, build lent)
- `ENV HOSTNAME=0.0.0.0` dans le runner — OBLIGATOIRE sinon standalone ecoute sur le hostname container
- `NEXT_PUBLIC_API_URL` en ARG (baked at build time)
- `output: "standalone"` dans `next.config.ts` — OBLIGATOIRE

**Frontend `.dockerignore`** (`dev/frontend/.dockerignore`) :

```
node_modules
.next
.git
*.md
.env*
```

### 1.2 Workflow GitHub Actions (CI/CD)

**IMPORTANT** : C'est le coeur du nouveau process. GitHub Actions build les images et les push sur GHCR. Le VPS ne build plus rien.

Creer `dev/.github/workflows/deploy.yml` :

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  # OWNER is set per-job via lowercase step (GHCR requires lowercase tags)

jobs:
  build-backend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Lowercase owner
        run: echo "OWNER=$(echo '${{ github.repository_owner }}' | tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.OWNER }}/${{ github.event.repository.name }}-backend:latest
            ${{ env.REGISTRY }}/${{ env.OWNER }}/${{ github.event.repository.name }}-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  build-frontend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Lowercase owner
        run: echo "OWNER=$(echo '${{ github.repository_owner }}' | tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: frontend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.OWNER }}/${{ github.event.repository.name }}-frontend:latest
            ${{ env.REGISTRY }}/${{ env.OWNER }}/${{ github.event.repository.name }}-frontend:${{ github.sha }}
          build-args: |
            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: [build-backend, build-frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy backend
        run: |
          curl -s -X POST '${{ secrets.DOKPLOY_URL }}/trpc/application.deploy' \
            -H 'x-api-key: ${{ secrets.DOKPLOY_API_KEY }}' \
            -H 'Content-Type: application/json' \
            -d '{"json":{"applicationId":"${{ secrets.DOKPLOY_BACKEND_ID }}"}}'

      - name: Wait for backend
        run: sleep 30

      - name: Deploy frontend
        run: |
          curl -s -X POST '${{ secrets.DOKPLOY_URL }}/trpc/application.deploy' \
            -H 'x-api-key: ${{ secrets.DOKPLOY_API_KEY }}' \
            -H 'Content-Type: application/json' \
            -d '{"json":{"applicationId":"${{ secrets.DOKPLOY_FRONTEND_ID }}"}}'
```

**Secrets GitHub a configurer** (via `gh secret set` depuis `dev/`) :

```bash
gh secret set DOKPLOY_URL -b "https://app.dokploy.com/api"
gh secret set DOKPLOY_API_KEY -b "{DOKPLOY_API_KEY}"
gh secret set DOKPLOY_BACKEND_ID -b "{backend_applicationId}"
gh secret set DOKPLOY_FRONTEND_ID -b "{frontend_applicationId}"
gh secret set NEXT_PUBLIC_API_URL -b "https://{domain_api}"
```

**GITHUB_TOKEN** est fourni automatiquement par GitHub Actions — pas besoin de le configurer.

### 1.3 run.sh (dev local)

**Backend** (`dev/backend/run.sh`) :

```bash
#!/bin/bash
SSH_HOST="root@{VPS_IP}"
LOCAL_PORT=5454
REMOTE_PORT=5454

echo "Opening SSH tunnel to PostgreSQL..."
ssh -f -N -L $LOCAL_PORT:localhost:$REMOTE_PORT $SSH_HOST

cleanup() {
    echo "Closing SSH tunnel..."
    pkill -f "ssh -f -N -L $LOCAL_PORT:localhost:$REMOTE_PORT"
}
trap cleanup EXIT INT TERM

echo "Starting FastAPI..."
source .venv/bin/activate
python -m app.api.main
```

### 1.4 Git push

Le repo Git est dans `dev/` (PAS a la racine du projet). Le repo contient `backend/`, `frontend/` et `.github/` a sa racine.

**Verifier si un repo GitHub existe deja** :
```bash
cd dev/
git remote -v 2>/dev/null
```

**Si repo existe deja** (remote `origin` present) — ajouter les fichiers deploy et push :
```bash
git add backend/ frontend/ .github/
git commit -m "Add deployment configuration"
git push
```

**Si pas de repo** — en creer un :
```bash
git init
gh repo create {repo_name} --private --source=. --push
git add backend/ frontend/ .github/
git commit -m "Initial commit with deployment"
git push -u origin main
```

**IMPORTANT** : Ne pas oublier `.github/` dans le `git add` — sans ca, le workflow CI/CD ne sera pas declenche.

---

## Phase 2 — Configuration Dokploy

### 2.1 Creer le projet

```
project-create(name: "{APP_NAME}", description: "{description}")
-> Recuperer projectId + environmentId
```

### 2.2 Creer les applications

**OBLIGATOIRE** : passer `serverId` sur Dokploy Cloud, sinon erreur "Authentication failed" (trompeuse).

**OBLIGATOIRE** : passer `appName` pour avoir des noms de services Docker lisibles (sinon Dokploy genere un nom aleatoire type `app-hack-wireless-program-u93hom`).

Convention : `{projet}-backend` et `{projet}-frontend` (ex: `notes-app-backend`, `notes-app-frontend`). Pas de caracteres speciaux, que des minuscules et tirets.

```
application-create(name: "backend", appName: "{projet}-backend", environmentId: {envId}, serverId: {serverId})
application-create(name: "frontend", appName: "{projet}-frontend", environmentId: {envId}, serverId: {serverId})
-> Recuperer les 2 applicationId
```

### 2.3 Configurer le Docker provider (GHCR)

**C'est ici que ca change** : on ne connecte plus GitHub comme source. On configure un Docker provider qui pull depuis GHCR.

```
Pour chaque app :
  application-saveDockerProvider(
    applicationId: {appId},
    dockerImage: "ghcr.io/chugyy/{REPO_NAME}-{backend|frontend}:latest",
    registryUrl: "ghcr.io",
    username: "Chugyy",
    password: "{GHCR_PAT}"
  )
```

Puis changer le source type :

```
application-update(
  applicationId: {appId},
  sourceType: "docker"
)
```

### 2.4 Configurer Swarm (health check + rollback + zero-downtime)

**IMPORTANT** : C'est ce qui empeche les crash loops et garantit le zero-downtime.

```
Pour chaque app, via application-update :

Backend :
  networkSwarm: [{"Target": "db-network"}, {"Target": "dokploy-network"}]
  healthCheckSwarm: {"Test": ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\" || exit 1"], "Interval": 30000000000, "Timeout": 10000000000, "Retries": 3, "StartPeriod": 40000000000}
  updateConfigSwarm: {"Parallelism": 1, "Order": "start-first", "FailureAction": "rollback", "Monitor": 30000000000}
  rollbackConfigSwarm: {"Parallelism": 1, "Order": "stop-first", "FailureAction": "pause"}
  restartPolicySwarm: {"Condition": "on-failure", "MaxAttempts": 3, "Delay": 10000000000, "Window": 120000000000}

Frontend :
  networkSwarm: [{"Target": "dokploy-network"}]
  healthCheckSwarm: {"Test": ["CMD-SHELL", "node -e \"fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\" || exit 1"], "Interval": 30000000000, "Timeout": 10000000000, "Retries": 3, "StartPeriod": 40000000000}
  updateConfigSwarm: {"Parallelism": 1, "Order": "start-first", "FailureAction": "rollback", "Monitor": 30000000000}
  rollbackConfigSwarm: {"Parallelism": 1, "Order": "stop-first", "FailureAction": "pause"}
  restartPolicySwarm: {"Condition": "on-failure", "MaxAttempts": 3, "Delay": 10000000000, "Window": 120000000000}
```

**Explication des valeurs Swarm** (en nanosecondes) :
- `Interval: 30000000000` = 30s entre chaque health check
- `Timeout: 10000000000` = 10s max par health check
- `StartPeriod: 40000000000` = 40s de grace au demarrage (temps pour que l'app boot)
- `Monitor: 30000000000` = 30s d'observation apres deploy avant de valider
- `MaxAttempts: 3` = max 3 tentatives de restart avant d'abandonner (plus de crash loop infini)
- `FailureAction: "rollback"` = si le health check echoue, revenir a la version precedente

### 2.5 Configurer les variables d'environnement

```
Backend (via application-update, champ "env") :
  APP_NAME={app_name}
  DEBUG=false
  HOST=0.0.0.0
  PORT=8000
  PRODUCTION=true
  DB_HOST=postgres-unified
  DB_PORT=5432
  DB_NAME={db_name}
  DB_USER=postgres
  DB_PASSWORD={db_password}
  FRONTEND_URL=https://{domain_frontend}
  {autres variables selon le projet}

Frontend (via application-update, champ "env") :
  env: "HOSTNAME=0.0.0.0"
```

**IMPORTANT env format** : Le MCP `saveEnvironment` retourne 400 systematiquement — NE PAS l'utiliser.

**CRITIQUE — NE PAS utiliser `application-update` MCP pour les env vars.** Le tool call MCP serialise les `\n` comme des literaux `\\n`, ce qui fait que Swarm recoit UNE SEULE variable geante au lieu de variables separees. Le backend ne peut alors lire aucune variable.

**Methode validee** : passer par `curl` direct sur l'API tRPC Dokploy (via SSH MCP ou Bash) avec de vrais `\n` dans le JSON :

```bash
curl -s -X POST '{DOKPLOY_URL}/trpc/application.update' \
  -H 'x-api-key: {DOKPLOY_API_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{"json":{"applicationId":"{appId}","env":"VAR1=value1\nVAR2=value2\nVAR3=value3"}}'
```

Verifier apres deploy que Swarm a bien des variables separees :
```bash
docker service inspect {appName} --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d), 'entries')"
# Doit afficher N entries (pas 1)
```

**Apres chaque modification d'env vars, TOUJOURS redeploy** (`application-deploy`) sinon les changements ne sont pas appliques au service Swarm.

**NOTE** : `NEXT_PUBLIC_API_URL` n'est plus dans les env Dokploy du frontend. Il est injecte au build time via le `build-args` du workflow GitHub Actions (secret `NEXT_PUBLIC_API_URL`). C'est plus propre : la valeur est bakee dans l'image, pas lue au runtime.

### 2.6 Configurer les domaines

```
Pour chaque app :
  domain-create(
    host: "{subdomain}.{domain}",
    https: true,
    certificateType: "letsencrypt",
    stripPath: false,
    applicationId: {appId},
    domainType: "application",
    port: {8000 pour backend, 3000 pour frontend},
    path: "/"
  )
```

Convention de nommage :
- Frontend : `{app}.{domain}` (ex: `info-flash.multimodal-house.fr`)
- Backend : `{app}-api.{domain}` (ex: `info-flash-api.multimodal-house.fr`)

**DNS** : configure automatiquement via le MCP Hostinger (Phase 4.5). Plus besoin de rappeler a l'utilisateur.

### 2.7 Configurer les GitHub Secrets

Apres avoir cree les apps Dokploy et recupere les `applicationId`, configurer les secrets du repo :

```bash
cd dev/
gh secret set DOKPLOY_URL -b "https://app.dokploy.com/api"
gh secret set DOKPLOY_API_KEY -b "${DOKPLOY_API_KEY}"
gh secret set DOKPLOY_BACKEND_ID -b "{backend_applicationId}"
gh secret set DOKPLOY_FRONTEND_ID -b "{frontend_applicationId}"
gh secret set NEXT_PUBLIC_API_URL -b "https://{domain_api}"
```

---

## Phase 3 — Base de donnees

### 3.1 Creer la DB sur postgres-unified

Via SSH MCP :

```
docker exec $(docker ps -q -f name=postgres-unified) psql -U postgres -c "CREATE DATABASE \"{db_name}\";"
```

Les migrations s'executent automatiquement au premier demarrage du backend (via `init_db()` dans le lifespan).

---

## Phase 3.5 — Pre-deploy checks

### 3.5.1 Verifier le load serveur

Verifier que le VPS est dans un etat sain. Le deploy ne build plus rien sur le VPS (juste un pull), donc c'est moins critique qu'avant, mais ca reste une bonne pratique.

```bash
uptime  # load average doit etre < 5 (pas de build local, seuil plus bas)
```

### 3.5.2 Nettoyer les orphelins apres suppression d'un projet

Quand on supprime un projet Dokploy, **3 types d'orphelins** restent sur le VPS :

#### A. Services Docker Swarm

```bash
docker service ls
# Comparer avec les apps dans Dokploy (via API project-all)
# Tout service sans app correspondante = orphelin
docker service rm {service_name}
```

#### B. Configs Traefik (CRITIQUE)

Les fichiers `.yml` dans `/etc/dokploy/traefik/dynamic/` ne sont PAS supprimes. Si un nouveau projet reutilise le meme domaine, Traefik aura **deux routes pour le meme domaine** -> l'ancienne (service mort) prend le dessus -> 502 Bad Gateway.

```bash
# Lister les configs Traefik
ls /etc/dokploy/traefik/dynamic/

# Supprimer les configs de l'ancien projet
rm /etc/dokploy/traefik/dynamic/{ancien_appName}.yml

# Recharger Traefik
docker kill -s HUP dokploy-traefik
```

#### C. Docker proxy orphelins (ports bloques)

Si postgres-unified ou un autre service ne demarre plus avec "address already in use", un docker-proxy orphelin tient le port.

```bash
lsof -i :{port}    # trouver le PID
kill {PID}          # liberer le port
docker service update --force {service_name}
```

**ATTENTION** :
- **JAMAIS `docker kill $(docker ps -q)`** — ca kill TOUS les containers y compris Traefik (qui est un container standalone, pas un service Swarm, et ne revient pas tout seul)
- **TOUJOURS cibler par nom** : `docker service rm {nom_exact}`
- **Les volumes sont separes des containers** — supprimer un service ne supprime pas les donnees

### 3.5.3 Verifier que postgres-unified tourne

```bash
docker service ls | grep postgres-unified
# Doit etre X/X (pas 0/X)
```

Si `0/X` : attendre ou `docker service update --force postgres-unified`.

---

## Phase 4 — Deploiement

### 4.1 Premier deploiement (initial)

Le premier deploy est declenche manuellement via l'API Dokploy (le workflow GitHub Actions le fera automatiquement par la suite).

**Deployer sequentiellement** (1 seul deploy a la fois par serveur — contrainte Inngest) :

```
1. application-deploy(applicationId: {backend_id})
2. Attendre status "done" via polling (Phase 5.1)
3. application-deploy(applicationId: {frontend_id})
4. Attendre status "done" via polling (Phase 5.1)
```

### 4.2 Deploys suivants (automatiques)

Apres le premier deploy, le workflow GitHub Actions gere tout :

```
git push sur main
  -> GitHub Actions build les images (backend + frontend en parallele)
  -> Push sur GHCR
  -> Appel API Dokploy pour redeploy (sequentiel : backend puis frontend)
  -> Dokploy pull les nouvelles images depuis GHCR
  -> Swarm fait un rolling update (start-first = zero-downtime)
  -> Si health check echoue -> rollback auto a l'image precedente
```

### 4.3 Si un deploiement ne demarre pas

L'API renvoie `true` mais rien ne se passe = queue Inngest bloquee.

**Causes** :
- Un ancien deploy n'a jamais termine (orphelin d'un projet supprime)
- Services Docker orphelins sur le VPS

**Solutions** (dans l'ordre) :
1. Verifier le load (`uptime`)
2. Nettoyer les services Docker orphelins (voir Phase 3.5.2)
3. Verifier sur le dashboard Dokploy s'il y a un deploy "running" bloque -> le cancel
4. Attendre 5-10 min (Inngest peut avoir un timeout interne qui libere le slot)

### 4.4 Verifier les runtime logs

Apres un deploy reussi, verifier que le container demarre correctement via SSH MCP :

```bash
docker service logs {appName} --tail 20
```

**Backend OK** = `INFO: Uvicorn running on http://0.0.0.0:8000` + `Database initialized`
**Frontend OK** = `Ready in Xs` + ecoute sur `0.0.0.0:3000`

**Erreurs frequentes** :
- `ModuleNotFoundError` -> dependance manquante dans requirements.txt (faire `pip freeze`)
- Frontend ecoute sur hostname container -> `ENV HOSTNAME=0.0.0.0` manquant dans Dockerfile
- Child processes die -> erreur d'import ou de config (lire les logs complets)
- Container restart en boucle -> Swarm va rollback apres 3 tentatives (grace a `restartPolicySwarm`)
- Workers Uvicorn die silencieusement -> lancer avec `--workers 1` (via `application.update` champ `command`) pour voir l'erreur
- `.env` au mauvais endroit -> Dokploy cree `.env` dans le workdir du container. `config.py` doit chercher le `.env` a la racine aussi (`pathlib.Path(__file__).parent.parent / ".env"`)
- 502 Bad Gateway -> configs Traefik orphelines d'un ancien projet supprime (voir Phase 3.5.2.B)

### 4.5 Apres un fix qui necessite un rebuild

```
1. Corriger le code localement
2. git add + commit + push
3. GitHub Actions rebuild + push sur GHCR + trigger redeploy automatiquement
```

Pas besoin d'intervention manuelle. Si le push a ete fait mais que le workflow n'a pas tourne, verifier l'onglet Actions sur GitHub.

**Lexique des commandes Dokploy** :
- `deploy` = pull la derniere image depuis GHCR + restart le service (avec rolling update)
- `redeploy` = meme chose que deploy (plus de distinction build/no-build en mode Docker)
- `reload` = PAS de pull, juste restart le service (force Swarm a recreer le container avec la meme image)
- `start` / `stop` = demarre/arrete le service sans pull

---

## Phase 4.5 — DNS automatique (Hostinger)

Configurer les records DNS automatiquement via le MCP Hostinger. Le VPS IP est recuperable depuis `application-one` -> `server.ipAddress`.

### 4.5.1 Lister les domaines disponibles

```
mcp__hostinger__domains_getDomainListV1()
-> Proposer a l'utilisateur les domaines actifs
-> L'utilisateur choisit le domaine + les sous-domaines
```

Convention :
- Frontend : `{app}.{domain}` (ex: `notes.multimodal.digital`)
- Backend : `{app}-api.{domain}` (ex: `notes-api.multimodal.digital`)

### 4.5.2 Valider puis appliquer les records

```
# 1. Valider d'abord (dry-run)
mcp__hostinger__DNS_validateDNSRecordsV1(
  domain: "{domain}",
  overwrite: false,
  zone: [
    {"name": "{app}-api", "type": "A", "ttl": 3600, "records": [{"content": "{VPS_IP}"}]},
    {"name": "{app}", "type": "A", "ttl": 3600, "records": [{"content": "{VPS_IP}"}]}
  ]
)

# 2. Si validation OK -> appliquer
mcp__hostinger__DNS_updateDNSRecordsV1(
  domain: "{domain}",
  overwrite: false,
  zone: [
    {"name": "{app}-api", "type": "A", "ttl": 3600, "records": [{"content": "{VPS_IP}"}]},
    {"name": "{app}", "type": "A", "ttl": 3600, "records": [{"content": "{VPS_IP}"}]}
  ]
)
```

**IMPORTANT** : `overwrite: false` pour ne pas toucher aux records existants (email, etc.). Les nouveaux records sont ajoutes.

### 4.5.3 Verifier la propagation

```bash
# Via SSH sur le VPS
dig +short {app}-api.{domain}
dig +short {app}.{domain}
```

La propagation DNS peut prendre 5-30 min. Les certificats SSL (Let's Encrypt via Traefik) se generent automatiquement une fois le DNS propage.

---

## Phase 5 — Verification post-deploy automatique

### 5.1 Polling du statut applicatif

Apres chaque `application-deploy`, boucler sur `application-one` pour verifier le statut.

```
Boucle (max 12 iterations, 10s entre chaque = 2 min max) :
  result = application-one(applicationId: {appId})
  status = result.applicationStatus

  Si status == "done" -> SUCCES, continuer
  Si status == "error" -> ECHEC, lire les logs (docker service logs via SSH)
  Si status == "running" ou "idle" -> attendre 10s, retry
```

### 5.2 Verification runtime via SSH

Apres status "done", verifier que le container tourne effectivement :

```bash
# Services en ligne
docker service ls | grep {appName}
# Doit afficher X/X replicas (pas 0/X)

# Logs runtime (20 dernieres lignes)
docker service logs {appName} --tail 20 2>&1
# Backend OK = "Uvicorn running on http://0.0.0.0:8000"
# Frontend OK = "Ready in Xs"
```

### 5.3 Verification endpoints

```bash
# Depuis le VPS (bypass DNS)
curl -s -o /dev/null -w "%{http_code}" http://localhost:{port}/health  # backend
curl -s -o /dev/null -w "%{http_code}" http://localhost:{port}          # frontend
```

Si les containers tournent mais les endpoints ne repondent pas -> lire les logs complets (`docker service logs {appName} --tail 100`).

### 5.4 Presenter le recapitulatif

```
Deploiement termine

Projet : {APP_NAME}
Backend : https://{domain_api} (status: {status})
Frontend : https://{domain_frontend} (status: {status})
DB : {db_name} sur postgres-unified

GitHub : {repo_url}
GHCR : ghcr.io/chugyy/{repo_name}-backend:latest
        ghcr.io/chugyy/{repo_name}-frontend:latest
CI/CD : GitHub Actions (auto-deploy on push to main)
Dokploy : https://app.dokploy.com/dashboard/project/{projectId}

Protection :
  Health checks : actifs (30s interval, 3 retries)
  Rollback auto : actif (si health check echoue)
  Zero-downtime : actif (start-first)
  Max restarts : 3 tentatives avant abandon

DNS :
  {domain_api} -> A -> {VPS_IP} (configure automatiquement)
  {domain_frontend} -> A -> {VPS_IP} (configure automatiquement)
  Propagation : 5-30 min, SSL auto via Let's Encrypt
```

---

## Resume des pieges Dokploy Cloud

| Piege | Solution |
|-------|----------|
| `application-create` fail "Auth error" | Passer `serverId` (obligatoire sur Cloud) |
| `saveEnvironment` fail 400 via MCP | NE PAS utiliser. Passer par `curl` direct sur l'API tRPC (voir Phase 2.5) |
| `application-update` MCP corrompt les env vars | Le tool call serialise `\n` en `\\n` litteral → Swarm recoit 1 variable geante. **Toujours utiliser `curl` direct** pour les env vars (avril 2026) |
| Env vars modifiees mais pas appliquees | TOUJOURS `application-deploy` apres modification des env vars |
| `network not found` a la creation du service | Verifier `docker network ls` sur le VPS cible. Ne pas copier `db-network` si le VPS n'a pas postgres-unified |
| Deploy renvoie 200 mais rien ne se passe | Queue Inngest bloquee — verifier services orphelins sur VPS, attendre |
| Deploy renvoie 200, pas de log cree, `serverStatus: "inactive"` | **Paiement Dokploy Cloud non passe.** Verifier l'abonnement sur app.dokploy.com → Billing. Le serveur devient inactif quand le paiement echoue — tous les deploys sont acceptes par l'API mais silencieusement ignores |
| 1 seul deploy a la fois par serveur | By design (Inngest `limit: 1` par `serverId`). Deployer sequentiellement |
| Frontend ecoute sur hostname container | `ENV HOSTNAME=0.0.0.0` dans Dockerfile runner stage |
| Image GHCR non trouvee par Dokploy | Verifier `dockerImage`, `registryUrl`, `username`, `password` dans `saveDockerProvider` |
| Health check echoue au premier deploy | Normal si `StartPeriod` trop court — augmenter a 60s si l'app met du temps a boot |
| Rollback alors que la nouvelle version est correcte | Health check trop agressif — augmenter `Timeout` ou `Retries` |
| `node:24` build tres lent dans GitHub Actions | Utiliser `node:22-slim` (LTS, prebuilt binaries) |
| `requirements.txt` incomplet | Toujours utiliser `pip freeze` complet |
| Suppression projet ne supprime pas les services Docker | `docker service rm {orphan}` via SSH |
| Suppression projet ne supprime pas les configs Traefik | `rm /etc/dokploy/traefik/dynamic/{orphan}.yml` + `docker kill -s HUP dokploy-traefik` |
| 502 Bad Gateway alors que l'app tourne | Configs Traefik orphelines d'un ancien projet -> meme domaine, deux routes, Traefik prend la morte |
| Traefik disparait apres kill containers | Traefik = container standalone, PAS un service Swarm. Relancer manuellement (voir ci-dessous) |
| `.env` au mauvais endroit | `config.py` doit aussi chercher a la racine |
| Workers Uvicorn meurent silencieusement | Passer `--workers 1` via `application.update` champ `command` pour voir l'erreur |
| GitHub Actions workflow pas declenche | Verifier que `.github/workflows/` est bien dans le repo (git add) |
| GHCR push echoue dans GitHub Actions | Verifier `permissions: packages: write` dans le workflow |
| GHCR tags "repository name must be lowercase" | `github.repository_owner` preserve la casse. Ajouter step `Lowercase owner` dans chaque job (deja dans le template) |
| Postgres password auth failed via reseau overlay | Le password interne peut etre desynchronise. Faire `ALTER USER postgres WITH PASSWORD '...'` via `docker exec` |

## Restaurer Traefik (si disparu)

Traefik est un container standalone (`--restart always`), PAS un service Swarm. Si kille, il faut le recreer manuellement :

```bash
docker rm -f dokploy-traefik 2>/dev/null
docker run -d \
  --name dokploy-traefik \
  --restart always \
  -v /etc/dokploy/traefik/traefik.yml:/etc/traefik/traefik.yml \
  -v /etc/dokploy/traefik/dynamic:/etc/dokploy/traefik/dynamic \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 443:443 \
  -p 80:80 \
  -p 443:443/udp \
  traefik:v3.6.7
docker network connect dokploy-network dokploy-traefik
docker network connect db-network dokploy-traefik
```

## Regles de securite

1. **JAMAIS `docker kill $(docker ps -q)`** — ca kill Traefik (standalone, ne revient pas) + tous les autres projets
2. **TOUJOURS cibler par nom** quand on supprime/kill un service ou container
3. **Verifier le load avant de deployer** — meme si le VPS ne build plus, un serveur surcharge peut rater le pull
4. **Apres suppression d'un projet Dokploy**, nettoyer 3 choses : services Docker + configs Traefik + docker-proxy orphelins
5. **Les volumes survivent aux kills/rm** — les donnees sont safe
6. **Traefik = container standalone** — si il disparait, le recreer manuellement (voir section ci-dessus)
7. **Ne jamais committer de secrets** dans le repo — utiliser `gh secret set` pour les GitHub Secrets
