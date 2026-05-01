---
name: generate-database
description: >
  Génère models.py SQLAlchemy + migration SQL depuis schema.md.
  Agent exécutant — aucune décision d'architecture.
allowed-tools: Read, Write, Glob
model: sonnet
---

# Generate Database

## Objectif

Générer 2 fichiers depuis le schema d'architecture :
1. `models.py` — Classes SQLAlchemy (documentation du schéma, PAS utilisé pour requêtes)
2. `001_initial_schema.sql` — CREATE TABLE PostgreSQL (schéma réel)

## Arguments attendus

- `schema_path` : Chemin vers schema.md (ex: `docs/architecture/backend/schema.md`)
- `backend_path` : Chemin vers le backend (ex: `dev/backend`)

## Process

### 1. Lire les regles et le schema

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques database (schema, normalisation, indexation)
- Conseille : architecture en couches (comprendre que models.py est de la documentation, les requetes passent par asyncpg)

**Schema** :
Lire `{schema_path}` → extraire pour chaque table :
- Nom, colonnes (nom, type SQL, contraintes), relations (FK), indexes, CHECK constraints

### 2. Mapper types SQL → SQLAlchemy

| Type SQL | SQLAlchemy |
|----------|-----------|
| INTEGER, INT | `Integer` |
| SERIAL, BIGSERIAL | `Integer, autoincrement=True` |
| VARCHAR(N) | `String(N)` |
| TEXT | `Text` |
| BOOLEAN | `Boolean` |
| TIMESTAMP | `DateTime(timezone=True)` |
| NUMERIC(P,S), DECIMAL(P,S) | `Numeric(P, S)` |
| DOUBLE PRECISION | `Float` |
| JSONB | `JSON` |

Contraintes : PRIMARY KEY → `primary_key=True`, NOT NULL → `nullable=False`, UNIQUE → `unique=True`, FK → `ForeignKey('table.col')`

### 3. Générer models.py

**Fichier** : `{backend_path}/app/database/models.py`

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, Float, ForeignKey, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class {ModelName}(Base):
    __tablename__ = '{table_name}'

    # Colonnes
    id = Column(Integer, primary_key=True, autoincrement=True)
    {columns...}
    created_at = Column(DateTime(timezone=True), nullable=False, server_default='CURRENT_TIMESTAMP')
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default='CURRENT_TIMESTAMP')

    # Relations (bidirectionnelles)
    {relationships...}

    # Contraintes CHECK (si applicable)
    __table_args__ = (
        CheckConstraint("...", name='check_...'),
    )

    def __repr__(self):
        return f"<{ModelName}(id={self.id})>"
```

**Points clés :**
- Relations bidirectionnelles avec `back_populates`
- `cascade="all, delete-orphan"` pour parent → enfants
- `ondelete='CASCADE'` sur les ForeignKey

### 4. Générer 001_initial_schema.sql

**Fichier** : `{backend_path}/app/database/migrations/001_initial_schema.sql`

```sql
-- Migration 001: Initial Schema
-- Based on {schema_path}

CREATE TABLE IF NOT EXISTS {table} (
    id BIGSERIAL PRIMARY KEY,
    {columns...}
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_{table}_{col} ON {table}({col});
```

**Règles SQL :**
- `CREATE TABLE IF NOT EXISTS` (idempotent)
- Contraintes nommées : `CONSTRAINT uq_`, `ck_`, `fk_`
- Ordre de création : tables parents → enfants (respect FK)
- Indexes sur FK et colonnes de recherche

## Output

- `{backend_path}/app/database/models.py`
- `{backend_path}/app/database/migrations/001_initial_schema.sql`

## Note importante

`models.py` est de la DOCUMENTATION (SQLAlchemy ORM). Les requêtes réelles utilisent asyncpg + pool directement (défini dans `db.py`). Ne pas confondre.
