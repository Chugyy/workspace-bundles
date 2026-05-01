# Services - Bonnes Pratiques

## Definition

Un service = un wrapper autour d'une API externe ou d'une librairie tierce. Pas de logique metier, pas d'acces DB. Le service gere l'authentification, le format des requetes/reponses, et les erreurs du provider.

---

## Regles

### 1. Client centralise

Une seule instance/configuration du client, partagee entre tous les appels. Pas de recreation a chaque appel.

```python
# CORRECT — client initialise une fois
import httpx

_client = httpx.AsyncClient(
    base_url=settings.stripe_api_url,
    headers={"Authorization": f"Bearer {settings.stripe_secret_key}"}
)

async def charge_payment(amount, currency, token):
    response = await _client.post("/charges", json={...})
    return ChargeResponse(**response.json())

# INCORRECT — nouveau client a chaque appel
async def charge_payment(amount, currency, token):
    async with httpx.AsyncClient() as client:  # ← recreation inutile
        response = await client.post(...)
```

### 2. Methodes async

Toutes les methodes de service sont `async def`. Meme si le SDK sous-jacent est synchrone, wrapper en async pour la coherence.

### 3. Types explicites via Pydantic

Les inputs et outputs du service utilisent des Pydantic models. Pas de `dict` bruts.

```python
class EmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    reply_to: Optional[str] = None

class EmailResponse(BaseModel):
    message_id: str
    status: str

async def send_email(request: EmailRequest) -> EmailResponse:
    ...
```

### 4. Exceptions custom

Chaque service definit ses propres exceptions. Pas de `raise Exception("...")` generique.

```python
class StripeError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.status_code = status_code
        super().__init__(message)

class StripeCardDeclined(StripeError): ...
class StripeInvalidRequest(StripeError): ...
```

### 5. Retry et idempotence

- Retry automatique sur erreurs transitoires (timeout, 5xx) si pertinent
- Utiliser les idempotency keys quand le provider les supporte (ex: Stripe)
- Pas de retry sur erreurs client (4xx)

### 6. Configuration via settings

Toutes les cles API, URLs, secrets via `from config.config import settings`. Jamais `os.environ`.

### 7. Pas de logique metier

Le service ne prend pas de decisions metier. Il execute ce qu'on lui demande.

```python
# CORRECT — le service envoie, point
async def send_email(request: EmailRequest) -> EmailResponse:
    response = await _client.post("/send", json=request.model_dump())
    return EmailResponse(**response.json())

# INCORRECT — le service decide quoi envoyer
async def send_welcome_email(user_id: int):
    user = await get_user_by_id(pool, user_id)  # ← acces DB = violation
    template = choose_template(user["plan"])      # ← logique metier = violation
    await _client.post("/send", json={...})
```

---

## Structure fichiers

- Un service simple → fichier plat : `services/email.py`
- Un service complexe (2+ fichiers) → sous-dossier : `services/youtube/scraper.py`, `services/youtube/oauth.py`

## Nommage

- Contexte clair dans le nom : `send_email`, `upload_file`, `charge_payment`
- PAS de suffixe de couche : `send_email`, pas `send_email_service`

## Testing

- Tester avec les vraies cles API en mode sandbox/test
- Si la cle n'est pas configuree → `@pytest.mark.skipif` (pas un echec)
- Verifier les vrais formats de reponse, pas des mocks
