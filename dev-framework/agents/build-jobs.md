---
name: build-jobs
description: >
  Genere les jobs (orchestration metier) + tests E2E pour UNE entite.
  Les jobs appellent les vrais CRUD, services et utils — pas de mock.
allowed-tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Build Jobs — Orchestration metier pour une entite

## Objectif

Generer les jobs (fonctions d'orchestration) et leurs tests end-to-end pour UNE entite. Les jobs assemblent CRUD + services + utils pour realiser une action metier complete.

## Arguments attendus

- `entity` : Nom de l'entite (ex: "booking")
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)
- `backend_path` : Chemin vers le backend (ex: `dev/backend`)

## Process

### 1. Lire les regles, specs ET le code existant

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques jobs (orchestration metier, jobs primaires/secondaires, separation des couches)
- Obligatoire : architecture en couches (qui appelle quoi, conventions de nommage)
- Conseille : bonnes pratiques services (si le job appelle des services externes)
- Conseille : bonnes pratiques CRUD (pour comprendre les signatures des fonctions appelees)

**Specs projet** :
1. `{architecture_path}/business-logic/{entity}.md` — Section Jobs (workflows complets, etape par etape)

**Code existant** (lire les VRAIS fichiers pour connaitre les signatures, ne pas deviner) :
2. `{backend_path}/app/database/crud/{entity}.py` — Fonctions CRUD disponibles
3. `{backend_path}/app/core/services/*.py` — Services disponibles
4. `{backend_path}/app/core/utils/{entity}.py` — Utils disponibles

### 2. Generer Jobs (`core/jobs/{entity}.py`)

Pour chaque Job dans business-logic, suivre le workflow EXACTEMENT :

```python
from app.database.crud.{entity} import create_{entity}, get_{entity}_by_id
from app.core.services.email import send_email
from app.core.utils.{entity} import validate_{entity}_data

async def register(pool, **params):
    # 1. Validation (utils)
    validate_{entity}_data(params)

    # 2. Transaction DB (CRUD)
    async with pool.acquire() as conn:
        async with conn.transaction():
            result = await create_{entity}(pool, **params)

    # 3. Side effects hors transaction (services)
    await send_email(to=result["email"], subject="Welcome", body="...")

    return result
```

**Regles des Jobs** :
- Les Jobs n'accedent JAMAIS a la DB directement — toujours via CRUD
- Les side effects (email, notifications) sont HORS transaction
- L'ordre des etapes suit EXACTEMENT le workflow de la business-logic
- Les imports pointent vers les vrais fichiers existants
- PAS de suffixes dans les noms (le dossier `jobs/` definit le type)

### 3. Generer Tests E2E (`tests/test_jobs/test_{entity}.py`)

Les tests appellent les vrais jobs avec vrais CRUD + services + utils :

```python
import pytest
from app.core.jobs.{entity} import register_{entity}

@pytest.mark.asyncio
async def test_register_full_workflow(pool):
    """Test E2E : validation -> DB -> side effects."""
    result = await register_{entity}(pool, name="Test", ...)
    assert result["id"] is not None
    assert result["name"] == "Test"

    # Verifier que l'entite est bien en DB
    from app.database.crud.{entity} import get_{entity}_by_id
    fetched = await get_{entity}_by_id(pool, result["id"])
    assert fetched is not None

@pytest.mark.asyncio
async def test_register_{entity}_validation_error(pool):
    """Test : la validation bloque avant la DB."""
    with pytest.raises(ValueError):
        await register_{entity}(pool, name="", ...)
```

**Tests E2E** : pas de mock. Si un service externe est BLOQUE (pas de cle API), marquer le test `@pytest.mark.skipif`.

### 4. Gestion des services bloques

Si un service est en stub (`pass` + TODO) :
- Le job l'appelle quand meme (le stub ne fait rien)
- Le test verifie le workflow SANS l'effet du service
- Ajouter un commentaire : `# TODO: verifier {effect} quand {service} sera implemente`

## Output

- `{backend_path}/app/core/jobs/{entity}.py`
- `{backend_path}/tests/test_jobs/test_{entity}.py`

## Regles strictes

- NE PAS modifier d'autres fichiers
- Lire les VRAIS fichiers existants pour les imports (pas deviner les signatures)
- PAS de suffixes de couche (`_job`), mais garder le contexte entite (`place_order`, pas `place`)
- Jobs = orchestration UNIQUEMENT — pas de SQL, pas de logique de validation directe
- Suivre le workflow de business-logic etape par etape
- Tests E2E sans mock (sauf services bloques -> skip)
- Configuration : `from config.config import settings`, JAMAIS `os.environ`
