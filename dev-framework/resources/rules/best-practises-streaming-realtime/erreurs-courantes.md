# Erreurs Courantes à Éviter

## Erreurs Backend

### ❌ 1. Pas de cleanup dans `finally`
```python
# MAUVAIS
async def generate():
    session = stream_manager.start_session(chat_id, user_id)

    async for chunk in llm_gateway.stream(...):
        yield chunk

    stream_manager.end_session(chat_id)  # ⚠️ Jamais appelé si exception
```

```python
# BON
async def generate():
    session = stream_manager.start_session(chat_id, user_id)

    try:
        async for chunk in llm_gateway.stream(...):
            yield chunk
    finally:
        stream_manager.end_session(chat_id)  # ✅ Toujours appelé
        await crud.update_generating_status(chat_id, False)
```

### ❌ 2. Buffering activé (Nginx/Apache)
```nginx
# MAUVAIS
location /api/ {
    proxy_pass http://backend;
    # buffering activé par défaut → chunks retardés
}
```

```nginx
# BON
location /api/ {
    proxy_pass http://backend;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header X-Accel-Buffering no;
}
```

### ❌ 3. Timeout côté serveur trop court
```python
# MAUVAIS
response = await httpx.get(
    "/api/stream",
    timeout=30.0  # ⚠️ Stream peut durer plusieurs minutes
)
```

```python
# BON
response = await httpx.get(
    "/api/stream",
    timeout=0  # Pas de timeout pour SSE
    # ou timeout très long (300s+)
)
```

### ❌ 4. Pas de vérification `stop_event`
```python
# MAUVAIS
async for chunk in llm_gateway.stream(...):
    yield chunk  # ⚠️ Continue même si user clique "Stop"
```

```python
# BON
async for chunk in llm_gateway.stream(...):
    if session.stop_event.is_set():
        yield sse_event("stopped", {"reason": "user_requested"})
        break
    yield chunk
```

### ❌ 5. État en mémoire worker (pas stateless)
```python
# MAUVAIS
class StreamManager:
    def __init__(self):
        self.active_sessions = {}  # ⚠️ Perdu si worker redémarre
```

```python
# BON
class StreamManager:
    def __init__(self, redis_client):
        self.redis = redis_client

    def start_session(self, chat_id, user_id):
        self.redis.setex(
            f"stream:{chat_id}",
            ttl=300,
            value=json.dumps({"user_id": user_id, "started_at": ...})
        )
```

### ❌ 6. Pas de heartbeat
```python
# MAUVAIS
async def generate():
    async for chunk in llm_gateway.stream(...):
        yield chunk
    # ⚠️ Proxies/firewalls peuvent timeout si pause longue
```

```python
# BON
async def generate():
    # Heartbeat toutes les 15s
    heartbeat_task = asyncio.create_task(send_heartbeat())

    try:
        async for chunk in llm_gateway.stream(...):
            yield chunk
    finally:
        heartbeat_task.cancel()
```

### ❌ 7. Pas de limite d'itérations tool calling
```python
# MAUVAIS
while True:  # ⚠️ Boucle infinie possible
    tool_calls = await llm_gateway.detect_tool_calls(...)
    if not tool_calls:
        break
    await execute_tools(tool_calls)
```

```python
# BON
max_iterations = 25
iteration = 0

while iteration < max_iterations:
    tool_calls = await llm_gateway.detect_tool_calls(...)
    if not tool_calls:
        break
    await execute_tools(tool_calls)
    iteration += 1
```

### ❌ 8. Stacktraces dans messages d'erreur
```python
# MAUVAIS
yield sse_event("error", {
    "message": traceback.format_exc()  # ⚠️ Expose internals
})
```

```python
# BON
yield sse_event("error", {
    "message": "Service temporairement indisponible"
})

logger.exception("Stream error", extra={"chat_id": chat_id})
```

## Erreurs Frontend

### ❌ 1. Pas de timeout d'inactivité
```typescript
// MAUVAIS
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // ⚠️ Attend indéfiniment si serveur freeze
}
```

```typescript
// BON
const INACTIVITY_TIMEOUT = 300000;  // 5 minutes
let lastActivityTime = Date.now();

while (true) {
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
    throw new Error('Stream timeout');
  }

  const { done, value } = await reader.read();
  if (done) break;

  lastActivityTime = Date.now();
}
```

### ❌ 2. Retry sur toutes les erreurs (y compris 4xx)
```typescript
// MAUVAIS
try {
  await streamMessage(...);
} catch (error) {
  setTimeout(() => retry(), 3000);  // ⚠️ Retry même sur 403, 404
}
```

```typescript
// BON
try {
  await streamMessage(...);
} catch (error) {
  const isRetryable = error.response?.status >= 500 ||
                      error.code === 'ECONNRESET';

  if (isRetryable && retryCount < maxRetries) {
    const delay = calculateBackoff(retryCount);
    setTimeout(() => retry(), delay);
  } else {
    throw error;  // Abandon
  }
}
```

### ❌ 3. Pas de feedback visuel pendant streaming
```tsx
// MAUVAIS
{messages.map(m => <Message key={m.id} content={m.content} />)}
{/* ⚠️ Rien n'indique qu'un stream est en cours */}
```

```tsx
// BON
{messages.map(m => <Message key={m.id} content={m.content} />)}

{streaming && (
  <Message from="assistant">
    <ReactMarkdown>{streamingMessage}</ReactMarkdown>
  </Message>
)}

{isSending && !streaming && <Spinner />}
```

### ❌ 4. Buffer SSE mal parsé
```typescript
// MAUVAIS
buffer += value;
const events = buffer.split('\n');  // ⚠️ Mauvais séparateur
```

```typescript
// BON
buffer += value;
const events = buffer.split('\n\n');  // ✅ Double newline (SSE standard)
buffer = events.pop() || '';  // Garder fragment incomplet
```

### ❌ 5. Pas de cleanup des listeners
```typescript
// MAUVAIS
const eventSource = new EventSource('/api/stream');
// ⚠️ Jamais fermé → fuite mémoire
```

```typescript
// BON
useEffect(() => {
  const eventSource = new EventSource('/api/stream');

  eventSource.addEventListener('message', handleMessage);

  return () => {
    eventSource.close();  // ✅ Cleanup
  };
}, [chatId]);
```

### ❌ 6. Message optimiste pas retiré
```typescript
// MAUVAIS
const sendMessage = async (content: string) => {
  const tempMessage = { id: 'temp', content, ... };
  setOptimisticMessage(tempMessage);

  await streamMessage(content);
  // ⚠️ tempMessage reste affiché
};
```

```typescript
// BON
const sendMessage = async (content: string) => {
  const tempMessage = { id: 'temp', content, ... };
  setOptimisticMessage(tempMessage);

  try {
    await streamMessage(content);
  } finally {
    setOptimisticMessage(null);  // ✅ Retirer dans tous les cas
  }
};
```

### ❌ 7. Pas de gestion 409 Conflict
```typescript
// MAUVAIS
const handleSubmit = async () => {
  await sendMessage(input);
  // ⚠️ Crash si génération en cours
};
```

```typescript
// BON
const handleSubmit = async () => {
  try {
    await sendMessage(input);
  } catch (error) {
    if (error.response?.status === 409) {
      setConflictDialog({ open: true, ... });
    } else {
      toast.error('Erreur lors de l\'envoi');
    }
  }
};
```

## Erreurs Infrastructure

### ❌ 1. HTTP/1.1 seulement (limite 6 connexions)
```nginx
# MAUVAIS
server {
    listen 443 ssl;  # ⚠️ HTTP/1.1 par défaut
    # ...
}
```

```nginx
# BON
server {
    listen 443 ssl http2;  # ✅ HTTP/2
    # ...
}
```

### ❌ 2. Pas de sticky sessions (load balancer)
```nginx
# MAUVAIS
upstream backend {
    server worker1:8000;
    server worker2:8000;
    # ⚠️ Round-robin → stream peut changer de worker
}
```

```nginx
# BON
upstream backend {
    ip_hash;  # ✅ Sticky sessions

    server worker1:8000;
    server worker2:8000;
}
```

### ❌ 3. Timeout proxy trop court
```nginx
# MAUVAIS
location /api/ {
    proxy_read_timeout 60s;  # ⚠️ Trop court pour SSE
}
```

```nginx
# BON
location /api/ {
    proxy_read_timeout 300s;  # ✅ 5 minutes
}
```

### ❌ 4. HTTPS/TLS manquant en production
```nginx
# MAUVAIS
server {
    listen 80;  # ⚠️ HTTP non sécurisé
    # ...
}
```

```nginx
# BON
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # Force HTTPS
    add_header Strict-Transport-Security "max-age=31536000" always;
}

server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

## Erreurs Sécurité

### ❌ 1. Pas de validation owner du chat
```python
# MAUVAIS
@router.post("/{chat_id}/stream")
async def stream_message(chat_id: str, current_user: User = ...):
    chat = await crud.get_chat(chat_id)
    # ⚠️ N'importe qui peut streamer sur n'importe quel chat
    async def generate():
        # ...
```

```python
# BON
@router.post("/{chat_id}/stream")
async def stream_message(chat_id: str, current_user: User = ...):
    chat = await crud.get_chat(chat_id)

    if chat.user_id != current_user.id:
        raise PermissionError("Not authorized")

    async def generate():
        # ...
```

### ❌ 2. Credentials dans logs
```python
# MAUVAIS
logger.info(f"Stream started with API key: {api_key}")
```

```python
# BON
logger.info(f"Stream started with API key: {api_key[:8]}***")
```

### ❌ 3. Pas de rate limiting
```python
# MAUVAIS
@router.post("/{chat_id}/stream")
async def stream_message(...):
    # ⚠️ User peut spammer des streams
```

```python
# BON
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/{chat_id}/stream")
@limiter.limit("10/minute")
async def stream_message(...):
    # ...
```

## Checklist anti-patterns

### Backend
- [ ] Cleanup dans `finally` (toujours)
- [ ] Buffering désactivé (Nginx/Apache)
- [ ] Pas de timeout côté serveur
- [ ] Check `stop_event` à chaque chunk
- [ ] Workers stateless (état en Redis/DB)
- [ ] Heartbeat implémenté (15-30s)
- [ ] Limite d'itérations tool calling (25)
- [ ] Messages d'erreur clairs (pas de stacktraces)

### Frontend
- [ ] Timeout d'inactivité (5 minutes)
- [ ] Pas de retry sur 4xx
- [ ] Feedback visuel (spinner, streaming message)
- [ ] Parser SSE correct (double newline)
- [ ] Cleanup listeners (useEffect return)
- [ ] Message optimiste retiré (finally)
- [ ] Gestion 409 Conflict

### Infrastructure
- [ ] HTTP/2 activé
- [ ] Sticky sessions (load balancer)
- [ ] Timeout proxy long (300s)
- [ ] HTTPS/TLS en production

### Sécurité
- [ ] Validation owner (chat.user_id == current_user.id)
- [ ] Credentials masquées dans logs
- [ ] Rate limiting (10/minute)

---

**Prochaine section** : [Checklist de Validation](checklist-validation.md)
