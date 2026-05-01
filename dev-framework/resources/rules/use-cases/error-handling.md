# Gestion des Erreurs — Bonnes Pratiques

## Definition

Quand une action handler echoue, l'erreur doit remonter au handler, etre transformee en event, et potentiellement creer un ticket (conversation) dans le dashboard AI Manager pour qu'un agent ou un humain puisse la traiter.

---

## Flow d'erreur

```
Action .sh/.py echoue (exit code != 0 ou exception)
  → Le handler log l'erreur (stdout/stderr)
  → Le handler POST un event { source: "system", type: "action.error" }
  → Une rule matche l'event erreur
  → Action error-handler se lance
  → POST au backend AI Manager → cree une conversation/ticket
  → Un agent dev analyse et propose un fix
  → Le ticket est visible dans le dashboard
```

---

## Regles

### 1. Exit codes dans le .sh

Le .sh doit propager les exit codes correctement :

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/../.venv"

if [ ! -d "$VENV" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q httpx || exit 1
fi

# exec remplace le process — l'exit code Python devient l'exit code du .sh
exec "$VENV/bin/python3" "$SCRIPT_DIR/handle_booking.py" "$1"
```

Si le .sh orchestre plusieurs scripts :

```bash
"$VENV/bin/python3" "$SCRIPT_DIR/step1.py" "$1" || exit 1
"$VENV/bin/python3" "$SCRIPT_DIR/step2.py" "$1" || exit 1
```

### 2. Try/except dans le Python

Chaque script Python catch ses erreurs et log avant de sortir :

```python
def main():
    try:
        event = json.loads(sys.argv[1])
        process(event)
    except json.JSONDecodeError as e:
        print(f"[action] invalid event JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[action] error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### 3. Le handler catch les erreurs

Le handler detecte les exit codes non-0 et log les stderr (handler main.py). Pour transformer ca en event erreur, ajouter dans la logique du handler :

```python
if process.returncode != 0:
    # POST un event erreur a l'aggregator
    await create_error_event(event_id, action_name, stderr)
```

### 4. Event erreur standardise

```python
{
    "source": "system",
    "type": "action.error",
    "related_to": event_id,  # L'event qui a cause l'erreur
    "payload": {
        "action": "handle-booking",
        "exit_code": 1,
        "stderr": "ConnectionError: Cannot reach Cal.com API",
        "original_source": "cal.com",
        "original_type": "booking.created",
        "timestamp": "2026-04-21T14:30:00Z"
    }
}
```

### 5. Creer un ticket dans le dashboard

L'action error-handler POST au backend AI Manager pour creer une conversation :

```python
import httpx

AI_MANAGER_URL = os.environ.get("AI_MANAGER_URL", "http://localhost:4810")
INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "handler-internal-key")

headers = {
    "Content-Type": "application/json",
    "X-Internal-Key": INTERNAL_KEY,
}

def create_error_ticket(event):
    payload = event.get("payload", {})
    error_msg = payload.get("stderr", "Unknown error")
    action = payload.get("action", "unknown")

    # 1. Creer la conversation
    resp = httpx.post(f"{AI_MANAGER_URL}/api/conversations", json={
        "pid": "dev",
        "model": "claude-sonnet-4-6",
        "type": "agent",
        "initiated_by": "system",
        "first_message": f"Erreur dans l'action `{action}`:\n\n```\n{error_msg}\n```"
    }, headers=headers)
    conversation = resp.json()

    # 2. Envoyer le message pour que l'agent analyse
    httpx.post(
        f"{AI_MANAGER_URL}/api/conversations/{conversation['id']}/messages",
        json={"text": f"Analyse cette erreur. Trouve la cause racine et propose un fix. "
                      f"L'event original etait: source={payload.get('original_source')}, "
                      f"type={payload.get('original_type')}"},
        headers=headers,
    )
```

### 6. Rule pour les erreurs

Dans le PID qui gere les erreurs (ou dans le registry global du handler) :

```yaml
proxy:
  rules:
    - match: { source: "system", type: "action.error" }
      run: error-handler
```

---

## Niveaux d'erreur

Toutes les erreurs ne meritent pas un ticket. Trois niveaux :

| Niveau | Quand | Action |
|--------|-------|--------|
| **Log** | Erreur temporaire (timeout, rate limit) | Le handler log, pas d'event | 
| **Event** | Erreur reproductible qui merite attention | POST event erreur, visible dans les events |
| **Ticket** | Erreur critique ou recurrente | Event + conversation dans le dashboard |

La decision peut etre prise par l'error-handler lui-meme (ex: si la meme erreur est apparue 3 fois en 1 heure → ticket).

---

## A ne PAS faire

- **Ne pas ignorer les exit codes** — `|| exit 1` dans le .sh
- **Ne pas catch-all sans log** — toujours print le message d'erreur avant de sys.exit
- **Ne pas creer un ticket pour chaque erreur** — filtrer par gravite et frequence
- **Ne pas mettre de donnees sensibles dans les events erreur** — pas de credentials, tokens, etc.

***
