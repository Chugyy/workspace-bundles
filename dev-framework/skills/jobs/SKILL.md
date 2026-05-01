---
name: jobs
description: >
  Definit les entites, la logique metier, les interactions et genere les JSON configs.
  Phase 1 : vue humaine (checkpoint). Phase 2 : generation technique (agents paralleles).
  Fusion de l'ancien greenfield-jobs + arch-business-logic.
allowed-tools: Read, Write, Agent, Glob, Grep, Bash
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif.

# Jobs — Du besoin a la logique metier

Ce skill fait DEUX passes :
1. **Vue humaine** (checkpoint) — presenter les jobs en langage naturel, valider avec l'utilisateur
2. **Generation technique** (agents) — produire les JSON configs et la documentation detaillee

---

## Inputs

Chercher dans l'ordre :
1. `docs/prd.md` — Si present, extraire les FR (Functional Requirements)
2. Si absent — poser les questions directement a l'utilisateur (pas de STOP)

Aussi charger si present :
- `../lib/*/` avec `type: research` dans `meta.yaml` — services externes deja documentes
- `.claude/resources/researches/*.md` — anciennes recherches locales

---

## Phase 1 — Identification (silencieux)

### 1.1 Extraction

Depuis le PRD (ou la conversation), identifier :
1. **Entites metier** (User, Property, Booking...)
2. **Pour chaque FR** : type de fonction (Job / CRUD / Utils / Service) + fonction principale
3. **Services externes necessaires**

### 1.2 Classification des fonctions

- **Jobs** : orchestrent une action metier complete (ex: "creer une reservation" = validation + CRUD + notification)
- **CRUD** : operations DB pures (create, read, update, delete, list, filtres)
- **Utils** : logique pure sans I/O (validation, calculs, formatage)
- **Services** : interaction avec l'exterieur (API, email, AI, storage)

### 1.3 Choix de services

**Preferences implicites (pas de question)** :
- Local > API externe (lib Python > API tierce)
- Open source > proprietaire
- Simple > complexe
- Gratuit > payant

Exemples de decisions silencieuses :
- PDF generation → `weasyprint` ou `reportlab` (pas d'API externe)
- Image resize → `Pillow` (pas Cloudinary)
- Validation email format → regex (pas d'API)
- Markdown → HTML → `markdown` lib (pas d'API)

**Questions UNIQUEMENT pour** :
- Impact cout significatif ("Claude API vs modele local ?")
- Impact fonctionnel ("Stripe vs Lemon Squeezy ?")
- Impossible sans input ("Tu as un compte email provider ?")

**NE PAS demander** :
- Quel ORM (on n'en utilise pas — asyncpg direct)
- Quel framework (FastAPI — c'est dans le template)
- Quel validator (Pydantic — c'est dans le template)
- Quel format de date, encoding, etc. (conventions du projet)

---

## CHECKPOINT — Vue Jobs

Presenter l'application du point de vue de ce qu'elle FAIT, pas de comment elle est codee.

### Format de presentation

Pour chaque entite principale, presenter les jobs en langage humain avec branches conditionnelles :

```
{Entite}

  . Quand un {role} {action} :
    1. {etape 1 en francais}
    2. {etape 2 en francais}
    3. SI {condition} :
       a. {branche A}
    4. SINON :
       a. {branche B}
    5. {etape commune}
    -> Resultat : {outcome principal OU outcome alternatif}
    -> Service utilise : {service} ({justification courte})
```

**Exemple concret :**

```
Booking

  . Quand un client reserve un logement :
    1. On verifie les disponibilites
    2. On calcule le prix total
    3. SI le client est abonne premium :
       a. On applique la reduction
       b. On utilise le moyen de paiement enregistre
    4. SINON :
       a. On redirige vers Stripe Checkout
       b. On attend le webhook de confirmation
    5. SI le paiement est confirme :
       a. On bloque les dates
       b. On envoie un email de confirmation via Resend
       c. On notifie le proprietaire
    6. SINON :
       a. On enregistre l'echec
       b. On notifie le client
    -> Resultat : reservation confirmee OU echec avec notification
    -> Services : Stripe (paiement), Resend (email)
```

**Jobs reutilisables (primaires)** : si un meme bloc d'etapes apparait dans plusieurs jobs :

```
  . [Primaire] Scraper un profil :
    1. On recupere la page
    2. On extrait les donnees structurees
    -> Resultat : donnees du profil
    -> Utilise par : onboarding, sync journalier, enrichissement contact
```

### Recapitulatif services

Apres les jobs, presenter un tableau services :

| Service | Utilise pour | Type | Choix |
|---------|-------------|------|-------|
| Stripe | Paiement | API externe | Confirme par user |
| Resend | Email transactionnel | API externe | Decision LLM (gratuit < 3k/mois) |
| Pillow | Resize images | Lib Python locale | Decision LLM (pas besoin d'API) |

**L'utilisateur** : valide, challenge les choix, ou ajuste les workflows.

---

## Phase 2 — Generation technique (apres validation)

### 2.1 Ecrire les documents de base

Creer `docs/architecture/configs/` si absent.

**`docs/architecture/entities.md`** — Liste des entites avec description.
**`docs/architecture/fr-mapping.md`** — Mapping FR -> entite -> type (Job/CRUD/Utils/Service) -> fonction.

### 2.2 Generer les JSON configs (agents paralleles, 1 par entite)

**Agent** : `detail-business-logic-entity` (xN entites)
**Input** : `docs/architecture/fr-mapping.md` (section entite) + recherches services si pertinent
**Contexte agent** : `.claude/resources/rules/best-practises-business-logic/`
**Output markdown** : `docs/architecture/business-logic/{entity}.md`
**Output JSON** : `docs/architecture/configs/crud-{entity}.json` + `docs/architecture/configs/jobs-{entity}.json`

**IMPORTANT** : Le prompt de chaque agent DOIT inclure les formats JSON EXACTS ci-dessous. Ne PAS dire "voir docstring" — coller le format directement dans le prompt.

```
Pour chaque entite dans entities.md :
  Agent(detail-business-logic-entity, prompt="
    Entite: {entity}
    fr_mapping_path: docs/architecture/fr-mapping.md
    configs_output_path: docs/architecture/configs/

    EN PLUS du markdown business-logic, generer les JSON configs.

    FORMAT EXACT crud-{entity}.json :
    {
      \"entity\": \"note\",
      \"table\": \"notes\",
      \"functions\": [
        {
          \"name\": \"create_note\",
          \"type\": \"create\",
          \"sql\": \"INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *\",
          \"params\": [
            {\"name\": \"title\", \"type\": \"str\"},
            {\"name\": \"content\", \"type\": \"str\"}
          ],
          \"returns\": \"dict\"
        },
        {
          \"name\": \"list_notes\",
          \"type\": \"list\",
          \"sql\": \"SELECT * FROM notes ORDER BY created_at DESC\",
          \"params\": [],
          \"returns\": \"list[dict]\"
        },
        {
          \"name\": \"get_note_by_id\",
          \"type\": \"get\",
          \"sql\": \"SELECT * FROM notes WHERE id = $1\",
          \"params\": [{\"name\": \"note_id\", \"type\": \"int\"}],
          \"returns\": \"dict | None\"
        },
        {
          \"name\": \"update_note\",
          \"type\": \"update\",
          \"sql\": \"UPDATE notes SET title = COALESCE($2, title) WHERE id = $1 RETURNING *\",
          \"params\": [
            {\"name\": \"note_id\", \"type\": \"int\"},
            {\"name\": \"title\", \"type\": \"str | None\", \"default\": \"None\"}
          ],
          \"returns\": \"dict | None\"
        },
        {
          \"name\": \"delete_note\",
          \"type\": \"delete\",
          \"sql\": \"DELETE FROM notes WHERE id = $1 RETURNING id\",
          \"params\": [{\"name\": \"note_id\", \"type\": \"int\"}],
          \"returns\": \"bool\"
        }
      ]
    }

    REGLES JSON CRUD :
    - Cles obligatoires par fonction : name, type, sql, params, returns
    - type = create | get | list | update | delete
    - params = liste de {name, type} (PAS \"inputs\", PAS un dict)
    - returns = \"dict\" | \"dict | None\" | \"list[dict]\" | \"bool\" (PAS un objet)
    - sql = requete SQL complete avec $1, $2... (PAS de pseudo-code)
    - Cle racine \"table\" (singulier, PAS \"tables\")

    FORMAT EXACT jobs-{entity}.json (si jobs) :
    {
      \"entity\": \"booking\",
      \"jobs\": [
        {
          \"name\": \"create_booking\",
          \"description\": \"Validates availability, creates booking, sends confirmation\",
          \"params\": [
            {\"name\": \"pool\", \"type\": \"asyncpg.Pool\"},
            {\"name\": \"property_id\", \"type\": \"int\"}
          ],
          \"returns\": \"dict\",
          \"steps\": [\"1. Validate dates\", \"2. Check availability\"],
          \"imports_crud\": [\"create_booking_crud\"],
          \"imports_services\": [\"email_service\"],
          \"imports_utils\": [\"validate_booking_dates\"]
        }
      ]
    }
  ")
```

### 2.3 Auto-verification

1. Pour chaque fonction dans fr-mapping.md, verifier presence dans business-logic/{entity}.md
2. Auto-fix : typos, deplacements entre entites
3. Verifier couverture FR : chaque FR doit avoir au moins une fonction
4. Si erreur bloquante, noter mais continuer

---

## Outputs

```
Livrables :
- docs/architecture/entities.md
- docs/architecture/fr-mapping.md
- docs/architecture/business-logic/*.md (1 par entite)
- docs/architecture/configs/crud-*.json (1 par entite)
- docs/architecture/configs/jobs-*.json (si jobs, 1 par entite)
```
