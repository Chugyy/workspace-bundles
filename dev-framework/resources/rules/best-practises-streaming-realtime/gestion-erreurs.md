# Gestion des Erreurs et Reconnexion

## Types d'erreurs SSE

### 1. Erreurs réseau
- **Timeouts** : Connexion inactive trop longtemps
- **Déconnexions** : Changement de réseau (WiFi ↔ 4G)
- **Proxy timeout** : Intermédiaire ferme la connexion
- **DNS failure** : Serveur injoignable

### 2. Erreurs serveur
- **LLM provider down** : OpenAI/Anthropic inaccessible
- **Database timeout** : Connexion DB perdue
- **Out of memory** : Worker surchargé
- **500 Internal Server Error** : Bug backend

### 3. Erreurs applicatives
- **409 Conflict** : Génération déjà en cours
- **403 Forbidden** : Permissions insuffisantes
- **404 Not Found** : Chat inexistant
- **422 Validation Error** : Requête invalide

## Stratégies de gestion

### Reconnexion automatique (EventSource API)

```typescript
const eventSource = new EventSource('/api/chats/123/stream');

eventSource.onerror = (event) => {
  console.error('SSE error:', event);
  // EventSource reconnecte automatiquement après 3s
  // (configurable via header "retry" côté serveur)
};

// Écouter les reconnexions
eventSource.addEventListener('open', () => {
  console.log('SSE connection opened/reopened');
});
```

**Limitation** : Pas de contrôle fin sur la reconnexion (pas d'exponential backoff).

### Reconnexion manuelle (Fetch API)

```typescript
class StreamClient {
  private retryCount = 0;
  private maxRetries = 5;
  private baseDelay = 1000;  // 1s

  async connect(chatId: string, callbacks: StreamCallbacks) {
    try {
      await this.streamMessage(chatId, callbacks);
      this.retryCount = 0;  // Reset sur succès
    } catch (error) {
      if (this.shouldRetry(error)) {
        const delay = this.calculateBackoff();
        console.log(`Reconnecting in ${delay}ms... (${this.retryCount}/${this.maxRetries})`);

        await this.wait(delay);
        this.retryCount++;
        return this.connect(chatId, callbacks);
      }

      throw error;  // Abandon
    }
  }

  private shouldRetry(error: any): boolean {
    // Ne pas retry sur erreurs non-recoverables
    if (error.response?.status === 403) return false;  // Forbidden
    if (error.response?.status === 404) return false;  // Not Found
    if (error.response?.status === 422) return false;  // Validation Error

    // Retry sur erreurs réseau et 5xx
    return this.retryCount < this.maxRetries;
  }

  private calculateBackoff(): number {
    // Exponential backoff avec jitter
    const exponential = this.baseDelay * Math.pow(2, this.retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(exponential + jitter, 30000);  // Max 30s
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Circuit Breaker (Backend)

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"      # Normal
    OPEN = "open"          # Coupé
    HALF_OPEN = "half_open" # Test

class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 1
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: datetime | None = None

    async def call(self, func, *args, **kwargs):
        """Execute avec protection"""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise CircuitBreakerOpenError(
                    f"{self.name} unavailable. "
                    f"Retry in {self._seconds_until_retry()}s."
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
                logger.info(f"Circuit {self.name}: HALF_OPEN → CLOSED")
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    async def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit {self.name}: CLOSED → OPEN")

    def _should_attempt_reset(self) -> bool:
        if not self.last_failure_time:
            return True
        return datetime.now() - self.last_failure_time > timedelta(
            seconds=self.recovery_timeout
        )

    def _seconds_until_retry(self) -> int:
        if not self.last_failure_time:
            return 0
        elapsed = (datetime.now() - self.last_failure_time).total_seconds()
        return max(0, int(self.recovery_timeout - elapsed))
```

## Patterns d'erreurs

### Pattern 1 : Fail Fast
```python
@router.post("/{chat_id}/stream")
async def stream_message(...):
    # Vérifications préalables
    if not chat:
        raise NotFoundError("Chat not found")

    if chat.user_id != current_user.id:
        raise PermissionError("Not authorized")

    if await crud_chats.is_chat_generating(chat_id):
        raise ConflictError("Generation in progress")

    # Stream seulement si tout OK
    async def generate():
        # ...
```

**Avantage** : Évite de démarrer un stream qui va échouer immédiatement.

### Pattern 2 : Graceful Degradation
```python
async def generate():
    try:
        # Essayer avec tools
        if tools_for_llm:
            stream_method = llm_gateway.stream_with_tools(...)
        else:
            stream_method = llm_gateway.stream(...)

        async for chunk in stream_method:
            yield sse_event("chunk", {"content": chunk})

    except LLMProviderError as e:
        # Fallback sur provider alternatif
        logger.warning(f"Primary provider failed: {e}, trying fallback")

        try:
            fallback_stream = fallback_llm_gateway.stream(...)
            async for chunk in fallback_stream:
                yield sse_event("chunk", {"content": chunk})
        except Exception as fallback_error:
            # Échec total
            yield sse_event("error", {
                "message": "All LLM providers unavailable"
            })
```

**Avantage** : Meilleure résilience, continuité de service.

### Pattern 3 : Retry avec Idempotence
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def execute_tool(tool_name: str, arguments: dict):
    """Retry tool execution si échec temporaire"""
    try:
        result = await tool_executor.execute(tool_name, arguments)
        return result
    except TemporaryError as e:
        # Retry automatique (tenacity)
        logger.warning(f"Tool {tool_name} failed (temporary): {e}")
        raise
    except PermanentError as e:
        # Pas de retry
        logger.error(f"Tool {tool_name} failed (permanent): {e}")
        raise
```

**Attention** : Nécessite que les tools soient **idempotents** (même résultat si exécuté plusieurs fois).

## Messages d'erreur utilisateur

### ✅ Messages clairs
```typescript
// Backend
yield sse_event("error", {
  "message": "Connexion au serveur perdue. Reconnexion automatique dans 3 secondes..."
});

// Frontend
toast.error("Connexion perdue. Reconnexion...", {
  icon: "🔄"
});
```

### ❌ Messages techniques
```typescript
// À éviter
toast.error("HTTPConnectionPool(host='api.openai.com', port=443): Max retries exceeded");

// Préférer
toast.error("Service temporairement indisponible. Réessayez dans quelques instants.");
```

## Logging et observabilité

### Logs structurés
```python
logger.error(
    "Stream error",
    extra={
        "error_type": "llm_provider_timeout",
        "chat_id": chat_id,
        "user_id": user_id,
        "provider": "anthropic",
        "model": "claude-sonnet-4",
        "retry_count": retry_count,
        "traceback": traceback.format_exc(),
    }
)
```

### Métriques d'erreurs
```python
from prometheus_client import Counter

stream_errors = Counter(
    'sse_stream_errors_total',
    'Total SSE stream errors',
    ['error_type', 'chat_id']
)

# Incrémenter
stream_errors.labels(
    error_type="llm_timeout",
    chat_id=chat_id
).inc()
```

### Alertes Grafana
```yaml
# alert.yml
groups:
  - name: sse_alerts
    interval: 30s
    rules:
      - alert: HighSSEErrorRate
        expr: rate(sse_stream_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High SSE error rate"
          description: "{{ $value }} errors/s in last 5 minutes"

      - alert: SSECircuitBreakerOpen
        expr: circuit_breaker_state{name="anthropic"} == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "LLM provider circuit breaker open"
          description: "Anthropic circuit breaker is OPEN"
```

## Checklist erreurs

### Backend
- [ ] Fail fast (valider avant stream)
- [ ] Circuit breaker pour LLM providers
- [ ] Logs structurés (error_type, context)
- [ ] Métriques Prometheus (erreurs par type)
- [ ] Cleanup dans `finally` (toujours)
- [ ] Messages d'erreur clairs (pas de stacktraces)

### Frontend
- [ ] Reconnexion automatique (exponential backoff)
- [ ] Ne pas retry sur 4xx (sauf 409)
- [ ] Toast notifications utilisateur
- [ ] UI feedback (spinner, état reconnexion)
- [ ] Timeout d'inactivité (5 minutes)

### Observabilité
- [ ] Dashboard erreurs (Grafana)
- [ ] Alertes critiques (circuit breaker open, error rate > 10%)
- [ ] Logs centralisés (ELK, Loki)
- [ ] Tracing distribué (Jaeger, si microservices)

---

**Prochaine section** : [Patterns d'Implémentation](patterns-implementation.md)
