---
name: reconcile-services
description: >
  Lit tous les rapports de service, consolide les changements DB/API/Jobs
  en une seule passe cohérente. Résout les conflits. Agent séquentiel unique.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
---

# Reconcile Services — Consolidation post-services

## Objectif

Lire TOUS les rapports produits par les agents `build-service`, consolider les changements en une seule passe sans conflit, et appliquer les modifications au code existant.

## Arguments attendus

- `backend_path` : Chemin vers le backend (ex: `dev/backend`)
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)

## Process

### 1. Lire les regles et collecter les rapports

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques database (schema, migrations, indexation)
- Obligatoire : architecture en couches (comprendre les impacts sur CRUD et jobs)
- Conseille : bonnes pratiques services (comprendre ce que les rapports de services decrivent)

**Rapports** :
Lire tous les fichiers `{backend_path}/reports/service-*.md`

Pour chaque rapport, extraire :
- Changements Database (tables, colonnes)
- Changements Models Pydantic
- Changements Routes
- Changements Jobs (signatures, imports)
- Dependencies (packages)
- Configuration (.env)

### 2. Détecter les conflits

Vérifier :
- **2 services modifient la même table** → fusionner les colonnes dans une seule migration
- **2 services ajoutent la même dépendance** → garder la version la plus récente
- **Changements contradictoires** (ex: un service veut `nullable`, l'autre `not null`) → noter et signaler

### 3. Générer la migration SQL consolidée

**Fichier** : `{backend_path}/app/database/migrations/002_services_integration.sql`

```sql
-- Migration: Services Integration
-- Generated from service reports: {list}
-- Date: {date}

BEGIN;

-- === New tables ===
{CREATE TABLE statements, ordonnés par dépendances FK}

-- === Alter existing tables ===
{ALTER TABLE ADD COLUMN statements, groupés par table}

-- === New indexes ===
{CREATE INDEX statements}

COMMIT;
```

**Règles** :
- UN SEUL fichier migration (pas un par service)
- Ordonnée par dépendances (tables sans FK d'abord)
- Wrappée dans une transaction
- Commentaires indiquant quel service a requis chaque changement

### 4. Mettre à jour models.py

**Fichier** : `{backend_path}/app/database/models.py`

Ajouter les nouvelles tables/colonnes SQLAlchemy correspondant à la migration.

### 5. Mettre à jour les Models Pydantic

Pour chaque model API impacté :
- Lire `{backend_path}/app/api/models/{entity}.py`
- Ajouter les champs nécessaires (ex: `stripe_customer_id: Optional[str]`)

### 6. Mettre à jour les Jobs

Pour chaque Job impacté :
- Lire `{backend_path}/app/core/jobs/{entity}.py`
- Mettre à jour les imports (remplacer le stub par le vrai service)
- Adapter les appels si la signature a changé

### 7. Mettre à jour les Routes

Pour chaque route impactée :
- Modifier les routes existantes si nécessaire
- Créer les nouvelles routes (ex: webhooks) dans le fichier de route approprié

### 8. Mettre à jour les dépendances

**Fichier** : `{backend_path}/requirements.txt`

Ajouter toutes les nouvelles dépendances, dédupliquées, triées alphabétiquement.

### 9. Mettre à jour la configuration

**Fichier** : `{backend_path}/.env.example`

Ajouter toutes les nouvelles variables d'environnement avec commentaires.

### 10. Validation finale

```bash
cd {backend_path} && python -m pytest tests/test_services/ -v 2>&1 | head -80
cd {backend_path} && python -c "from app.database.models import *; print('Models OK')"
```

Si erreurs → auto-fix (max 3 tentatives par erreur).

## Output

Fichiers modifiés :
- `{backend_path}/app/database/migrations/002_services_integration.sql` — CRÉÉ
- `{backend_path}/app/database/models.py` — MODIFIÉ
- `{backend_path}/app/api/models/*.py` — MODIFIÉ (si concernés)
- `{backend_path}/app/core/jobs/*.py` — MODIFIÉ (imports + appels)
- `{backend_path}/app/api/routes/*.py` — MODIFIÉ/CRÉÉ (si webhook, etc.)
- `{backend_path}/requirements.txt` — MODIFIÉ
- `{backend_path}/.env.example` — MODIFIÉ

**Rapport final** : `{backend_path}/reports/reconciliation-summary.md`

```markdown
# Reconciliation Summary

## Services intégrés
| Service | Wrapper | Tests | DB Changes | Route Changes | Job Changes |
|---------|---------|-------|------------|---------------|-------------|
| {name} | ✅ | X/Y | {count} | {count} | {count} |

## Migration 002
- Tables créées : X
- Colonnes ajoutées : Y
- Indexes créés : Z

## Conflits résolus
- {description du conflit et de la résolution}

## Erreurs restantes
- {si any}
```

## Règles strictes

- LIRE tous les rapports AVANT de commencer à modifier quoi que ce soit
- UNE SEULE migration SQL pour tous les services
- Ne PAS toucher aux fichiers de service eux-mêmes (déjà créés et testés)
- En cas de conflit non résolvable → noter dans le rapport et NE PAS appliquer le changement
- Garder le code existant fonctionnel — ne pas casser ce qui marchait avant
