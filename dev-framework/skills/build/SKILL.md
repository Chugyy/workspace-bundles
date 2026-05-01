---
name: build
description: >
  Genere le code couche par couche. Detecte ce qui est necessaire (backend, frontend, ou les deux).
  Backend : DB, CRUD, services, utils, jobs, API, review.
  Frontend : setup/branding, services TS, composants, shell.
  Tests cibles par couche.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Task
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif.

# Build — De l'architecture au code

Le build est un orchestrateur. Il detecte ce qui est necessaire et execute les couches pertinentes dans l'ordre. Chaque couche est un agent isole avec son propre contexte minimal.

---

## Prerequis

Verifier ce qui existe pour determiner les tracks a executer :

| Si present | Track |
|-----------|-------|
| `docs/architecture/configs/db.json` | Backend : DB + CRUD |
| `docs/architecture/configs/jobs-*.json` | Backend : Jobs + Utils |
| `../lib/*/` avec type research OU `.claude/resources/researches/*.md` | Backend : Services |
| `docs/architecture/configs/routes-*.json` | Backend : API Routes |
| `docs/architecture/frontend-architecture.md` | Frontend |

Si AUCUN config n'existe → STOP → proposer de lancer les skills d'architecture d'abord.

---

## Phase 0 — Setup infrastructure

```bash
python .claude/resources/scripts/setup-infrastructure.py \
  --app-name {app_name} \
  --backend-path {project}/dev/backend \
  --frontend-path {project}/dev/frontend \
  --shadcn-preset {preset_code}
```

Le `--shadcn-preset` vient de `frontend-architecture.md` (section Branding).
Sans preset, le script utilise `vega` par defaut.

| Style | Usage | Code |
|-------|-------|------|
| vega | Classique, equilibre (defaut) | `bIkeymG` |
| luma | Arrondi, soft | `b1VlIttI` |
| lyra | Sharp, monospace | `buFznsW` |
| mira | Compact, data-dense | `b1D0eCA4` |

### Credentials

Les credentials sont dans `docs/.env` (genere par `/research`).
Le setup copie ce fichier dans `dev/backend/.env`.
Si absent ou incomplet, demander a l'utilisateur.

### GitHub — Init repo (checkpoint)

> Tu veux creer un repo GitHub maintenant ? Ca permet d'avoir un point de retour des le debut du build.

Si oui :
```bash
cd {project}/dev && git init && gh repo create {repo_name} --private --source=. --push
```

---

## Track Backend

### Couche 1 — Setup + DB + Migrations

**Quand** : `db.json` et `assembly.json` existent
**Agent** : `generate-database` (Sonnet)
**Rules chargees** : `best-practises-build-databases/`
**Inputs** : `schema.md`, `db.json`, `assembly.json`

```python
import sys
sys.path.insert(0, '.claude/resources/scripts')
from generators import build_backend_from_configs
from pathlib import Path

build_backend_from_configs(
    configs_path=Path('{project}/docs/architecture/configs'),
    backend_path=Path('{project}/dev/backend')
)
```

Execute dans l'ordre :
1. `generate_config()` — `.env` + `config.py` depuis `assembly.json`
2. `generate_db()` — `models.py` + `001_initial_schema.sql` depuis `db.json`
3. `generate_crud()` — `crud/{entity}.py` + tests depuis chaque `crud-*.json`
4. `generate_routes()` — `models/{entity}.py` + `routes/{entity}.py` + tests depuis chaque `routes-*.json`
5. `generate_job_skeletons()` — `jobs/{entity}.py` squelettes depuis chaque `jobs-*.json`
6. `generate_service_skeletons()` — `services/{name}.py` squelettes depuis `services.json`
7. `generate_assembly()` — `main.py`, `models/__init__.py`, `conftest.py`, `pyproject.toml`

Post-scripts : migration + tests CRUD/routes :
```bash
cd {project}/dev/backend
psql -U {db_user} -d {db_name} -f app/database/migrations/001_initial_schema.sql
source .venv/bin/activate && python -m pytest tests/test_crud/ tests/test_routes/ -v 2>&1 | head -100
```

Si tests passent → couche suivante.
Si erreurs → auto-fix (max 3 tentatives).

---

### Couche 2 — CRUD (si pas deja genere par les scripts)

**Quand** : `crud-*.json` existent et les scripts n'ont pas couvert tous les cas
**Agent** : `build-crud` (Sonnet, 1 par entite, parallele)
**Rules chargees** : `best-practises-business-logic/` (section CRUD uniquement)
**Inputs** : `schema.md`, `configs/crud-{entity}.json`

Apres chaque agent, tester :
```bash
python -m pytest tests/test_crud/test_{entity}.py -v
```

---

### Couche 3 — Services

**Quand** : des services externes sont identifies (recherches existent)
**Agent** : `build-service` (Opus, 1 par service, parallele)
**Rules chargees** : aucune — le document de recherche EST la spec
**Inputs** : `../lib/{service}/` ou `.claude/resources/researches/{service}.md`

```
Pour chaque service :
  Agent(build-service, prompt="
    service_name: {service}
    backend_path: dev/backend
    research_path: {path_to_research}
    Le squelette existe — remplir l'implementation reelle.
    Lire config.py EN PREMIER.
  ")
```

Apres chaque agent, tester :
```bash
python -m pytest tests/test_services/test_{service}.py -v
```

---

### Couche 4 — Utils puis Jobs

**Utils d'abord** (parallele, 1 par entite) :

**Quand** : des utils sont mentionnes dans `jobs-*.json`
**Agent** : `build-utils` (Sonnet, 1 par entite)
**Rules chargees** : `best-practises-business-logic/`
**Inputs** : `docs/architecture/business-logic/{entity}.md`, `configs/jobs-{entity}.json`

```
Pour chaque entite ayant des utils :
  Agent(build-utils, prompt="
    entity: {entity}
    architecture_path: docs/architecture
    backend_path: dev/backend
  ")
```

Tester :
```bash
python -m pytest tests/test_utils/test_{entity}.py -v
```

**Jobs ensuite** (parallele, 1 par entite) — apres que utils soient termines :

**Quand** : `jobs-*.json` existent
**Agent** : `build-jobs` (Sonnet, 1 par entite)
**Rules chargees** : `best-practises-business-logic/`
**Inputs** : `configs/jobs-{entity}.json` + code CRUD et services produit aux couches precedentes

```
Pour chaque entite ayant des jobs :
  Agent(build-jobs, prompt="
    entity: {entity}
    backend_path: dev/backend
    Le squelette existe dans jobs/{entity}.py — remplir les fonctions.
    Les jobs appellent les vrais CRUD, services et utils — PAS de mock.
    Lire le code existant AVANT.
  ")
```

Tester :
```bash
python -m pytest tests/test_jobs/test_{entity}.py -v
```

---

### Couche 5 — API Routes

**Quand** : `routes-*.json` existent et les routes n'ont pas ete entierement generees par les scripts
**Agent** : `build-routes` (Sonnet, 1 par entite, parallele)
**Rules chargees** : `best-practises-build-api/`
**Inputs** : `docs/architecture/api/{entity}.md`, `configs/routes-{entity}.json`, code jobs

Apres chaque agent, tester :
```bash
python -m pytest tests/test_routes/test_{entity}.py -v
```

---

### Couche 6 — Review backend

**Quand** : toujours, apres toutes les couches backend
**Agent** : `review-backend-logic` (Sonnet)
**Rules chargees** : `best-practises-business-logic/` (toutes les sections)
**Inputs** : tout le code backend produit

L'agent scanne `core/` (jobs, utils, services) et detecte :
- **Critiques** : SQL dans jobs, logique pure dans jobs, jobs trop larges, entites a combiner, code duplique
- **Warnings** : wrappers inutiles, redondances, suffixes de couche

Corrections :
- < 5 fixes → l'agent principal corrige directement
- 5+ fixes → deleguer a un agent Sonnet dedie
- Ambiguite architecturale → proposer a l'utilisateur

Re-tester les fichiers modifies :
```bash
python -m pytest tests/test_jobs/ tests/test_utils/ -v
```

---

## Track Frontend

### Couche F1 — Setup + Branding

**Quand** : `frontend-architecture.md` existe
**Agent** : aucun (script `setup-infrastructure.py` + ajustements manuels)
**Rules chargees** : `best-practises-build-frontend/design-system-tailwind.md`, `colors-and-theming.md`, `typography-fonts.md`

Le script Phase 0 a deja installe shadcn avec le bon preset. Cette couche :
1. Verifie que le preset correspond a `frontend-architecture.md`
2. Applique les couleurs custom si definies dans le branding
3. Configure les fonts (Outfit + Caveat ou custom)
4. Verifie les spacing tokens dans `globals.css`

---

### Couche F2 — Services TypeScript (backend du frontend)

**Quand** : des endpoints API existent (code backend ou docs API)
**Agent** : `build-entity-frontend` (Sonnet, 1 par entite, parallele)
**Rules chargees** : aucune (c'est du TypeScript pur, pas de styling)
**Inputs** : `docs/architecture/api/{entity}.md` ou code backend `routes/{entity}.py`

Chaque agent genere pour son entite :
- `src/services/{entity}/types.ts` — interfaces TypeScript
- `src/services/{entity}/api.ts` — service API avec `apiFetch`
- `src/hooks/use-{entity}.ts` — hooks React Query (list, get, create, update, delete)

```
Pour chaque entite :
  Agent(build-entity-frontend, prompt="
    MODE: services-only
    entity: {entity}
    api_path: docs/architecture/api/{entity}.md
    frontend_path: dev/frontend
    Generer UNIQUEMENT types.ts, api.ts, et le hook use-{entity}.ts.
    PAS de composants UI a cette etape.
  ")
```

---

### Couche F3 — Composants UI

**Quand** : services TS generes + `frontend-architecture.md` existe
**Agent** : `build-entity-frontend` (Sonnet, 1 par entite, parallele)
**Rules chargees** : `best-practises-build-frontend/erreurs-courantes.md`, `checklist-validation.md`
**Inputs** : `frontend-architecture.md` + services TS generes a F2

Chaque agent genere pour son entite :
- `src/components/{entity}/*.tsx` — composants specifiques (forms, tables, cards, modals)

```
Pour chaque entite :
  Agent(build-entity-frontend, prompt="
    MODE: components-only
    entity: {entity}
    frontend_arch_path: docs/architecture/frontend-architecture.md
    frontend_path: dev/frontend

    REGLES STRICTES A RESPECTER :
    - Chercher Origin UI (MCP origin-ui) AVANT de creer un composant
    - Priorite : shadcn > registry tiers > Origin UI > compose > custom
    - Colors UNIQUEMENT via tokens semantiques : bg-primary, text-foreground, bg-card
    - JAMAIS de raw colors : bg-blue-500, text-black, bg-white, hex
    - Spacing UNIQUEMENT via gap-* : gap-component, gap-section
    - JAMAIS space-y-*, space-x-*, mb-*, mt-*
    - className sur shadcn = layout UNIQUEMENT : flex, grid, w-full
    - Dark mode automatique via CSS variables, JAMAIS dark: prefix
    - Composer les primitives : Card > CardHeader > CardTitle, pas bg-white rounded-lg p-8
  ")
```

---

### Couche F4 — Shell (layout, pages, routing)

**Quand** : composants generes + `frontend-architecture.md` existe
**Agent** : `build-frontend-shell` (Sonnet, 1 seul)
**Rules chargees** : `best-practises-build-frontend/erreurs-courantes.md`, `checklist-validation.md`
**Inputs** : `frontend-architecture.md` + composants generes a F3

Genere :
- `src/app/layout.tsx` — Root layout avec Providers
- `src/app/page.tsx` — Homepage
- `src/app/{entities}/page.tsx` — Pages liste
- `src/app/{entities}/[id]/page.tsx` — Pages detail
- `src/components/layout/sidebar.tsx` — Navigation
- `src/components/layout/header.tsx` — Header
- `src/lib/providers.tsx` — React Query + Theme providers
- `src/middleware.ts` — Protection routes (si auth)

```
Agent(build-frontend-shell, prompt="
  frontend_arch_path: docs/architecture/frontend-architecture.md
  frontend_path: dev/frontend

  REGLES STRICTES :
  - p-page token sur main (JAMAIS p-6 ou p-8)
  - Utiliser PageContainer, PageHeader, PageTitle, PageActions
  - 'use client' uniquement quand necessaire
  - Server Components par defaut
  - Suspense boundaries pour useSearchParams()
  - Middleware DOIT exclure /api, /login, /register
")
```

---

## Phase 5 — Tests finaux

### 5.1 Backend — Tests complets

```bash
cd dev/backend && source .venv/bin/activate && python -m pytest -v 2>&1 | head -150
```

Si erreurs → auto-fix (max 3 tentatives).

### 5.2 Frontend — Build

```bash
cd dev/frontend && npm install && npm run build 2>&1 | head -50
```

Si erreurs → auto-fix (max 3 tentatives).

### 5.3 Seed data

Generer `dev/backend/seed.py` adaptatif selon le PRD + schema :

1. Lire le PRD → identifier les roles (admin, user, owner...) ou leur absence
2. Lire le schema → tables, contraintes, FK obligatoires
3. Generer le script avec le strict minimum pour que l'app soit utilisable

| Cas | Seed |
|-----|------|
| Pas d'auth, juste un mot de passe admin | 1 entry config/settings avec mot de passe hashe |
| Auth simple sans roles | 1 user de test |
| Auth avec roles | 1 user par role defini dans le PRD |
| Entites avec FK obligatoires | Donnees minimales pour satisfaire les FK |

```bash
cd dev/backend && source .venv/bin/activate && python seed.py
```

### 5.4 Backend — Tests d'integration

```bash
# Detecter le host de previsualisation (IP publique sur VPS, localhost sur Mac)
PREVIEW_HOST=$(python3 ../../lib/detect-env.py --json | python3 -c "import sys,json; print(json.load(sys.stdin)['preview_host'])")

cd dev/backend && source .venv/bin/activate && uvicorn app.main:app --port 8000 &
sleep 3
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
curl -s http://localhost:8000/api/{entity} -H "Authorization: Bearer {token}"
kill %1

echo "Backend accessible sur : http://${PREVIEW_HOST}:8000"
```

### 5.5 Frontend — Tests E2E (Playwright MCP)

```bash
cd dev/backend && source .venv/bin/activate && uvicorn app.main:app --port 8000 &
cd dev/frontend && npm run dev &
sleep 5
```

Tests Playwright MCP :
1. Ouvrir l'app → verifier que la page charge
2. Login (si auth) → admin@test.com / admin123
3. Redirection → bonne page apres login
4. Pages principales → naviguer, verifier du contenu
5. Console → pas d'erreurs JS critiques

```bash
kill %1 %2
```

Si erreurs → auto-fix (max 3 tentatives).

---

## CHECKPOINT — C'est pret

```bash
# Detecter le host de previsualisation (IP publique sur VPS, localhost sur Mac)
PREVIEW_HOST=$(python3 ../../lib/detect-env.py --json | python3 -c "import sys,json; print(json.load(sys.stdin)['preview_host'])")
echo "Preview host : ${PREVIEW_HOST}"
```

```
Build termine

Backend :
- DB : models.py + migration
- CRUD : X/Y entites + tests
- Services : X implementes + testes
- Jobs : X implementes + testes
- Utils : X implementes + testes
- Routes : X endpoints + tests
- Review : X violations corrigees

Frontend :
- Setup : preset {preset}, branding applique
- Services TS : X entites (types + hooks)
- Composants : X entites
- Shell : layout + X pages + routing

Tests finaux :
- pytest global : X passed, Y failed
- Frontend build : OK/KO
- Seed data : X users, Y entites creees
- Integration : endpoints OK/KO
- E2E : pages OK/KO

Acces :
- Backend  : http://${PREVIEW_HOST}:8000
- Frontend : http://${PREVIEW_HOST}:3000
```

### Git push (si repo existe)

```bash
cd {project}/dev && git add -A && git commit -m "Build complete — stable version" && git push
```

Si pas de repo, proposer d'en creer un.

---

## Regles transversales

- **Config** : TOUJOURS `from config.config import settings`, JAMAIS `os.environ`
- **Trailing slash** : `@router.post("")` JAMAIS `"/"`
- **Scripts d'abord** : utiliser `build_backend_from_configs()` pour tout le formulaire
- **JSON configs** : stockes dans `docs/architecture/configs/`
- **Tests cibles** : chaque couche teste uniquement ce qui vient d'etre ajoute
- **Test global** : une seule fois, en Phase 5.1
- **Services** : les agents build-jobs utilisent les VRAIS services (pas des mocks)
- **Seed** : adaptatif, base sur le PRD et le schema
- **Frontend rules** : les agents composants et shell chargent UNIQUEMENT `erreurs-courantes.md` + `checklist-validation.md` — pas toutes les rules
