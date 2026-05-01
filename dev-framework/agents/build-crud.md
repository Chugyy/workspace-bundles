---
name: build-crud
description: >
  Genere le CRUD asyncpg + tests pour UNE entite.
  Agent executant — suit les specs, teste contre la DB.
allowed-tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Build CRUD — Operations DB pour une entite

## Objectif

Generer les fonctions CRUD asyncpg et leurs tests pour UNE entite. Chaque fonction = une requete SQL parametree.

## Arguments attendus

- `entity` : Nom de l'entite (ex: "property")
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)
- `backend_path` : Chemin vers le backend (ex: `dev/backend`)

## Process

### 1. Lire les regles et specs

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques CRUD (operations DB atomiques, parameterized queries, asyncpg patterns)
- Obligatoire : architecture en couches (conventions de nommage, structure fichiers)
- Conseille : bonnes pratiques database (schema, indexation) si besoin de comprendre la table

**Specs projet** :
1. `{backend_path}/../config/config.py` — **EN PREMIER** — pattern Settings
2. `{architecture_path}/business-logic/{entity}.md` — Section CRUD (signatures, parametres, retours)
3. `{architecture_path}/schema.md` — Tables et colonnes (section entite)
4. Templates : `.claude/resources/templates/code/backend/`

### 2. Generer CRUD (`crud/{entity}.py`)

Pour chaque fonction CRUD dans business-logic :

```python
import asyncpg
from typing import Optional, List

async def create_{entity}(pool: asyncpg.Pool, **params) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO {table} ({cols}) VALUES ({placeholders}) RETURNING *",
            *values
        )
        return dict(row)

async def get_{entity}_by_id(pool: asyncpg.Pool, id: int) -> Optional[dict]:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM {table} WHERE id = $1", id)
        return dict(row) if row else None

async def list_{entities}(pool: asyncpg.Pool, page: int = 1, limit: int = 20, **filters) -> List[dict]:
    async with pool.acquire() as conn:
        offset = (page - 1) * limit
        rows = await conn.fetch(
            "SELECT * FROM {table} WHERE ... ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, offset
        )
        return [dict(row) for row in rows]
```

**Patterns** : asyncpg pool, parameterized queries ($1, $2), dict(row) returns.

**Nommage** : PAS de suffixes de couche (`_crud`), mais garder le contexte entite. `create_user()` et non `create_user_crud()` ni `create()`.

### 3. Generer Tests (`tests/test_crud/test_{entity}.py`)

```python
import pytest
from app.database.crud.{entity} import create_{entity}, get_{entity}_by_id, list_{entities}, update_{entity}, delete_{entity}

@pytest.mark.asyncio
async def test_create(pool):
    result = await create_{entity}(pool, name="Test", ...)
    assert result["name"] == "Test"
    assert result["id"] is not None

@pytest.mark.asyncio
async def test_get_{entity}_by_id(pool):
    created = await create_{entity}(pool, ...)
    fetched = await get_{entity}_by_id(pool, created["id"])
    assert fetched is not None
    assert fetched["id"] == created["id"]

@pytest.mark.asyncio
async def test_list_{entities}(pool):
    await create_{entity}(pool, ...)
    await create_{entity}(pool, ...)
    results = await list_{entities}(pool)
    assert len(results) >= 2

@pytest.mark.asyncio
async def test_update_{entity}(pool):
    created = await create_{entity}(pool, ...)
    updated = await update_{entity}(pool, created["id"], name="Updated")
    assert updated["name"] == "Updated"

@pytest.mark.asyncio
async def test_delete_{entity}(pool):
    created = await create_{entity}(pool, ...)
    await delete_{entity}(pool, created["id"])
    fetched = await get_{entity}_by_id(pool, created["id"])
    assert fetched is None
```

Tester TOUTES les fonctions CRUD definies dans la business-logic, pas seulement les basiques.

## Output

- `{backend_path}/app/database/crud/{entity}.py`
- `{backend_path}/tests/test_crud/test_{entity}.py`

## Regles strictes

- NE PAS modifier d'autres fichiers que ceux de cette entite
- Suivre les signatures EXACTEMENT comme dans business-logic
- PAS de suffixes de couche (`_crud`), mais garder le contexte entite (`create_user`, pas `create`)
- snake_case pour tout
- Configuration : `from config.config import settings`, JAMAIS `os.environ`
- Parameterized queries ($1, $2) — JAMAIS de f-string SQL
- Retourner `dict(row)` — pas de row brut
