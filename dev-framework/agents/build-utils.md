---
name: build-utils
description: >
  Genere les fonctions utilitaires + tests pour UNE entite.
  Logique pure sans I/O : validation, calculs, formatage.
allowed-tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Build Utils — Fonctions utilitaires pour une entite

## Objectif

Generer les fonctions utilitaires (logique pure, sans I/O) et leurs tests unitaires pour UNE entite.

## Arguments attendus

- `entity` : Nom de l'entite (ex: "property")
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)
- `backend_path` : Chemin vers le backend (ex: `dev/backend`)

## Process

### 1. Lire les regles et specs

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : architecture en couches (definition des utils = fonctions pures, conventions de nommage)
- Conseille : bonnes pratiques CRUD (pour comprendre les types des donnees manipulees)

**Specs projet** :
1. `{architecture_path}/business-logic/{entity}.md` — Section Utils (signatures, regles metier)
2. `{backend_path}/app/database/crud/{entity}.py` — Comprendre les types utilises par le CRUD

### 2. Generer Utils (`core/utils/{entity}.py`)

Pour chaque fonction Utils dans business-logic :

```python
from typing import Optional, List, Dict, Any

def validate_{entity}_data(data: dict) -> None:
    """Valide les donnees avant creation/modification."""
    if not data.get("name"):
        raise ValueError("name is required")
    if data.get("price") and data["price"] < 0:
        raise ValueError("price must be positive")

def format_{entity}_for_display(entity: dict) -> dict:
    """Formate une entite pour l'affichage."""
    return {
        "id": entity["id"],
        "display_name": entity["name"].title(),
    }

def calculate_total(check_in, check_out, price_per_night) -> float:
    """Calcul metier pur."""
    return (check_out - check_in).days * price_per_night
```

**Caracteristiques** :
- Fonctions pures (pas d'I/O, pas d'async, pas d'acces DB)
- Validation par `raise ValueError` / `raise TypeError`
- Retours types
- PAS de suffixes (le dossier `utils/` definit le type)

### 3. Generer Tests (`tests/test_utils/test_{entity}.py`)

```python
import pytest
from app.core.utils.{entity} import validate_{entity}_data, format_{entity}_for_display, calculate_total

def test_validate_{entity}_data_valid():
    validate_{entity}_data({"name": "Test", "price": 100})

def test_validate_{entity}_data_missing_name():
    with pytest.raises(ValueError, match="name is required"):
        validate_{entity}_data({"price": 100})

def test_validate_{entity}_data_negative_price():
    with pytest.raises(ValueError, match="price must be positive"):
        validate_{entity}_data({"name": "Test", "price": -1})

def test_format_{entity}_for_display():
    result = format_{entity}_for_display({"id": 1, "name": "test name"})
    assert result["display_name"] == "Test Name"

def test_calculate_total():
    from datetime import date
    result = calculate_total(date(2025, 1, 1), date(2025, 1, 4), 100.0)
    assert result == 300.0
```

Tester tous les cas : valide, invalide, edge cases.

## Output

- `{backend_path}/app/core/utils/{entity}.py`
- `{backend_path}/tests/test_utils/test_{entity}.py`

## Regles strictes

- NE PAS modifier d'autres fichiers
- Fonctions PURES uniquement — pas d'I/O, pas d'async, pas de DB
- PAS de suffixes de couche, mais garder le contexte entite (`validate_user_data`, pas `validate_data`)
- Suivre les signatures de business-logic
- Tester tous les cas de validation (valide + chaque cas d'erreur)
