# Jobs - Bonnes Pratiques

## Definition

Un job = une fonction d'orchestration qui combine CRUD + Utils + Services pour realiser un workflow metier complet. Le job ne contient PAS de logique pure ni d'acces DB direct.

---

## Regles

### 1. Un job = un workflow metier coherent

Un job orchestre les etapes d'UNE action metier. S'il touche des entites sans rapport entre elles, il doit etre splitte.

```python
# CORRECT — un workflow coherent
async def register_user(pool, email, password, name):
    validate_user_data({"email": email})          # Utils
    hashed = hash_password(password)              # Utils
    user = await create_user(pool, email=email, password_hash=hashed, name=name)  # CRUD
    await send_email(to=email, subject="Welcome") # Service
    return user

# INCORRECT — deux workflows melanges
async def register_and_setup_billing(pool, email, password, plan):
    # Inscription (workflow 1)
    user = await create_user(pool, email=email, ...)
    # Billing (workflow 2 — devrait etre un job separe)
    customer = await create_stripe_customer(email)
    subscription = await create_subscription(customer["id"], plan)
    await create_billing_record(pool, user_id=user["id"], ...)
```

### 2. Jamais de SQL direct

Un job n'accede JAMAIS a la DB directement. Toujours via les fonctions CRUD.

```python
# CORRECT
user = await get_user_by_id(pool, user_id)

# INCORRECT
async with pool.acquire() as conn:
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
```

### 3. Jamais de logique pure inline

La validation, les calculs et le formatage vont dans utils. Le job les appelle.

```python
# CORRECT
from app.core.utils.booking import validate_booking_dates, calculate_booking_total

async def create_booking(pool, check_in, check_out, price):
    validate_booking_dates(check_in, check_out)
    total = calculate_booking_total(check_in, check_out, price)
    return await create_booking_db(pool, check_in=check_in, check_out=check_out, total=total)

# INCORRECT — logique pure dans le job
async def create_booking(pool, check_in, check_out, price):
    if check_in >= check_out:
        raise ValueError("check_in must be before check_out")
    nights = (check_out - check_in).days
    total = nights * price
    return await create_booking_db(pool, ...)
```

### 4. Side effects hors transaction

Les appels services (email, notifications, APIs externes) sont TOUJOURS hors de la transaction DB.

```python
# CORRECT
async def place_order(pool, **params):
    async with pool.acquire() as conn:
        async with conn.transaction():
            order = await create_order(pool, **params)
            await update_product_stock(pool, product_id, -1)
    # Hors transaction
    await send_order_confirmation(to=order["email"])
    return order
```

### 5. Pas de job wrapper inutile

Si un job ne fait que relayer les params a un seul CRUD, il est inutile. La route doit appeler le CRUD directement.

```python
# INUTILE — la route devrait appeler CRUD directement
async def get_user(pool, user_id):
    return await get_user_by_id(pool, user_id)

# JUSTIFIE — il y a de l'orchestration
async def get_user_with_stats(pool, user_id):
    user = await get_user_by_id(pool, user_id)
    orders = await list_orders_by_user(pool, user_id)
    user["order_count"] = len(orders)
    user["total_spent"] = sum(o["total"] for o in orders)
    return user
```

---

### 6. Combiner les entites proches

Si une entite est satellite d'une autre (log, historique, config, metadata), elle vit dans le meme fichier que son parent. Pas de fichier separe.

```python
# CORRECT — automation et ses logs dans le meme fichier
# crud/automation.py
async def create_automation(pool, ...): ...
async def list_automations(pool, ...): ...
async def create_automation_log(pool, automation_id, ...): ...
async def list_automation_logs(pool, automation_id, ...): ...

# INCORRECT — fichier separe pour un sous-objet
# crud/automation.py
async def create_automation(pool, ...): ...
# crud/automation_log.py   ← inutile, c'est un sous-objet
async def create_automation_log(pool, ...): ...
```

Indicateurs qu'une entite est satellite :
- Son nom contient le nom du parent (`automation_log`, `user_setting`, `order_item`)
- Elle n'a pas de sens sans son parent (un log sans automation = rien)
- Elle est toujours requetee via le parent (`WHERE automation_id = $1`)

---

### 7. Jobs primaires et jobs secondaires

Un **job primaire** = un job reutilisable, appele par d'autres jobs. Il orchestre de la logique metier partagee (CRUD + utils + services). A ne pas confondre avec un service (qui wrappe une API externe sans logique metier).

Un **job secondaire** = un job qui appelle des jobs primaires pour composer un workflow plus large.

```python
# JOB PRIMAIRE — reutilisable, appele par plusieurs jobs
# jobs/scrape_profile.py
async def scrape_profile(pool, url: str) -> dict:
    """Scrape un profil et retourne les donnees structurees."""
    html = await fetch_page(url)
    data = extract_profile_data(html)
    return data

# JOBS SECONDAIRES — composent avec le job primaire
# jobs/onboard_user.py
async def onboard_user(pool, user_id, profile_url):
    data = await scrape_profile(pool, profile_url)
    await update_user_profile(pool, user_id, **data)
    await send_welcome_email(pool, user_id)

# jobs/sync_daily.py
async def sync_contacts(pool, contacts):
    for contact in contacts:
        data = await scrape_profile(pool, contact["url"])
        await update_contact(pool, contact["id"], **data)
```

**Quand extraire un job primaire** :
- Une sequence de 2+ etapes (CRUD/utils/services) est dupliquee dans 2+ jobs
- Les parametres qui varient entre les instances definissent la signature du job primaire
- Le job primaire retourne un resultat utilisable par les appelants

**Comment definir les parametres** :
1. Identifier le code duplique dans chaque job
2. Lister les valeurs qui changent entre les instances
3. Ces valeurs = les parametres du job primaire
4. Le retour = l'intersection des donnees utilisees par les appelants apres l'appel

```python
# AVANT — code duplique, parametres differents
# jobs/onboard_user.py
html = await fetch_page(profile_url)        # url varie
data = extract_profile_data(html)
await update_user_profile(pool, user_id, **data)  # action post varie

# jobs/enrich_contact.py
html = await fetch_page(contact_url)        # url varie
data = extract_profile_data(html)
await update_contact(pool, contact_id, **data)    # action post varie

# ANALYSE : le code commun = fetch + extract. Le parametre qui varie = url.
# L'action post n'est PAS dans le job primaire (elle differe).
# → Job primaire : scrape_profile(pool, url) -> dict
```

---

### 8. Structure du dossier jobs

```
jobs/
├── scrape_profile.py      # Primaire — reutilisable
├── send_notification.py   # Primaire — reutilisable
├── onboard_user.py        # Secondaire — appelle scrape_profile + send_notification
├── sync_daily.py          # Secondaire — appelle scrape_profile
└── enrich_contact.py      # Secondaire — appelle scrape_profile
```

Pas de sous-dossier `jobs/primary/` vs `jobs/secondary/`. La distinction est implicite : un job primaire est importe par d'autres jobs, un job secondaire non.

---

## Nommage

- PAS de suffixes de couche (`_job`) mais garder le contexte entite
- `register_user`, `place_order`, `cancel_booking` — clair au call site
- PAS `register_user_job` (suffixe couche inutile) ni `register` (trop generique)
