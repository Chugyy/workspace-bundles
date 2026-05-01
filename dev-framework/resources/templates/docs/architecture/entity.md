# {EntityName}

## Contexte

{Description du role de l'entite. 2-3 phrases.}

**FR couverts :** {FR1, FR2, ...}

**Fonctions :**

| Fonction | Type |
|----------|------|
| {function_name} | {CRUD/Job/Service/Utils} |

---

## Business Logic

### CRUD

#### {function_name}

**Inputs:**
- `{param}`: {type} — {description, contraintes}

**Output:** `{ReturnType}`

**Table:** `{table_name}`
**Operation:** {INSERT/SELECT/UPDATE/DELETE/UPSERT}

```sql
{requete SQL exacte}
```

**Regles:**
- {Regle metier 1}

---

### Jobs

#### {function_name}

**FR:** {FRN}
**Declencheur:** {event ou schedule}
**Type:** {Primaire (reutilisable) / Secondaire}

**Workflow:**
1. {Etape 1}
2. {Etape 2}
3. **SI** {condition} :
   a. {Branche A - etape 1}
   b. {Branche A - etape 2}
4. **SINON** :
   a. {Branche B - etape 1}
5. {Etape commune}

**Erreurs:**
- `{ErrorType}` → {comportement}

**Dependances:**
- `{Entity}.{function}` [{type}]
- {Si secondaire} `{job_primaire}` [Job]

---

### Services

#### {function_name}

**Inputs:**
- `{param}`: {type}

**Output:** `{ReturnType}`
**Service externe:** {API, SMTP, etc.}

**Workflow:**
1. {Etape 1}
2. {Etape 2}

---

### Utils

#### {function_name}

**Inputs:** `{param}`: {type}
**Output:** `{ReturnType}`
**Regles:** {transformation/validation}

---

## API Endpoints

### {METHOD} {/api/path}

**Description:** {1 phrase}
**Auth:** {Public / Protected}
**Functions:** `{function_name}` [{type}]

**Input:**
```json
{
  "{field}": "{type} — {contraintes}"
}
```

**Output:**
```json
{
  "{field}": "{type}"
}
```

**Status Codes:**
- `{code}` — {description}

---

## Pydantic Models

```python
class {ModelName}(BaseModel):
    {field}: {type} = Field({constraints})
```

---

## Tables impliquees

### {table_name}

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `{col}` | {TYPE} | {PK/FK/UNIQUE/NOT NULL/DEFAULT} |

---

## Flux complet

```
{METHOD} {/path}
  → {function_1}()
      → {step 1}
      → {step 2}
  ← {status_code} {response}
```

---

## Auto-verification

- FR couverts : {X}/{X}
- Fonctions mapping : {N}
- Fonctions hors mapping : {M} ⚠️
- Endpoints : {N}
- Coherence API ↔ BL ↔ Schema : ✅
