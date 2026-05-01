# Development Framework

## Philosophie

L'humain decrit ce qu'il veut. Le LLM determine la chaine d'etapes adaptee au projet, la propose, et l'execute apres validation. Pas de distinction greenfield/brownfield — chaque skill s'adapte au contexte (projet vide ou existant).

**Approche Intent-First** : l'humain partage son intention, le LLM gere la technique. Les documents techniques sont pour le LLM. L'humain voit des overviews non-techniques qu'il peut challenger.

## Regles globales

- **NE PAS utiliser le systeme de memoire** (`memory/`, `MEMORY.md`). Preferences et retours utilisateur dans CLAUDE.md ou dans les skills.
- **Toujours valider les services externes** : lister les choix et demander validation AVANT de finaliser.
- **Proposer un repo GitHub au demarrage de chaque projet** : quand un nouveau projet est cree dans `pids/{pid}/`, proposer a l'utilisateur de creer un repo GitHub (`gh repo create`). Un `git init` + premier commit du dossier `docs/` est le minimum. Cela protege le code des le debut — pas juste au deploy.
- **Preferences implicites** (appliquees SANS demander) :
  - Local > API externe (lib Python > API tierce)
  - Open source > proprietaire (sauf si le proprio est clairement superieur)
  - Simple > complexe (1 lib > 3 libs combinees)
  - Templates du projet (`.claude/resources/templates/`)
  - Origin UI > compose > custom (537 composants, 39 categories via MCP `origin-ui`)

## Stack Technique

- **Backend** : FastAPI + PostgreSQL (asyncpg) + Pydantic v2
- **Frontend** : Next.js + shadcn/ui + Tailwind + React Hook Form + Zod
- **Database** : PostgreSQL, asyncpg pool (pas d'ORM pour les requetes)

## Convention de Nommage

- Noms de fonctions descriptifs, SANS suffixes techniques (`_job`, `_crud`, `_service`)
- Le type est defini par l'emplacement du fichier (`jobs/`, `crud/`, `services/`, `utils/`)
- snake_case en Python, camelCase en JSON (conversion auto via Pydantic BaseSchema)

---

## Skills

9 skills independants. Chacun sait chercher ses inputs dans les fichiers existants. S'ils n'existent pas, il s'adapte ou pose les questions.

| Skill | Ce qu'il fait | Inputs | Outputs |
|-------|--------------|--------|---------|
| `/prd` | Brainstorming + document de cadrage | Conversation (+ code existant si feature) | `docs/prd.md`, `docs/for-later.md` |
| `/research` | Explore un service/technologie | Un sujet | `../lib/{service}/` (type research), `docs/.env` |
| `/jobs` | Definit entites, logique metier, interactions | `docs/prd.md` (ou conversation) | `docs/architecture/entities.md`, `fr-mapping.md`, `configs/crud-*.json`, `configs/jobs-*.json` |
| `/schema` | Design la base de donnees PostgreSQL | Jobs configs (ou PRD) | `docs/architecture/schema.md`, `configs/db.json`, `configs/assembly.json` |
| `/api` | Design les endpoints REST | Schema + Jobs (ou PRD) | `docs/architecture/api/*.md`, `configs/routes-*.json` |
| `/frontend` | Architecture frontend (branding, layout, pages, composants) | PRD + API docs (+ research si services frontend) | `docs/architecture/frontend-architecture.md`, mockups optionnels |
| `/build` | Genere le code, couche par couche | Toute la doc produite avant (configs, schema, api, research, frontend-arch) | `dev/backend/`, `dev/frontend/` |
| `/deploy` | Met en production (Docker, GitHub, Dokploy, DNS). Lance `/vps-monitor` avant le deploy. | Code builde | App en ligne |
| `/playbook` | Guide actionnable sur n'importe quel sujet | Un sujet | `context/store/playbook-{subject}.md` |

### Outils

| Skill | Description |
|-------|-------------|
| `/tools-frontend-debugger` | Debug iteratif frontend |
| `/vps-monitor` | Monitoring et nettoyage du VPS (utilise par `/deploy`) |

---

## Chaines de pensee (Use Cases + Routing)

Quand l'utilisateur decrit un besoin, je determine la chaine adaptee. Je la propose, il valide, j'execute skill par skill.

**IMPORTANT** : Chaque skill est invoque UN PAR UN, dans l'ordre. Ne JAMAIS charger le skill suivant avant d'avoir termine le precedent. Entre chaque skill, je garde uniquement le resume de ce qui a ete produit — les fichiers de sortie vivent sur le disque, pas dans mon contexte.

### Projet from scratch

**SaaS / App full-stack** (dashboard, CRM, marketplace...)
```
prd → research (si services externes) → jobs → schema → api → frontend → build → deploy
```

**Bot Discord / Telegram / Slack**
```
prd → research (API du bot) → jobs → schema (si persistance) → api (si webhook/dashboard) → build → deploy
```

**Landing page / Site statique**
```
prd → frontend → build → deploy
```

**Script / CLI / Outil interne**
```
prd → jobs → research (si services) → build → deploy (optionnel)
```

**API pure (sans frontend)**
```
prd → research (si services) → jobs → schema → api → build → deploy
```

### Infrastructure event-driven (aggregator/handler)

Pour ces use cases, consulter les best practices dans `rules/use-cases/`.

**Connecteur aggregator** (capturer des events depuis une source externe)
```
research (API/service de la source) → build du connecteur dans aggregator/connectors/
```

**Action handler** (traiter un event)
```
definir la rule dans meta.yaml → build du .sh + .py dans actions/
```

**Agent IA autonome** (PID avec CLAUDE.md, invoque via agent-invoke)
```
creer le PID → ecrire le CLAUDE.md + meta.yaml → configurer les outils → tester via agent-invoke
```

Chaque type suit les regles documentees dans `rules/use-cases/` :
- [Connecteur](rules/use-cases/aggregator-connector.md)
- [Action handler](rules/use-cases/handler-action.md)
- [Agent IA](rules/use-cases/agent-ia.md)
- [Gestion erreurs](rules/use-cases/error-handling.md)

### Feature sur projet existant

```
prd (cadrage feature) → (skills impactes uniquement) → build → deploy
```

Process :
1. Check git (changements non pushes ?)
2. Lire la doc existante (PRD, schema, api, jobs, frontend-arch)
3. Proposer le plan : quelles couches sont impactees, quels skills relancer
4. Valider avec l'utilisateur
5. Executer uniquement les skills necessaires
6. Build uniquement les couches modifiees

### Refactor

```
(analyse code) → build (couches impactees)
```

### Cas ambigus — comment decider

- L'utilisateur mentionne un projet avec du code → Feature
- Dossier projet vide ou inexistant → From scratch
- "Je veux explorer / brainstormer" → `/prd` seul
- "Je veux documenter un service" → `/research` seul
- "Je veux comprendre comment faire X" → `/playbook` seul
- Bug frontend → `/tools-frontend-debugger`
- "Je veux capturer des events de X" → Connecteur aggregator (voir `rules/use-cases/`)
- "Je veux reagir quand Y arrive" → Action handler (voir `rules/use-cases/`)
- "Je veux un agent qui fait Z" → Agent IA autonome (voir `rules/use-cases/`)
- "Je veux une notification actionnable / ticket / formulaire quand un event arrive" → Action handler avec interactive cards (voir `rules/use-cases/handler-action.md`)
- Scope flou → Poser 2-3 questions de cadrage, puis proposer la chaine

---

## Build — Detail des couches

Le skill `/build` est un orchestrateur. Il detecte ce qui est necessaire et execute les couches pertinentes dans l'ordre.

### Track Backend

```
Couche          │ Agent               │ Parallele ? │ Rules chargees                │ Inputs docs
────────────────┼─────────────────────┼─────────────┼───────────────────────────────┼───────────────────
1. Setup + DB   │ generate-database   │ Non (1 seul)│ best-practises-databases      │ schema.md, db.json
                │                     │             │                               │ assembly.json
────────────────┼─────────────────────┼─────────────┼───────────────────────────────┼───────────────────
2. CRUD         │ build-crud (1/ent.) │ Oui         │ business-logic (CRUD)         │ schema.md
                │                     │             │                               │ configs/crud-*.json
────────────────┼─────────────────────┼─────────────┼───────────────────────────────┼───────────────────
3. Services     │ build-service       │ Oui (1/svc) │ aucune — le research          │ ../lib/{svc}/
                │ (Opus, 1/service)   │             │ EST la spec                   │
────────────────┼─────────────────────┼─────────────┼───────────────────────────────┼───────────────────
4. Utils + Jobs │ build-utils (1/ent.)│ Utils // ,  │ business-logic (jobs)         │ configs/jobs-*.json
                │ puis build-jobs     │ puis Jobs //│                               │ + code CRUD + services
────────────────┼─────────────────────┼─────────────┼───────────────────────────────┼───────────────────
5. API Routes   │ build-routes        │ Oui (1/ent.)│ best-practises-api            │ api/*.md
                │                     │             │                               │ routes-*.json
────────────────┼─────────────────────┼─────────────┼───────────────────────────────┼───────────────────
6. Review       │ review-backend      │ Non (1 seul)│ business-logic (toutes)       │ tout le code produit
```

Chaque agent a un contexte minimal. L'agent CRUD ne voit pas les rules API. L'agent Jobs ne voit pas les rules DB.

### Track Frontend

```
Couche          │ Agent                 │ Parallele ? │ Rules chargees                │ Inputs docs
────────────────┼───────────────────────┼─────────────┼───────────────────────────────┼─────────────────
1. Setup        │ (script)              │ Non         │ design-system-tailwind        │ frontend-arch
                │                       │             │ colors-and-theming            │ (branding section)
                │                       │             │ typography-fonts              │
────────────────┼───────────────────────┼─────────────┼───────────────────────────────┼─────────────────
2. Services TS  │ build-entity-frontend │ Oui (1/ent.)│ aucune (TS pur, pas          │ api docs ou code
                │ (types + hooks)       │             │ de styling)                   │ backend
────────────────┼───────────────────────┼─────────────┼───────────────────────────────┼─────────────────
3. Composants   │ build-entity-frontend │ Oui (1/ent.)│ erreurs-courantes            │ frontend-arch
                │ (UI components)       │             │ checklist-validation          │ + services TS
                │                       │             │ component registries          │
────────────────┼───────────────────────┼─────────────┼───────────────────────────────┼─────────────────
4. Shell        │ build-frontend-shell  │ Non (1 seul)│ erreurs-courantes            │ frontend-arch
                │                       │             │ checklist-validation          │ + composants
```

### Couches sautees selon le projet

| Projet type | DB | CRUD | Services | Jobs | API | Front Svc | Front UI |
|-------------|:--:|:----:|:--------:|:----:|:---:|:---------:|:--------:|
| SaaS full   | x  | x    | x        | x    | x   | x         | x        |
| Bot Discord | ?  | ?    | x        | x    | ?   | -         | -        |
| Agent IA    | -  | -    | x        | x    | -   | -         | -        |
| Landing     | -  | -    | -        | -    | -   | -         | x        |
| Script/CLI  | -  | -    | ?        | x    | -   | -         | -        |
| API pure    | x  | x    | ?        | x    | x   | -         | -        |

`x` = toujours, `?` = selon le besoin, `-` = jamais

---

## Agents

Tous les agents vivent dans `.claude/agents/`. Chaque agent est invoque par le skill `/build` (ou `/jobs` pour les agents d'architecture).

### Agents architecture

| Agent | Role | Modele | Invoque par |
|-------|------|--------|-------------|
| `detail-business-logic-entity` | Business logic par entite | Sonnet | `/jobs` |
| `schema-architect` | Schema PostgreSQL | Sonnet | `/schema` |
| `api-architect` | API REST par entite | Sonnet | `/api` |
| `frontend-architect` | Architecture frontend | **Opus** | `/frontend` |

### Agents build

| Agent | Role | Couche | Modele |
|-------|------|--------|--------|
| `generate-database` | models.py + migration SQL | DB | Sonnet |
| `build-service` | Wrapper service externe + tests | Services | **Opus** |
| `build-crud` | CRUD asyncpg + tests par entite | CRUD | Sonnet |
| `build-utils` | Fonctions utilitaires + tests | Utils | Sonnet |
| `build-jobs` | Jobs (orchestration) + tests E2E | Jobs | Sonnet |
| `build-routes` | Routes FastAPI + Pydantic + tests | Routes | Sonnet |
| `reconcile-services` | Consolidation post-services | Reconciliation | **Opus** |
| `build-entity-frontend` | Types, hooks, composants par entite | Frontend | Sonnet |
| `build-frontend-shell` | Layout, pages, navigation, routing | Frontend | Sonnet |
| `build-mockups` | Pages HTML statiques de preview | Review | Sonnet |
| `review-backend-logic` | Audit post-build | Review | Sonnet |

---

## Documents Produits (chaine de contexte)

Tous les chemins sont relatifs au dossier projet (ex: `./mon-projet/`).

```
1. PRD
   docs/prd.md (+ split si complexe) + docs/for-later.md

2. RESEARCH (facultatif)
   ../lib/{service}/ (type research dans lib)
   docs/.env (credentials pour le build)

3. JOBS
   docs/architecture/entities.md
   docs/architecture/fr-mapping.md
   docs/architecture/configs/crud-*.json
   docs/architecture/configs/jobs-*.json

4. SCHEMA (si DB)
   docs/architecture/schema.md
   docs/architecture/configs/db.json
   docs/architecture/configs/assembly.json

5. API (si API)
   docs/architecture/api/*.md
   docs/architecture/configs/routes-*.json

6. FRONTEND (si frontend)
   docs/architecture/frontend-architecture.md
   docs/mockups/*.html (optionnel)

7. BUILD
   dev/backend/ (couche par couche)
   dev/frontend/ (couche par couche)

8. DEPLOY
   Dockerfiles + GitHub Actions + Dokploy + DNS
```

---

## Resources

### Lib (partagee — `../lib/`)

Source unique pour les outils, recherches, agents et templates partages entre PIDs.

| Type | Description | Exemple |
|------|-------------|---------|
| `tool` | Wrappers de services (email, telegram, youtube...) | `../lib/email/` |
| `research` | Documentation services externes | `../lib/discord/`, `../lib/anthropic/` |
| `agent` | Agents autonomes (context-search, doc-sync) | `../lib/context-search/` |
| `template` | Projets de reference reutilisables | `../lib/chat-interface/`, `../lib/dashboard-crm/` |

Pour chercher une entite (client, contact, strategie...) :
```bash
grep -ri "term" ../context/store/
```

### Resources locales (`.claude/resources/`)

Specifiques au PID dev — best practices et boilerplate de code.

- `rules/best-practises-build-api/` — Conventions REST, Pydantic, pagination, securite
- `rules/best-practises-build-databases/` — Schema, normalisation, indexation
- `rules/best-practises-build-frontend/` — Design system, Tailwind, composants
- `rules/best-practises-business-logic/` — Jobs, CRUD, Services patterns
- `templates/code/` — Squelettes backend (FastAPI) et frontend (Next.js + shadcn)
- `templates/docs/` — Templates de documents architecture
- `scripts/` — Scripts de setup (setup-infrastructure.py)

---

## Project Structure

Chaque projet vit dans son propre sous-dossier :

```
./nom-projet/
├── docs/                        # Cadrage + architecture
│   ├── prd.md
│   ├── for-later.md
│   └── architecture/
│       ├── entities.md
│       ├── fr-mapping.md
│       ├── schema.md
│       ├── api/
│       ├── frontend-architecture.md
│       └── configs/             # JSON configs pour le build
└── dev/
    ├── backend/                 # FastAPI
    └── frontend/                # Next.js
```

## Build Commands

```bash
# Depuis workspace root (../):
python3 registry.py build          # Rebuild context + lib registries
python3 registry.py build shared   # Injecte lib/CLAUDE.shared.md dans tous les CLAUDE.md
python3 registry.py build all      # Registries + shared
```

## Context Store & Lib (PARTAGES)

| Resource | Chemin depuis cwd (`dev/`) |
|----------|---------------------------|
| Context store | `../context/` |
| Lib | `../lib/` |
| Registry context | `../context/registry.json` |
| Registry lib | `../lib/registry.json` |


## Deploiement AI Manager

**REGLE ABSOLUE** : ne JAMAIS copier manuellement des fichiers vers `/data/ai-manager/`. Toujours passer par `git push` depuis le repo `ai-manager/dev/`. Le CI/CD (GitHub Actions) ou le pull cote VPS se charge de deployer.

Workflow :
1. Modifier les fichiers dans `ai-manager/dev/` (le repo git)
2. `git add` + `git commit` + `git push`
3. Cote VPS : `cd /data/ai-manager && git pull && pm2 reload all`

**Pourquoi** : copier des fichiers directement cree une divergence entre le repo et le deploiement. Le repo est la source de verite. Pas de raccourcis.

Cela s'applique au backend, frontend, ecosystem.config.js, start scripts — tout ce qui vit dans le repo ai-manager.
