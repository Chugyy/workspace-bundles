# Backend Architecture Context

**Stack** : FastAPI + PostgreSQL (asyncpg) + Pydantic 2.x

---

## Architecture en Couches (bottom-up)

```
┌─────────────────────────────────────────┐
│         COUCHE API (Endpoints)          │  ← Routes FastAPI + Pydantic models
│  - Validation inputs/outputs            │
│  - Delegue a Jobs ou CRUD direct        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         COUCHE JOBS (Business Logic)    │  ← Orchestration logique metier
│  - Workflows avec fonctions pures       │
│  - Combine CRUD + Utils + Services      │
└─────────────────────────────────────────┘
                  ↓
┌────────────────┬────────────────────────┐
│ FONCTIONS PURES                         │
├────────────────┼────────────────────────┤
│ CRUD (DB)      │ Services (Externes)    │  ← Fonctions atomiques reutilisables
│ - create_user()│ - send_email()         │
│ - get_user()   │ - upload_photo()       │
│ - update_user()│ - create_customer()    │
│ - delete_user()│                        │
├────────────────┤                        │
│ Utils (Logic)  │                        │
│ - validate_email()                      │
│ - format_phone()                        │
│ - calculate_total()                     │
└────────────────┴────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         DATABASE (PostgreSQL)           │  ← Schema + Models + Relations
└─────────────────────────────────────────┘
```

---

## Definitions

### CRUD (Database Layer)
**Role** : Operations atomiques sur la base de donnees

**Exemples** :
- `create_user(email, password_hash, name)` dans `crud/user.py`
- `get_user_by_id(user_id)` dans `crud/user.py`
- `update_property(property_id, **fields)` dans `crud/property.py`
- `delete_order(order_id)` dans `crud/order.py`

**Caracteristiques** :
- Une fonction = une requete SQL
- Retourne dict Python (pas de logique metier)
- Gere uniquement la persistence

---

### Services (External Layer)
**Role** : Interactions avec APIs tierces ou libraries externes

**Exemples** :
- `send_email(to, subject, body)` dans `services/email.py`
- `upload_file(file_data, bucket)` dans `services/storage.py`
- `charge_payment(amount, card_token)` dans `services/stripe.py`
- `geocode_address(address)` dans `services/maps.py`

**Caracteristiques** :
- Client/wrapper autour d'API externe
- Gere authentification/retry/erreurs externes
- Pas de logique metier (juste appel)

---

### Utils (Pure Logic)
**Role** : Fonctions utilitaires reutilisables (validation, transformation, calcul)

**Exemples** :
- `validate_email(email)` dans `utils/user.py`
- `hash_password(password)` dans `utils/user.py`
- `format_phone(phone)` dans `utils/contact.py`
- `calculate_discount(price, percentage)` dans `utils/order.py`

**Caracteristiques** :
- Pures (input -> output, pas d'effet de bord)
- Reutilisables partout
- Pas d'acces DB ou API

---

### Jobs (Business Logic)
**Role** : Orchestration de fonctions pures pour creer workflows metier complets

**Exemple** :
```python
# jobs/user.py

from app.database.crud.user import create_user
from app.core.utils.user import validate_email, hash_password
from app.core.services.email import send_email

async def register(pool, email: str, password: str, name: str) -> dict:
    """
    Workflow: Creer utilisateur avec email de bienvenue

    Steps:
    1. Valider email (Utils)
    2. Hasher password (Utils)
    3. Creer en DB (CRUD)
    4. Envoyer email bienvenue (Service)
    """
    if not validate_email(email):
        raise ValueError("Email invalide")

    hashed = hash_password(password)

    user = await create_user(pool, email=email, password_hash=hashed, name=name)

    await send_email(to=user["email"], subject="Welcome!", body="...")

    return user
```

**Caracteristiques** :
- Combine plusieurs fonctions pures
- Contient conditions/validations metier
- Gere transactions si multi-CRUD
- Retourne dict ou DTO Pydantic

---

## Regle de Decision : Job vs CRUD direct vs Service direct

### Utiliser **Job** si :
- Logique metier complexe (validation + transformation + orchestration)
- Combine plusieurs fonctions pures (CRUD + Utils + Services)
- Workflow avec conditions/branches
- Transaction multi-etapes

**Exemples** :
- `register` dans `jobs/user.py` → valider + hasher + creer + envoyer email
- `place_order` dans `jobs/order.py` → valider stock + creer commande + charger paiement + notifier

---

### Utiliser **CRUD direct** si :
- Operation DB simple et atomique
- Aucune logique metier (juste lecture/ecriture)
- Pas de validation complexe (Pydantic suffit)

**Exemples** :
- `GET /api/users/{id}` → `crud/user.py:get_user_by_id`
- `GET /api/properties?status=active` → `crud/property.py:list_properties`
- `DELETE /api/orders/{id}` → `crud/order.py:delete_order`

---

### Utiliser **Service direct** si :
- Appel externe simple (upload, email, SMS)
- Aucune orchestration necessaire
- Action independante

**Exemples** :
- `POST /api/files/upload` → `services/storage.py:upload_file`
- `POST /api/notifications/sms` → `services/sms.py:send_sms`

---

## Conventions de Nommage

### PAS de suffixes de couche, OUI au contexte entite

Le suffixe de couche (`_crud`, `_job`, `_service`) est inutile — le dossier le dit deja.
Mais le nom de l'entite/action DOIT etre dans le nom de la fonction pour la lisibilite au call site.

```
# CORRECT — contexte clair, pas de suffixe de couche
crud/user.py       → create_user(), get_user_by_id(), list_users()
crud/order.py      → create_order(), delete_order()
jobs/user.py       → register(), update_profile()
jobs/order.py      → place_order(), cancel_order()
services/email.py  → send_email(), send_welcome()
services/stripe.py → charge_payment(), create_customer()
utils/user.py      → validate_email(), hash_password()
utils/order.py     → calculate_total(), validate_order_data()

# INCORRECT — suffixes de couche inutiles
crud/user_crud.py  → create_user_crud()
jobs/user_job.py   → register_user_job()
services/email_service.py → send_email_service()

# INCORRECT — trop generique, illisible au call site
crud/user.py       → create(), get_by_id()
services/email.py  → send()
```

### Structure de fichiers : dossier vs fichier plat

**Un seul fichier** → fichier plat a la racine du dossier de couche :
```
services/
├── email.py          # Un seul fichier pour email
├── stripe.py         # Un seul fichier pour stripe
```

**Plusieurs fichiers lies** → sous-dossier :
```
services/
├── email.py          # Simple, un fichier suffit
└── youtube/          # Complexe, plusieurs fichiers
    ├── __init__.py
    ├── scraper.py
    ├── oauth.py
    └── pipeline.py
```

Regle : des qu'un module necessite 2+ fichiers, creer un dossier. Ne jamais prefixer avec le nom du module (`youtube_scraper.py`, `youtube_oauth.py`).

### Schemas Pydantic (snake_case → camelCase)

**Code Python** : TOUJOURS `snake_case` (PEP-8)
```python
class UserResponse(BaseModel):
    first_name: str
    last_name: str
    created_at: datetime
```

**JSON API** : TOUJOURS `camelCase` (convention JavaScript/TypeScript)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Configuration avec Pydantic v2** :
```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
```

---

## Exemples Pratiques

| Endpoint | Fonction | Fichier | Type | Raison |
|----------|----------|---------|------|--------|
| POST /api/users | register | jobs/user.py | Job | Validation + hash + create + email |
| GET /api/users/{id} | get_user_by_id | crud/user.py | CRUD | Simple lecture DB |
| PUT /api/users/{id} | update_profile | jobs/user.py | Job | Validation + update + notification |
| DELETE /api/users/{id} | delete_user | crud/user.py | CRUD | Simple delete DB |
| POST /api/orders | place_order | jobs/order.py | Job | Valider stock + creer + payer + notifier |
| GET /api/orders | list_orders | crud/order.py | CRUD | Simple liste avec filtres |
| POST /api/files/upload | upload_file | services/storage.py | Service | Appel direct S3/Cloudinary |

---

## Points Cles

1. **Jobs = orchestration** (combine fonctions pures)
2. **CRUD = persistence** (une fonction = une requete SQL)
3. **Services = external** (APIs tierces)
4. **Utils = logic** (fonctions pures reutilisables)
5. **Endpoints API deleguent toujours** a Job OU fonction pure (jamais de logique inline)
6. **Fonctions pures sont reutilisables** entre differents Jobs
7. **Pas de suffixes de couche** (`_crud`, `_job`, `_service`), mais garder le contexte entite dans le nom
8. **Dossier si 2+ fichiers** : ne jamais prefixer les fichiers avec le nom du module
9. **Combiner les entites proches** : une entite satellite (log, historique, config) vit dans le fichier de son entite parent
