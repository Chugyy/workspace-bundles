---
name: api
description: >
  API REST par entite depuis business-logic + schema. 1 agent par entite en parallele.
  Produit markdown api + JSON configs routes.
allowed-tools: Read, Write, Agent, Glob, Grep, Bash
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif.

# API Endpoints par entite

Generation silencieuse. Pas de checkpoint humain.

## Prerequis

1. Lire `docs/architecture/business-logic/*.md` — Si absent, STOP, lancer `/jobs`
2. Lire `docs/architecture/schema.md` — Si absent, STOP, lancer `/schema`
3. `docs/architecture/configs/` doit exister

---

## Phase 1 — API Endpoints (parallele, 1 agent par entite)

**Agent** : `api-architect` (xN entites)
**Input** : `docs/architecture/business-logic/{entity}.md` + `docs/architecture/schema.md`
**Contexte** : `.claude/resources/rules/best-practises-build-api/`
**Output markdown** : `docs/architecture/api/{entity}.md`
**Output JSON** : `docs/architecture/configs/routes-{entity}.json`

**IMPORTANT** : Le prompt de chaque agent DOIT inclure le format JSON EXACT ci-dessous. Ne PAS dire "voir docstring" — les agents ne lisent pas toujours les fichiers Python. Coller le format directement dans le prompt.

```
Pour chaque entite :
  Agent(api-architect, prompt="
    entity: {entity}
    architecture_path: docs/architecture/backend
    configs_output_path: docs/architecture/configs/

    EN PLUS du markdown API, generer le JSON config routes.

    FORMAT EXACT routes-{entity}.json :
    {
      \"entity\": \"note\",
      \"entity_plural\": \"notes\",
      \"prefix\": \"/api/notes\",
      \"crud_module\": \"app.database.crud.note\",
      \"fields\": [
        {\"name\": \"title\", \"type\": \"str\", \"max_length\": 200, \"required\": true},
        {\"name\": \"content\", \"type\": \"str\", \"required\": true}
      ],
      \"response_fields\": [
        {\"name\": \"id\", \"type\": \"int\"},
        {\"name\": \"title\", \"type\": \"str\"},
        {\"name\": \"created_at\", \"type\": \"datetime\"},
        {\"name\": \"updated_at\", \"type\": \"datetime\"}
      ],
      \"endpoints\": [
        {\"method\": \"get\", \"path\": \"\", \"name\": \"list_notes\", \"crud_func\": \"list_notes\", \"status_code\": 200, \"paginated\": true, \"response_model\": \"NotesListResponse\"},
        {\"method\": \"post\", \"path\": \"\", \"name\": \"create_note\", \"crud_func\": \"create_note\", \"status_code\": 201, \"body_model\": \"NoteCreate\", \"response_model\": \"NoteResponse\"},
        {\"method\": \"patch\", \"path\": \"/{note_id}\", \"name\": \"update_note\", \"crud_func\": \"update_note\", \"status_code\": 200, \"body_model\": \"NoteUpdate\", \"response_model\": \"NoteResponse\", \"path_param\": \"note_id\"},
        {\"method\": \"delete\", \"path\": \"/{note_id}\", \"name\": \"delete_note\", \"crud_func\": \"delete_note\", \"status_code\": 204, \"path_param\": \"note_id\"}
      ]
    }

    REGLES JSON ROUTES :
    - Cles racine OBLIGATOIRES : entity, entity_plural, prefix, crud_module, fields, response_fields, endpoints
    - entity_plural = pluriel anglais (notes, users, sessions)
    - prefix = route URL (ex: /api/notes)
    - crud_module = import path (ex: app.database.crud.note)
    - fields = champs pour les models Create/Update (PAS les champs auto comme id, created_at)
    - response_fields = TOUS les champs retournes (inclut id, timestamps)
    - Chaque endpoint : method, path, name, status_code sont OBLIGATOIRES
    - crud_func OU job_func pour indiquer la fonction appelee
    - body_model pour POST/PATCH, response_model pour la reponse
    - path_param si l'endpoint a un parametre de path
  ")
```

---

## Output

```
Livrables :
- docs/architecture/api/*.md (1 par entite)
- docs/architecture/configs/routes-*.json (1 par entite)

Next Step : /frontend (si frontend) ou /build (si backend-only)
```
