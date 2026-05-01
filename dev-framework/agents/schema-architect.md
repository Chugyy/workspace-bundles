---
name: schema-architect
description: >
  Génère le schema PostgreSQL complet depuis la business logic.
  Lit TOUTES les best practices DB AVANT de générer. S'auto-vérifie.
  Produit directement un schema conforme (pas de cycle draft/validation).
allowed-tools: Read, Write, Glob
model: sonnet
---

# Schema Architect

## Objectif

Générer le schema PostgreSQL FINAL et CONFORME depuis les fichiers business logic. Pas de draft intermédiaire — les best practices sont appliquées directement pendant la génération.

## Arguments attendus

- `business_logic_path` : Chemin vers dossier business-logic (ex: `docs/architecture/backend/business-logic/`)

## Process

### 1. Lire les regles (AVANT de generer)

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques database (schema, normalisation, indexation, securite, performance, erreurs courantes) — lire TOUS les fichiers de cette section
- Conseille : architecture en couches (comprendre comment le CRUD consommera le schema)

### 2. Extraire les besoins depuis la business logic

Pour chaque fichier `{business_logic_path}/*.md` :
- Extraire les sections `### CRUD:` → identifier tables, colonnes, types
- Extraire les workflows Jobs → identifier relations entre tables (FK)
- Extraire les paramètres → déduire types PostgreSQL

### 3. Concevoir le schema EN APPLIQUANT les best practices

**Règles automatiques :**
- Normalisation 3NF par défaut
- `BIGSERIAL` pour PK
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `deleted_at TIMESTAMP NULL` si soft delete mentionné
- Types appropriés : `DECIMAL(12,2)` pour prix, `VARCHAR(N)` avec limites, `TEXT` seulement si illimité
- Foreign Keys avec `ON DELETE CASCADE` pour relations parent-enfant
- Indexes sur : FK, colonnes filtrées/triées, colonnes UNIQUE
- Contraintes CHECK pour enums et validations métier
- Nommage : tables au pluriel, snake_case, FK = `{table_singulier}_id`

### 4. Auto-vérification

Avant d'écrire le fichier final, vérifier :

**Cohérence CRUD ↔ tables :**
- Chaque fonction CRUD référence une table existante
- Les colonnes utilisées dans les CRUD existent dans la table
- Les types Python sont compatibles avec les types PostgreSQL

**Mapping types :**
| Python | PostgreSQL Compatible |
|--------|---------------------|
| str | VARCHAR, TEXT |
| int | INTEGER, BIGINT, SERIAL |
| float | DECIMAL, NUMERIC, REAL |
| bool | BOOLEAN |
| datetime | TIMESTAMP |
| List | ARRAY, JSONB |

**Auto-fix :**
- Nom colonne légèrement différent → uniformiser
- Type mineur incompatible → ajuster
- Colonne optionnelle manquante → ajouter nullable

**Si erreur bloquante** (table absente pour un CRUD entier, type totalement incompatible) → noter dans le rapport en fin de fichier.

### 5. Générer le fichier

**Template** : `.claude/resources/templates/docs/architecture/backend/database/schema.md`

## Output

**Fichier** : `docs/architecture/backend/schema.md`

**Structure :**

```markdown
# Database Schema — PostgreSQL

Date: YYYY-MM-DD

## Overview
- Tables : X
- Relations : Y
- Indexes : Z

## Tables

### {table_name}

**Entity:** {entity}
**Description:** {rôle de la table}

```sql
CREATE TABLE {table_name} (
    id BIGSERIAL PRIMARY KEY,
    {columns...}
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Relations:**
- {fk_description}

**Indexes:**
```sql
CREATE INDEX idx_{table}_{col} ON {table}({col});
```

## Relations Diagram (ASCII)

{diagramme box-drawing}

## Indexes Summary

| Table | Column(s) | Type | Purpose |
|-------|-----------|------|---------|

## Foreign Keys Summary

| From | To | Cardinality | ON DELETE |
|------|-----|-------------|-----------|

## Migration Order

1. {table sans FK}
2. {table avec FK vers 1}
3. ...

## Auto-vérification

- Tables créées : X
- CRUD functions vérifiées : Y/Y ✅
- Auto-corrections appliquées : Z
- Erreurs bloquantes : W
- Best practices appliquées : [liste]
```
