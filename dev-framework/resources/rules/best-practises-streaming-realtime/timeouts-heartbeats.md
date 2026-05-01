# Timeouts et Heartbeats

## Problématique

Les connexions SSE peuvent être interrompues par :
- **Proxies/Load balancers** : Timeout si pas de données (30-60s typique)
- **Firewalls** : Fermeture de connexions "idle"
- **Navigateurs** : Garbage collection de connexions inactives
- **Réseaux mobiles** : Changements de réseau (4G → WiFi)

## Solution : Heartbeat SSE

### Principe
Envoyer périodiquement un événement de maintien de connexion pour prouver que le stream est actif.

### Fréquence recommandée
- **15-30 secondes** : Standard industrie
- Trop fréquent (< 10s) : Overhead réseau
- Trop rare (> 60s) : Risque de timeout proxy

## Implémentation Backend

### Option 1 : Comment SSE (invisible)
```python
async def generate():
    session = stream_manager.start_session(chat_id, user_id)

    # Queue pour multiplexer heartbeat + stream
    event_queue = asyncio.Queue()

    async def heartbeat_producer():
        """Envoie un ping toutes les 15s"""
        try:
            while not session.stop_event.is_set():
                await asyncio.sleep(15)
                if not session.stop_event.is_set():
                    await event_queue.put(("heartbeat", None))
        except asyncio.CancelledError:
            pass

    async def stream_producer():
        """Envoie les chunks LLM"""
        try:
            async for chunk in llm_gateway.stream(...):
                if session.stop_event.is_set():
                    break
                await event_queue.put(("chunk", chunk))
            await event_queue.put(("done", None))
        except Exception as e:
            await event_queue.put(("error", str(e)))

    # Démarrer les producers
    heartbeat_task = asyncio.create_task(heartbeat_producer())
    stream_task = asyncio.create_task(stream_producer())

    try:
        # Consumer : yield depuis la queue
        while True:
            event_type, data = await event_queue.get()

            if event_type == "heartbeat":
                yield ": keep-alive\n\n"  # Comment SSE

            elif event_type == "chunk":
                yield sse_event("chunk", {"content": data})

            elif event_type == "done":
                yield sse_event("done", {})
                break

            elif event_type == "error":
                yield sse_event("error", {"message": data})
                break

    finally:
        # Cleanup
        heartbeat_task.cancel()
        stream_task.cancel()
        await asyncio.gather(heartbeat_task, stream_task, return_exceptions=True)
        stream_manager.end_session(chat_id)
```

### Option 2 : Event SSE (visible)
```python
# Dans le heartbeat_producer
await event_queue.put(("heartbeat", {
    "timestamp": datetime.now(timezone.utc).isoformat()
}))

# Dans le consumer
elif event_type == "heartbeat":
    yield sse_event("ping", data)
```

**Avantage option 2** : Permet au frontend de monitorer la latence
**Inconvénient** : Overhead JSON encoding/decoding

**Recommandation** : Option 1 (comment SSE) sauf besoin spécifique de monitoring.

## Implémentation Frontend

### Parser les comments SSE
```typescript
// Les comments (": ...") sont automatiquement ignorés par le parser
// Pas de code spécifique nécessaire

// Si option 2 (event ping)
switch (eventType) {
  case 'ping':
    console.log('[SSE] Heartbeat received');
    lastActivityTime = Date.now();
    break;
  // ... autres cases
}
```

## Gestion des timeouts

### Timeout d'inactivité (Frontend)
```typescript
const INACTIVITY_TIMEOUT = 300000; // 5 minutes

let lastActivityTime = Date.now();
let isValidationPending = false;

while (true) {
  const timeSinceLastActivity = Date.now() - lastActivityTime;

  // Désactiver timeout pendant validation humaine
  if (!isValidationPending && timeSinceLastActivity > INACTIVITY_TIMEOUT) {
    throw new Error(`Stream timeout: ${INACTIVITY_TIMEOUT}ms`);
  }

  const { done, value } = await reader.read();
  if (done) break;

  lastActivityTime = Date.now();

  // Parser events...
  switch (eventType) {
    case 'validation_required':
      isValidationPending = true;  // Désactiver timeout
      break;
    case 'chunk':
    case 'sources':
      isValidationPending = false;  // Réactiver timeout
      break;
  }
}
```

### Configuration proxy/load balancer

#### Nginx
```nginx
location /api/ {
    proxy_pass http://backend;

    # Timeout SSE
    proxy_read_timeout 300s;      # 5 minutes max
    proxy_connect_timeout 75s;

    # Désactiver buffering pour SSE
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header X-Accel-Buffering no;

    # Headers SSE
    proxy_set_header Connection "";
    proxy_http_version 1.1;
}
```

#### Apache
```apache
<Location /api/>
    ProxyPass http://backend
    ProxyTimeout 300
    ProxyPassReverse http://backend

    # Désactiver buffering
    SetEnv proxy-nokeepalive 1
    SetEnv proxy-initial-not-pooled 1
</Location>
```

#### Azure App Service
```json
{
  "RoutePolicy": {
    "backendRequestTimeout": "00:05:00",
    "bufferResponse": false
  }
}
```

## Stratégies de reconnexion

### Reconnexion automatique (EventSource API)
```typescript
// EventSource reconnecte automatiquement
const eventSource = new EventSource('/api/stream');

eventSource.addEventListener('error', (error) => {
  console.error('SSE error, reconnecting...');
  // Reconnexion automatique après 3s (configurable via header "retry")
});
```

### Header retry (Backend)
```python
return StreamingResponse(
    generate(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "retry": "3000",  # Reconnexion après 3 secondes
    }
)
```

### Backoff exponentiel (implémentation custom)
```typescript
class StreamClient {
  private retryCount = 0;
  private maxRetries = 5;

  async connect() {
    try {
      await this.streamMessage(...);
      this.retryCount = 0;  // Reset sur succès
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(1000 * 2 ** this.retryCount, 30000);
        console.log(`Reconnecting in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.retryCount++;
        return this.connect();
      }
      throw error;
    }
  }
}
```

## Circuit Breaker Pattern

### Backend : Protection provider LLM
```python
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"      # Normal
    OPEN = "open"          # Coupé (trop d'erreurs)
    HALF_OPEN = "half_open" # Test de récupération

@dataclass
class CircuitBreaker:
    name: str
    failure_threshold: int = 5
    recovery_timeout: int = 60  # secondes
    success_threshold: int = 1

    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: datetime | None = None

    async def call(self, func, *args, **kwargs):
        """Execute func avec protection circuit breaker"""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                seconds_until_retry = self._seconds_until_retry()
                raise CircuitBreakerOpenError(
                    f"Provider {self.name} unavailable. "
                    f"Retry in {seconds_until_retry}s."
                )

        try:
            result = await func(*args, **kwargs)
            await self.record_success()
            return result
        except Exception as e:
            await self.record_failure()
            raise

    async def record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    async def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def _should_attempt_reset(self) -> bool:
        if not self.last_failure_time:
            return True
        return datetime.now() - self.last_failure_time > timedelta(
            seconds=self.recovery_timeout
        )
```

## Monitoring et observabilité

### Métriques à tracker
```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

stream_started = Counter(
    'sse_stream_started_total',
    'Total SSE streams started',
    ['chat_id', 'user_id']
)

stream_duration = Histogram(
    'sse_stream_duration_seconds',
    'SSE stream duration',
    ['chat_id', 'status']  # status: completed, stopped, error
)

active_streams = Gauge(
    'sse_active_streams',
    'Number of active SSE streams'
)

heartbeat_sent = Counter(
    'sse_heartbeat_sent_total',
    'Total heartbeats sent'
)
```

### Logs structurés
```python
logger.info(
    "Stream lifecycle event",
    extra={
        "event": "stream_started",
        "chat_id": chat_id,
        "user_id": user_id,
        "has_tools": len(tools) > 0,
        "model": model,
    }
)

logger.info(
    "Stream lifecycle event",
    extra={
        "event": "stream_ended",
        "chat_id": chat_id,
        "duration_seconds": duration,
        "chunks_sent": chunk_count,
        "status": "completed",  # ou "stopped", "error"
    }
)
```

## Checklist production

### Backend
- [ ] Heartbeat implémenté (15-30s)
- [ ] Timeout désactivé côté serveur (ou très long, 300s+)
- [ ] Cleanup dans `finally` (toujours)
- [ ] Circuit breaker pour LLM provider
- [ ] Logs structurés (start/end/errors)
- [ ] Métriques (Prometheus ou équivalent)

### Frontend
- [ ] Timeout d'inactivité configuré (5 minutes)
- [ ] Timeout désactivé pendant validations humaines
- [ ] Reconnexion automatique (EventSource ou custom)
- [ ] Backoff exponentiel sur retry
- [ ] UI feedback sur reconnexion

### Infrastructure
- [ ] Nginx/Apache : buffering désactivé
- [ ] Load balancer : timeout 300s minimum
- [ ] HTTP/2 activé (pour multiplexing)
- [ ] HTTPS/TLS en production

---

**Prochaine section** : [Tool Calling et LLM Streaming](tool-calling-patterns.md)
