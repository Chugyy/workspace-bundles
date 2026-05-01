---
name: review-backend-logic
description: >
  Review post-build du backend logique (core/). Detecte violations de couches,
  redondances, jobs trop larges, entites a combiner, code duplique a extraire en job primaire.
  Read-only, produit un rapport actionnable.
allowed-tools: Read, Glob, Grep
model: sonnet
---

# Review Backend Logic — Audit post-build

## Objectif

Auditer le code du dossier `core/` (jobs, utils, services) pour detecter les violations d'architecture. Produire un rapport actionnable avec actions concretes.

**Scope** : `core/` uniquement (jobs, utils, services). Le CRUD est suffisamment mecanique pour ne pas deriver.

## Arguments attendus

- `backend_path` : Chemin vers le backend (ex: `dev/backend`)
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)

## Process

### 1. Lire les regles et specs

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : architecture en couches (definition des couches, regles de decision, conventions de nommage)
- Obligatoire : bonnes pratiques jobs (orchestration, jobs primaires/secondaires, extraction code duplique)
- Obligatoire : bonnes pratiques services (role d'un service, structure)
- Obligatoire : bonnes pratiques CRUD (operations atomiques, pas de logique metier)

**Specs projet** :
1. `{architecture_path}/business-logic/*.md` — Specs de chaque entite

### 2. Scanner le code

Lire TOUS les fichiers de ces dossiers :
- `{backend_path}/app/core/jobs/*.py`
- `{backend_path}/app/core/utils/*.py`
- `{backend_path}/app/core/services/*.py`

Pour chaque fichier, analyser : imports, signatures, corps des fonctions, appels inter-couches.

### 3. Verifier les 9 categories de violations

#### V1 — SQL direct dans un job (CRITIQUE)

Un job ne doit JAMAIS acceder a la DB directement. Chercher `pool.acquire()`, `conn.fetch`, `conn.execute` dans `jobs/`.

```python
# VIOLATION dans jobs/order.py
async def place_order(pool, ...):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        # ↑ Cette requete devrait etre dans crud/product.py
```

#### V2 — Logique pure dans un job (CRITIQUE)

Un job ne doit PAS contenir de validation/calcul inline. Chercher des `if/raise ValueError`, des calculs arithmetiques, du formatage de donnees directement dans `jobs/`.

```python
# VIOLATION dans jobs/booking.py
async def create_booking(pool, check_in, check_out, price):
    if check_in >= check_out:                    # ← devrait etre dans utils/booking.py
        raise ValueError("invalid dates")
    total = (check_out - check_in).days * price  # ← devrait etre dans utils/booking.py
```

Exception : un simple `if not result: raise ValueError("not found")` apres un CRUD est acceptable (flow control, pas validation metier).

#### V3 — Job trop large (CRITIQUE)

Un job qui orchestre des workflows de plusieurs entites non liees. Indicateurs :
- Importe depuis 3+ fichiers CRUD differents
- Fait 6+ appels CRUD/services
- Touche des entites sans relation parent-enfant

```python
# VIOLATION dans jobs/user.py
async def register_and_setup_everything(pool, ...):
    user = await create_user(pool, ...)            # user
    workspace = await create_workspace(pool, ...)  # workspace — entite differente
    subscription = await create_subscription(pool, ...)  # billing — encore une autre
    # ↑ 3 workflows differents a splitter
```

#### V4 — Job wrapper inutile (WARNING)

Un job qui ne fait que relayer les params a un seul CRUD sans orchestration. La route devrait appeler le CRUD directement.

```python
# VIOLATION
async def get_user(pool, user_id):
    return await get_user_by_id(pool, user_id)  # ← wrapper inutile
```

#### V5 — Redondance inter-fichiers (WARNING)

Meme logique dupliquee entre :
- Deux jobs differents (meme sequence CRUD + service)
- Un job et un utils (validation faite aux deux endroits)

#### V6 — Entites a combiner (CRITIQUE)

Fichiers separes pour des entites satellites. Indicateurs :
- Le nom contient le parent (`automation_log.py` a cote de `automation.py`)
- Le fichier satellite ne contient que des fonctions filtrees par le parent_id
- L'entite n'a pas de sens seule

```
# VIOLATION
services/
├── automation.py
├── automation_log.py      # ← devrait etre dans automation.py
```

#### V7 — Suffixes de couche (WARNING)

Noms de fonctions avec `_crud`, `_job`, `_service`.

```python
# VIOLATION
async def create_user_crud(pool, ...):   # ← _crud inutile
async def register_user_job(pool, ...):  # ← _job inutile
```

A ne pas confondre avec le contexte entite qui est NECESSAIRE (`create_user` est correct).

#### V8 — Fichiers plats prefixes au lieu de dossiers (WARNING)

Plusieurs fichiers dans le meme dossier avec le meme prefixe au lieu d'un sous-dossier.

```
# VIOLATION
services/
├── youtube_scraper.py     # ← devrait etre youtube/scraper.py
├── youtube_oauth.py       # ← devrait etre youtube/oauth.py
├── youtube_pipeline.py    # ← devrait etre youtube/pipeline.py
```

#### V9 — Code duplique a extraire en job primaire (CRITIQUE)

Une sequence de 2+ etapes (CRUD/utils/services) est dupliquee dans 2+ jobs. Ce code commun devrait devenir un job primaire reutilisable.

**Comment detecter** :
1. Comparer les corps de tous les jobs entre eux
2. Chercher des sequences d'appels similaires (meme fonctions CRUD/services dans le meme ordre)
3. Les parametres qui varient entre les instances = signature du futur job primaire

```python
# VIOLATION — code duplique dans 2 jobs

# jobs/onboard_user.py
async def onboard_user(pool, user_id, url):
    html = await fetch_page(url)               # ← duplique
    data = extract_profile_data(html)           # ← duplique
    await update_user_profile(pool, user_id, **data)

# jobs/sync_daily.py
async def sync_contacts(pool, contact_id, url):
    html = await fetch_page(url)               # ← duplique
    data = extract_profile_data(html)           # ← duplique
    await update_contact(pool, contact_id, **data)

# ACTION : extraire en job primaire
# jobs/scrape_profile.py (primaire)
async def scrape_profile(pool, url: str) -> dict:
    html = await fetch_page(url)
    return extract_profile_data(html)
```

**Dans le rapport, inclure** :
- Le code duplique exact (avec fichiers et lignes)
- Les parametres qui varient → signature du job primaire proposee
- Le nom suggere pour le job primaire

### 4. Produire le rapport

Format du rapport :

```
## Review Backend Logic — {date}

### Resume
- X violations detectees (Y critiques, Z warnings)
- Fichiers scannes : {liste}

### Violations critiques (a corriger)

#### [V1] SQL dans job — jobs/{entity}.py:L{line}
- Ligne : `await conn.fetchrow("SELECT ...")`
- Action : deplacer dans crud/{entity}.py, creer fonction `{nom_suggere}`

#### [V9] Code duplique → job primaire
- Fichiers : jobs/{a}.py:L{n}, jobs/{b}.py:L{m}
- Code commun : {description}
- Job primaire propose : `{nom}({params}) -> {retour}` dans jobs/{nom}.py
- Parametres identifies : {liste avec explication}

### Warnings (a considerer)

#### [V7] Suffixe de couche — jobs/{entity}.py:{function_name}
- `register_user_job` → renommer en `register_user`

### OK
- {liste des fichiers sans violation}
```

## Regles strictes

- NE RIEN MODIFIER — read-only, rapport uniquement
- Scanner TOUS les fichiers de core/, pas un echantillon
- Citer les numeros de ligne exacts
- Distinguer critique (V1, V2, V3, V6, V9) et warning (V4, V5, V7, V8)
- Pour V9, toujours inclure la signature du job primaire proposee avec ses parametres
- Si 0 violations : le dire clairement
