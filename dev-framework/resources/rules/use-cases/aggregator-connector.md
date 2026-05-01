# Connecteur Aggregator — Bonnes Pratiques

## Definition

Un connecteur = un module dans l'aggregator qui ecoute ou poll une source externe et POST des events standardises a l'aggregator. Son seul objectif : transformer des signaux externes en events business.

L'aggregator tourne dans `ai-manager/aggregator/` (PM2 local, port 5000). Expose publiquement via Caddy (HTTPS/Let's Encrypt). Multi-tenant : chaque workspace a son compte et sa cle API. Chaque connecteur est un fichier dans `connectors/`.

---

## Regles

### 1. Un connecteur = une source

Chaque connecteur gere une seule source externe. Pas de connecteur multi-source.

```
connectors/
├── whatsapp.py      # Poll Unipile via lib/whatsapp
├── calcom.py        # Webhook listener Cal.com
├── stripe.py        # Webhook listener Stripe
└── email.py         # Poll Gmail via lib/email
```

### 2. Format d'event standardise

Tout event POST a l'aggregator respecte ce format :

```python
{
    "source": "cal.com",                    # Identifiant de la source (lowercase, point separe)
    "type": "booking.created",              # Type d'event (dot notation)
    "payload": {                            # Donnees utiles, parsees et nettoyees
        "name": "Jean Dupont",
        "email": "jean@example.com",
        "date": "2026-04-25T10:00:00Z",
        "type": "discovery-call"
    }
}
```

**Conventions source/type :**

| Source | Types | Exemples |
|--------|-------|----------|
| `whatsapp` | `message` | Nouveau message ou nouvelle conversation |
| `email` | `received` | Email recu |
| `discord` | `message` | Message dans un canal surveille |
| `cal.com` | `booking.created`, `booking.cancelled`, `booking.rescheduled` | Webhook Cal.com |
| `stripe` | `payment.succeeded`, `invoice.paid` | Webhook Stripe |
| `instagram` | `dm` | Message prive |

### 3. Filtrage intelligent

Pas chaque signal = un event. Le connecteur decide ce qui est pertinent :

```python
# CORRECT — filtre les messages pertinents
if is_new_conversation(message):
    post_event(message)
elif is_first_message_since(message, hours=4):
    post_event(message)
# sinon : ignorer

# INCORRECT — tout envoyer a l'aggregator
for message in all_messages:
    post_event(message)  # va noyer l'aggregator
```

**Regles de filtrage par type :**
- **Nouvelle conversation** (WhatsApp, Instagram) → toujours un event
- **Message dans conv existante** → seulement si premier message depuis X heures ou nouveau participant
- **Email** → chaque email recu (filtre par expediteur, pas de newsletters sauf si configure)
- **Discord** → messages dans les canaux surveilles uniquement
- **Webhooks** (Cal.com, Stripe) → chaque webhook = un event (deja filtre par la source)

### 4. Gestion du curseur

Chaque connecteur maintient un curseur (dernier element vu) pour ne pas re-ingerer.

```python
CURSOR_FILE = Path(__file__).parent / ".cursors" / "whatsapp.json"

def get_cursor() -> str:
    if CURSOR_FILE.exists():
        return json.loads(CURSOR_FILE.read_text())["last_seen"]
    return "1970-01-01T00:00:00Z"

def set_cursor(timestamp: str):
    CURSOR_FILE.parent.mkdir(exist_ok=True)
    CURSOR_FILE.write_text(json.dumps({"last_seen": timestamp}))
```

### 5. POST a l'aggregator

```python
import httpx

AGGREGATOR_URL = os.environ.get("AGGREGATOR_URL", "https://events.multimodal-house.fr")

AGGREGATOR_API_KEY = os.environ.get("AGGREGATOR_API_KEY", "")

def post_event(source: str, event_type: str, payload: dict):
    httpx.post(f"{AGGREGATOR_URL}/events", json={
        "source": source,
        "type": event_type,
        "payload": payload,
    }, headers={"X-Api-Key": AGGREGATOR_API_KEY})
```

### 6. Gestion d'erreurs du connecteur

En cas d'erreur, le connecteur POST un event d'erreur a l'aggregator :

```python
try:
    messages = poll_whatsapp()
except Exception as e:
    post_event(
        source="connector:whatsapp",
        event_type="error",
        payload={"error": str(e), "timestamp": now()}
    )
```

### 7. Deux modes de connecteur

**Polling** — le connecteur interroge la source a intervalle regulier :
```python
async def poll_loop():
    while True:
        messages = await fetch_new_messages(since=get_cursor())
        for msg in messages:
            post_event("whatsapp", "message", parse(msg))
            set_cursor(msg["timestamp"])
        await asyncio.sleep(POLL_INTERVAL)
```

**Webhook** — le connecteur expose un endpoint HTTP qui recoit les notifications :
```python
@app.post("/webhooks/calcom")
async def calcom_webhook(request: Request):
    body = await request.json()
    event_type = body.get("triggerEvent", "unknown")
    post_event("cal.com", f"booking.{event_type}", parse_calcom(body))
    return {"ok": True}
```

### 8. Acces aux outils lib/

Les connecteurs utilisent les CLIs de `lib/` via subprocess :

```python
import subprocess
result = subprocess.run(
    ["lib/whatsapp/run.sh", "list-conversations", "--since", cursor],
    capture_output=True, text=True
)
conversations = json.loads(result.stdout)
```

Ou via import direct si le connecteur partage le meme venv avec les deps installees.

---

## A ne PAS faire

- **Ne pas stocker de donnees** dans le connecteur — les donnees vont dans l'aggregator (events) ou dans la DB via des actions
- **Ne pas traiter les events** — le connecteur capture et transmet, c'est tout. Le traitement c'est le job des actions handler
- **Ne pas dupliquer la logique de filtrage** dans plusieurs connecteurs — extraire en utilitaire si c'est partage
- **Ne pas hardcoder les credentials** — tout en variables d'environnement

***
