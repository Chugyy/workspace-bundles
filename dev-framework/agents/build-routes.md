---
name: build-routes
description: >
  Génère les routes FastAPI + models Pydantic + tests endpoints pour UNE entité.
  Les routes appellent les jobs ou CRUD directement.
allowed-tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Build Routes — Endpoints API pour une entité

## Objectif

Générer les models Pydantic, routes FastAPI et tests d'endpoints pour UNE entité. Les routes sont la couche la plus externe — elles appellent les jobs (si existent) ou les CRUD directement.

## Arguments attendus

- `entity` : Nom de l'entité (ex: "property")
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)
- `backend_path` : Chemin vers le backend (ex: `dev/backend`)

## Process

### 1. Lire les regles, specs ET le code existant

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques API (principes REST, methodes HTTP, URLs, gestion des erreurs, Pydantic models)
- Obligatoire : architecture en couches (quand deleguer a un job vs CRUD direct)
- Conseille : bonnes pratiques jobs (pour comprendre quand une route appelle un job vs CRUD)

**Specs et code** :
1. `{backend_path}/../config/config.py` — **EN PREMIER** — pattern Settings
2. `{architecture_path}/api/{entity}.md` — Endpoints REST (routes, params, responses)
3. `{architecture_path}/business-logic/{entity}.md` — Ce que chaque endpoint declenche
4. `{backend_path}/app/core/jobs/{entity}.py` — Jobs existants (si existent)
5. `{backend_path}/app/database/crud/{entity}.py` — CRUD existant
6. `{architecture_path}/schema.md` — Types des colonnes pour les models Pydantic

### 2. Générer Models Pydantic (`api/models/{entity}.py`)

Depuis `api/{entity}.md` → Input/Output de chaque endpoint :

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class {Entity}Create(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    ...

class {Entity}Update(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    ...

class {Entity}Response(BaseModel):
    id: int
    name: str
    created_at: datetime
    ...

    class Config:
        from_attributes = True
```

### 3. Générer Routes FastAPI (`api/routes/{entity}.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.models.{entity} import *
from app.database.crud.{entity} import *

router = APIRouter(prefix="/api/{entities}", tags=["{entities}"])

@router.post("", response_model={Entity}Response, status_code=201)
async def create_{entity}_endpoint(data: {Entity}Create, pool=Depends(get_pool)):
    result = await create_{entity}(pool, **data.model_dump())
    return result

@router.get("", response_model=List[{Entity}Response])
async def list_{entities}_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool=Depends(get_pool)
):
    return await list_{entities}(pool, page=page, limit=limit)

@router.get("/{id}", response_model={Entity}Response)
async def get_{entity}_endpoint(id: int, pool=Depends(get_pool)):
    result = await get_{entity}_by_id(pool, id)
    if not result:
        raise HTTPException(status_code=404, detail="{Entity} not found")
    return result
```

**Logique d'appel** :
- Si un Job existe pour l'action → appeler le Job
- Si pas de Job (action simple) → appeler le CRUD directement
- Imports basés sur le code RÉEL existant

### 4. Générer Tests (`tests/test_routes/test_{entity}.py`)

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_{entity}(client: AsyncClient):
    response = await client.post("/api/{entities}", json={"name": "Test", ...})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test"
    assert "id" in data

@pytest.mark.asyncio
async def test_list_{entities}(client: AsyncClient):
    response = await client.get("/api/{entities}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_{entity}_not_found(client: AsyncClient):
    response = await client.get("/api/{entities}/99999")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_create_{entity}_validation_error(client: AsyncClient):
    response = await client.post("/api/{entities}", json={})
    assert response.status_code == 422
```

## Output

- `{backend_path}/app/api/models/{entity}.py`
- `{backend_path}/app/api/routes/{entity}.py`
- `{backend_path}/tests/test_routes/test_{entity}.py`

## Règles strictes

- NE PAS modifier d'autres fichiers
- Lire le code existant (jobs, CRUD) pour connaître les vraies signatures
- **Trailing slash** : `@router.post("")` JAMAIS `"/"` (redirect_slashes=False)
- **get_current_user** retourne `SimpleNamespace` (accès par attribut : `current_user.id`)
- Configuration : `from config.config import settings`, JAMAIS `os.environ`
- Suivre les endpoints EXACTEMENT comme dans `api/{entity}.md`
