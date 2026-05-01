# CRUD Operations - Bonnes Pratiques

## Definition

Une fonction CRUD = une operation atomique sur la base de donnees. Une fonction = une requete SQL. Pas de logique metier, pas de side effects.

---

## Regles

### 1. Une fonction = une requete SQL

Chaque fonction CRUD execute exactement une requete. Si un workflow necessite plusieurs requetes, c'est un job.

```python
# CORRECT — une requete
async def create_user(pool, email, name, password_hash):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *",
            email, name, password_hash
        )
        return dict(row)

# INCORRECT — deux requetes = devrait etre un job
async def create_user_with_settings(pool, email, name):
    user = await create_user(pool, email, name)
    await create_user_settings(pool, user["id"])  # ← ca c'est de l'orchestration
    return user
```

### 2. Parameterized queries uniquement

Toujours utiliser `$1, $2...` pour les parametres. Jamais de f-string, `.format()`, ou concatenation.

```python
# CORRECT
row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)

# INCORRECT — injection SQL
row = await conn.fetchrow(f"SELECT * FROM users WHERE email = '{email}'")
```

### 3. Retourner dict(row)

Toujours convertir le resultat asyncpg en dict Python. Jamais retourner un `asyncpg.Record` brut.

```python
# CORRECT
return dict(row) if row else None
return [dict(r) for r in rows]

# INCORRECT
return row  # asyncpg.Record — pas serializable, API differente
```

### 4. Pool, pas connection

Les fonctions CRUD recoivent le `pool` asyncpg et acquierent leur propre connection. Pas de connection partagee entre fonctions.

```python
# CORRECT
async def get_user_by_id(pool: asyncpg.Pool, user_id: int):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return dict(row) if row else None
```

### 5. Entites satellites dans le meme fichier

Si une entite est un sous-objet d'une autre (log, setting, item), ses fonctions CRUD vont dans le fichier du parent.

```python
# crud/automation.py — parent + satellite ensemble
async def create_automation(pool, ...): ...
async def list_automations(pool, ...): ...
async def create_automation_log(pool, automation_id, ...): ...
async def list_automation_logs(pool, automation_id, ...): ...
```

### 6. Configuration via settings

```python
from config.config import settings
# JAMAIS: import os; os.environ.get(...)
```

---

## Nommage

- Contexte entite dans le nom : `create_user`, `get_order_by_id`, `list_products`
- PAS de suffixe de couche : `create_user`, pas `create_user_crud`
- Conventions : `create_`, `get_*_by_`, `list_`, `update_`, `delete_`
