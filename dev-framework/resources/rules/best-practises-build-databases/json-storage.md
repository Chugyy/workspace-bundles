# Stockage JSON/JSONB — Best Practices

Regles pour decider quand utiliser JSONB, comment gerer l'evolution du schema, et quelles alternatives envisager.

---

## Principe 1 — Hybride toujours : colonnes pour le hot, JSONB pour le reste

### Regle de decision

**Promouvoir en colonne SQL** tout champ qui est :
- Filtre (`WHERE status = 'closed'`)
- Trie (`ORDER BY score DESC`)
- Joint (FK vers une autre table)
- Agrege (`COUNT`, `SUM`, `AVG`)

**Garder en JSONB** tout champ qui est :
- Lu comme un bloc, jamais requete individuellement
- De forme variable (selon le contexte)
- Un blob de sortie d'un LLM / d'une API externe

```sql
-- CORRECT : hybride
CREATE TABLE calls (
    id              BIGSERIAL PRIMARY KEY,
    status          VARCHAR(20) NOT NULL,        -- hot : filtre → colonne
    closing_score   INTEGER GENERATED ALWAYS AS  -- hot : tri → colonne generee
                    ((summary_json->>'closingScore')::int) STORED,
    summary_json    JSONB,                       -- bloc IA → JSONB
    notes           JSONB                         -- structure fermee → JSONB
);

-- INCORRECT : tout en JSONB
CREATE TABLE calls (
    id      BIGSERIAL PRIMARY KEY,
    data    JSONB  -- contient status, score, summary, notes...
);
-- → WHERE data->>'status' = 'x' fait un tablescan
-- → Pas de stats planner sur les clefs JSONB
```

### Pourquoi

- PostgreSQL **ne maintient aucune statistique** sur les clefs JSONB → planner fait des mauvais choix
- `jsonb_set()` reecrit **tout** le document → cout WAL + TOAST sur chaque update
- Les predicats `data->>'x'` n'utilisent pas les index GIN standards

### Colonnes generees (feature Postgres 12+)

Permettent de promouvoir un champ JSON en colonne indexable **sans dupliquer la donnee** :

```sql
closing_score INTEGER GENERATED ALWAYS AS 
    ((summary_json->>'closingScore')::int) STORED
```

Apres `CREATE INDEX idx_score ON calls(closing_score)`, les requetes sont rapides, la source reste le JSON.

---

## Principe 2 — Versioning par `_v` + migration lazy

### Regle

Chaque document JSONB stocke dans la DB **doit contenir un champ `_v`** (integer) indiquant la version du schema.

```json
{
  "_v": 1,
  "psychologicalProfile": "...",
  "closingScore": 7
}
```

### Pattern de migration lazy

Une fonction `migrate_<entity>()` est appelee **a chaque lecture**, avant de retourner la donnee au client :

```python
def migrate_brief(data: dict) -> dict:
    """Migration lazy d'un brief JSONB vers la version courante."""
    version = data.get("_v", 0)
    
    if version < 1:
        # v0 → v1 : anticipated_objections etait list[str], devient list[{type, description}]
        if "anticipated_objections" in data and data["anticipated_objections"]:
            if isinstance(data["anticipated_objections"][0], str):
                data["anticipated_objections"] = [
                    {"type": "autre", "description": s}
                    for s in data["anticipated_objections"]
                ]
        data["_v"] = 1
    
    if version < 2:
        # v1 → v2 : ajout red_alerts et maturity_level
        data.setdefault("red_alerts", [])
        data.setdefault("maturity_level", "tiede")
        data["_v"] = 2
    
    return data
```

### Pourquoi pas de migration eager (batch UPDATE) ?

- Bloque la table pendant la migration (locks)
- Genere du WAL massif sur gros volumes
- Si la migration echoue a mi-parcours, etat incoherent
- Lazy migration = zero-downtime, progressif

Source : [Zero-Downtime PostgreSQL JSONB Migration](https://medium.com/@shinyjai2011/zero-downtime-postgresql-jsonb-migration-a-practical-guide-for-scalable-schema-evolution-9f74124ef4a1)

---

## Principe 3 — Append-only : jamais renommer en place

### Regles strictes

| Operation | Autorise ? | Comment |
|-----------|------------|---------|
| Ajouter un champ optionnel | Oui | Ecrit par les nouveaux, `null`/defaut par les vieux |
| Ajouter un champ obligatoire | Non | Ajouter en optionnel d'abord, backfill, puis bumper `_v` |
| Renommer un champ | Non | Ajouter le nouveau, garder l'ancien en deprecated |
| Supprimer un champ | Non, pas avant que `_v` minimum garantisse son absence | |
| Changer le type | Non | Nouveau champ + deprecation |

### Pattern expand-switch-contract

Pour tout changement non trivial :

1. **Expand** : le writer ecrit l'ancien ET le nouveau champ
2. **Switch** : le reader bascule sur le nouveau champ
3. **Contract** : apres N semaines, le writer arrete d'ecrire l'ancien (nouveau `_v`)

Source : [Data Versioning and Schema Evolution Patterns](https://bool.dev/blog/detail/data-versioning-patterns)

---

## Principe 4 — Validation stricte a l'ecriture, tolerante a la lecture (loi de Postel)

### A l'ecriture

**Defense en profondeur** :

1. **Pydantic au boundary FastAPI** — rejette les requetes malformees
2. **CHECK constraint Postgres** via `pg_jsonschema` (Supabase extension) — double filet en cas de bug code

```sql
-- Installation
CREATE EXTENSION IF NOT EXISTS pg_jsonschema;

-- Contrainte
ALTER TABLE calls ADD CONSTRAINT brief_valid_schema
CHECK (
    brief_json IS NULL OR
    jsonb_matches_schema('{
        "type": "object",
        "properties": {
            "_v": {"type": "integer"},
            "psychologicalProfile": {"type": "string"},
            "closingScore": {"type": "integer"}
        },
        "required": ["_v"]
    }'::json, brief_json)
);
```

### A la lecture

**Pydantic tolerant** :

```python
class BriefResponse(BaseSchema):
    model_config = {"extra": "ignore"}  # Ignore les champs inconnus (forward compat)
    
    psychological_profile: str = Field(default="")
    closing_score: int = Field(default=5)
    red_alerts: List[str] = Field(default_factory=list)
    maturity_level: str = Field(default="tiede")
    # Tous les champs ont un default
```

**Frontend defensif** :

```typescript
// CORRECT
data?.redAlerts?.length ?? 0

// INCORRECT — crash si redAlerts manque
data.redAlerts.length
```

### Pourquoi

- Loi de Postel : "Be conservative in what you send, be liberal in what you accept"
- Un vieux document (avant migration) ne doit jamais casser une lecture
- Un nouveau champ ajoute cote backend ne doit pas casser un client qui ne le connait pas

---

## Principe 5 — Pas d'index GIN sans usage reel

### Regle

**Ne pas creer d'index GIN sur un JSONB si on ne requete jamais dedans.**

Coût GIN :
- Insertion/update : 2-3x plus lent qu'une colonne normale
- Storage : peut doubler la taille de la table
- Bloat : necessite `REINDEX` periodique

### Quand creer un index GIN

Seulement si on fait des requetes de type :
- `WHERE data @> '{"status": "closed"}'` (containment)
- `WHERE data ? 'key'` (key exists)
- `WHERE data ?| array['key1', 'key2']`

**Important** : GIN ne marche PAS pour :
- `WHERE data->>'field' = 'x'` (extraction) → utiliser expression index ou colonne generee

### Types d'index JSONB

```sql
-- Operator class par defaut : tous les operateurs JSONB
CREATE INDEX idx_gin ON calls USING GIN (brief_json);

-- jsonb_path_ops : seulement @>, ?, ?|, ?& — 3x plus petit, plus rapide
CREATE INDEX idx_gin_path ON calls USING GIN (brief_json jsonb_path_ops);

-- Expression index : pour extraction path-specifique
CREATE INDEX idx_score ON calls((brief_json->>'closingScore'));
```

Source : [Indexing JSONB in Postgres - Crunchy Data](https://www.crunchydata.com/blog/indexing-jsonb-in-postgres)

---

## Alternatives au JSONB — quand les choisir

| Option | Quand c'est le bon choix | Quand eviter |
|--------|--------------------------|--------------|
| **Colonnes SQL pures** | Schema stable, requetes analytiques frequentes | Schema variable par entite |
| **Hybride (colonnes + JSONB)** | **Defaut pour contenu IA, metadata, config** | — |
| **EAV (Entity-Attribute-Value)** | Custom fields SaaS multi-tenant (fields definis par user) | Analytics — joins penibles |
| **MongoDB/DocumentDB** | Docs > 1 MB, mutations partielles frequentes, pas de joins | Tu as deja Postgres et besoin de joins |
| **Postgres + S3** | Blobs > 100 KB (audio, video, gros transcripts) | Petits payloads structures |
| **Postgres + Redis** | Cache TTL, sessions, data ephemere | Source of truth |

### Pattern "Postgres + blob storage"

Pour un gros transcript audio/video, **ne PAS stocker le blob en JSONB** :

```sql
CREATE TABLE calls (
    id          BIGSERIAL PRIMARY KEY,
    summary_json JSONB,                     -- petit, OK en JSONB
    transcript   TEXT,                      -- < 100 KB : OK en TEXT
    transcript_url VARCHAR(500)             -- > 100 KB : S3/R2, url ici
);
```

---

## Pitfalls / Anti-patterns

### A ne JAMAIS faire

- **JSONB comme excuse pour pas designer le schema** ("on verra plus tard")
- **`WHERE data->>'x' = 'y'` sans expression index** → tablescan full
- **Renommer un champ sans `_v`** → casse silencieuse de tous les vieux rows
- **Stocker > 1 MB en JSONB** → TOAST thrash a chaque lecture
- **`jsonb_set()` dans un hot update path** → reecriture complete + WAL
- **Nesting > 3 niveaux** → illisible, inqueryable
- **GIN index sur colonne jamais requetee** → cout ecriture pour rien
- **Arrays natifs stockes en JSONB** → utiliser `TEXT[]` ou `INTEGER[]` (plus efficace, indexable par GIN directement)

### Horror stories a retenir

- **Stripe** a subi une panne en 2016 partiellement due a un schema JSON non versionne qui a divergeru entre services. Depuis, `version` est obligatoire dans tous leurs events.
- **Segment** a documente publiquement que **99% de leur data problematique** venait de JSON non versionne.
- **Notion** utilise exclusivement JSONB versionne par `version` pour ses blocs, avec migrations lazy.

---

## Resume : les 5 commandements

1. **Tu ne mettras JAMAIS en JSONB** un champ que tu filtres, tries, joins ou aggreges → colonne SQL (ou colonne generee)
2. **Tu verseras `_v`** dans chaque document JSONB, sans exception
3. **Tu migreras en lazy a la lecture**, jamais en batch a l'aveugle
4. **Tu valideras strictement a l'ecriture**, tolerement a la lecture
5. **Tu n'indexeras GIN que si tu requetes reellement** dans le JSONB

---

## Checklist pour une nouvelle colonne JSONB

- [ ] Ce champ est-il vraiment variable/de forme changeante ? Sinon → colonne
- [ ] Vais-je requeter/filtrer sur ce champ ? Si oui → colonne ou colonne generee
- [ ] La taille moyenne est-elle < 10 KB ? Sinon → envisager S3
- [ ] Le JSON commence-t-il par `{"_v": 1, ...}` ?
- [ ] Y a-t-il une fonction `migrate_<entity>()` prete pour les futures evolutions ?
- [ ] Le Pydantic model a-t-il `extra="ignore"` et des defaults sur tous les champs optionnels ?
- [ ] Ai-je un CHECK constraint avec `pg_jsonschema` pour la validation DB ?
- [ ] Un index GIN est-il vraiment necessaire, ou est-ce une optimisation prematuree ?

---

## Sources

- [AWS — PostgreSQL as a JSON database: advanced patterns](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)
- [Crunchy Data — Indexing JSONB in Postgres](https://www.crunchydata.com/blog/indexing-jsonb-in-postgres)
- [pganalyze — Understanding Postgres GIN Indexes](https://pganalyze.com/blog/gin-index)
- [Supabase — pg_jsonschema extension](https://supabase.com/docs/guides/database/extensions/pg_jsonschema)
- [Pydantic — JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/)
- [Zero-Downtime PostgreSQL JSONB Migration](https://medium.com/@shinyjai2011/zero-downtime-postgresql-jsonb-migration-a-practical-guide-for-scalable-schema-evolution-9f74124ef4a1)
- [Data Versioning and Schema Evolution Patterns](https://bool.dev/blog/detail/data-versioning-patterns)
- [When to Avoid JSONB — Hacker News discussion](https://news.ycombinator.com/item?id=12408634)
- [PostgreSQL docs — JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
