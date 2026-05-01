---
name: detail-business-logic-entity
description: >
  Détaille Jobs, CRUD, Services et Utils pour UNE entité depuis le FR mapping.
  Auto-vérifie la couverture FR. Lit les best practices business logic.
allowed-tools: Read, Write, Glob
model: sonnet
---

# Business Logic — Détail par entité

## Objectif

Détailler TOUTES les fonctions (Jobs, CRUD, Services, Utils) pour UNE entité métier, depuis sa section dans `fr-mapping.md`.

## Arguments attendus

- `entity` : Nom de l'entité (ex: "Property", "User")
- `fr_mapping_path` : Chemin vers fr-mapping.md (ex: `docs/architecture/backend/fr-mapping.md`)

## Process

### 1. Lire les regles et inputs

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques business logic (jobs, CRUD, services) — lire TOUS les fichiers de cette section
- Obligatoire : architecture en couches (definition des couches, regles de decision, nommage)

**Inputs projet** :
1. Lire `{fr_mapping_path}` → extraire la section de l'entite `{entity}`
2. Lire le template : `.claude/resources/templates/docs/architecture/backend/business-logic/business-logic-entity.md`

### 2. Détailler chaque Job

Pour chaque Job listé dans le mapping :

```markdown
### Job: {function_name}

**Type:** {Primaire (reutilisable par d'autres jobs) / Secondaire}
**Inputs:**
- {param}: {type detaille, pas de dict generique}

**Output:** {type detaille}

**Workflow:**
1. `{function}({params})` → {resultat}
2. **SI** {condition} :
   a. `{function_branche_a}({params})` → {resultat}
   b. `{suite_branche_a}({params})`
3. **SINON** :
   a. `{function_branche_b}({params})` → {resultat}
4. [TRANSACTION START]
5. `{crud_function}({params})` → {resultat}
6. [TRANSACTION END]
7. `{service_function}({params})`
8. Return {resultat final}

**Fonctions utilisees:**
- {function_name} [{type}] (dans mapping)
- {function_name} [{type}] NON DANS MAPPING → A AJOUTER
- {job_primaire} [Job] (si secondaire, lister les jobs primaires appeles)
```

### 3. Détailler chaque CRUD

```markdown
### CRUD: {function_name}

**Inputs:** {params détaillés}
**Output:** {type}
**Table:** {table_name}
**Opération:** INSERT/SELECT/UPDATE/DELETE avec colonnes
```

### 4. Détailler chaque Service

```markdown
### Service: {function_name}

**Inputs:** {params}
**Output:** {type}
**Service externe:** {nom du service}
**Opération:** {description}
```

### 5. Détailler chaque Utils

```markdown
### Utils: {function_name}

**Inputs:** {params}
**Output:** {type}
**Règles:** {liste des règles de validation/transformation}
```

### 6. Auto-vérification

Avant d'écrire le fichier final :
1. Vérifier que TOUS les FR de l'entité ont au moins une fonction
2. Vérifier que toutes les fonctions appelées dans les workflows existent
3. Si une fonction est utilisée mais pas dans le mapping → marquer ⚠️
4. Produire un mini-rapport de couverture en fin de fichier

## Output

**Fichier** : `docs/architecture/backend/business-logic/{entity}.md`

Terminer le fichier par :

```markdown
## Auto-vérification

- FR couverts : X/X ✅
- Fonctions dans mapping : Y ✅
- Fonctions ajoutées (hors mapping) : Z ⚠️
  - {function_name} [{type}] — utilisée dans {job_name}
```

## Convention de nommage

- Noms descriptifs, SANS suffixes techniques (`_job`, `_crud`, `_service`)
- Le type est défini par le dossier (`jobs/`, `crud/`, `services/`, `utils/`)
- snake_case uniquement
