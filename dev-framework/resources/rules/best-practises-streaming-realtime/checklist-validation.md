# Checklist de Validation

## Avant la mise en production

### ✅ Backend : Fonctionnalités core

- [ ] **SSE correctement implémenté**
  - Format W3C (`event: <type>\ndata: <json>\n\n`)
  - Headers corrects (`text/event-stream`, `no-cache`, `keep-alive`)
  - Generator async avec yield

- [ ] **Heartbeat actif**
  - Fréquence 15-30 secondes
  - Producer-Consumer pattern avec Queue
  - Comment SSE (`: keep-alive\n\n`) ou event ping

- [ ] **Session management**
  - StreamManager avec start/end/stop
  - stop_event vérifié à chaque chunk
  - Cleanup dans `finally` (toujours)
  - Flag `is_generating` en DB pour lock

- [ ] **LLM Gateway**
  - Abstraction providers (OpenAI, Anthropic)
  - Circuit breaker par provider
  - Retry avec exponential backoff
  - Timeout adaptatif (désactivé pendant validations)

- [ ] **Tool calling**
  - Boucle itérative (max 25 iterations)
  - Compteur erreurs consécutives (max 5)
  - Messages tool_call visibles UI
  - Enrichissement erreurs pour LLM
  - Ordonnancement (turn_id + sequence_index)

### ✅ Backend : Sécurité

- [ ] **Authentification**
  - Token/Cookie HttpOnly vérifié
  - get_current_user dependency

- [ ] **Autorisation**
  - Vérification `chat.user_id == current_user.id`
  - Pas d'accès aux chats d'autres users

- [ ] **Rate limiting**
  - Limite par user (10-20 streams/minute)
  - Limite globale (selon capacité serveur)

- [ ] **Validation inputs**
  - agent_id existe
  - chat_id existe
  - message non vide

- [ ] **Logs sécurisés**
  - Pas de credentials en clair
  - Masquage API keys (8 premiers chars seulement)

### ✅ Backend : Performance

- [ ] **HTTP/2 activé**
  - Uvicorn avec `http="h2"`
  - Nginx/Apache `listen 443 ssl http2`

- [ ] **Connection pooling**
  - Database (SQLAlchemy pool_size=10)
  - HTTP client (httpx Limits max_connections=100)

- [ ] **Caching**
  - Agents en mémoire (LRU cache)
  - Messages en Redis (TTL 60s)

- [ ] **Buffering désactivé**
  - Nginx : `proxy_buffering off`, `X-Accel-Buffering no`
  - Apache : `SetEnv proxy-nokeepalive 1`

- [ ] **Timeouts corrects**
  - Serveur : pas de timeout (ou 300s+)
  - Proxy : `proxy_read_timeout 300s`

### ✅ Backend : Observabilité

- [ ] **Logs structurés**
  - JSON format
  - Contexte (chat_id, user_id, model, duration)
  - Niveaux corrects (INFO/WARNING/ERROR)

- [ ] **Métriques Prometheus**
  - `sse_active_connections` (Gauge)
  - `sse_stream_duration_seconds` (Histogram)
  - `sse_stream_errors_total` (Counter)
  - `sse_chunks_per_second` (Gauge)

- [ ] **Alertes Grafana**
  - Error rate > 10%
  - Circuit breaker OPEN
  - Latence P95 > 5s
  - Active connections > 1000

- [ ] **Healthcheck endpoint**
  - GET /health → 200 OK
  - Vérifie DB connection
  - Vérifie LLM provider disponible

### ✅ Frontend : Fonctionnalités core

- [ ] **Parser SSE robuste**
  - Fetch API avec `responseType: 'stream'`
  - TextDecoderStream pour UTF-8
  - Split sur double newline (`\n\n`)
  - Buffer pour fragments incomplets

- [ ] **Timeout d'inactivité**
  - 5 minutes (300s)
  - Désactivé pendant validations humaines
  - Exception avec message clair

- [ ] **Reconnexion automatique**
  - Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
  - Max 5 retries
  - Pas de retry sur 4xx (sauf 409)

- [ ] **React Query integration**
  - Hook `useStreamMessage`
  - Invalidate cache sur events (tool_call_created, done)
  - Messages en cache (queryKey: ['messages', chatId])

- [ ] **Message optimiste**
  - Affiché immédiatement
  - Retiré quand message réel arrive
  - Cleanup dans `finally`

- [ ] **UI feedback**
  - Spinner pendant `isSending`
  - Streaming message affiché en temps réel
  - Bouton Stop visible pendant streaming
  - Tool calls avec loader/résultat

### ✅ Frontend : UX

- [ ] **Gestion 409 Conflict**
  - Modale "Annuler et relancer" / "Attendre"
  - Message d'erreur clair

- [ ] **Toast notifications**
  - Erreurs claires (pas de stacktraces)
  - Succès (message envoyé, stream arrêté)

- [ ] **Auto-scroll**
  - Scroll vers le bas pendant streaming
  - Bouton "Scroll to bottom" si user a scroll up

- [ ] **Copie message**
  - Bouton copier sur messages assistant
  - Feedback visuel (check icon 2s)

- [ ] **Sources RAG**
  - Affichées sous le message
  - Collapsible (details/summary)
  - Similarité + extrait

### ✅ Frontend : Performance

- [ ] **Debouncing**
  - Input pas re-render à chaque char
  - Throttle scroll events

- [ ] **Virtualization**
  - Si >100 messages, utiliser react-window

- [ ] **Code splitting**
  - Lazy load chat page
  - Dynamic imports pour composants lourds

### ✅ Infrastructure

- [ ] **HTTPS/TLS**
  - Certificat valide (Let's Encrypt)
  - TLS 1.3
  - HSTS header

- [ ] **Load balancer**
  - Sticky sessions (ip_hash ou cookie)
  - Health checks actifs
  - Timeout 300s minimum

- [ ] **Workers stateless**
  - État en Redis/DB (pas en mémoire)
  - Restartable sans perte

- [ ] **Database**
  - Index sur chat_id, user_id, created_at
  - Pool size adapté (10-20)
  - Backup automatique

- [ ] **Redis**
  - Persistence (AOF ou RDB)
  - Maxmemory policy (allkeys-lru)
  - Monitoring (redis-cli INFO)

### ✅ Tests

- [ ] **Unit tests backend**
  - StreamManager (start/stop/end)
  - Gateway LLM (stream, circuit breaker)
  - Tool execution

- [ ] **Integration tests backend**
  - Route /stream (success, error, stop)
  - Tool calling workflow
  - 409 Conflict handling

- [ ] **E2E tests frontend**
  - Envoyer message → streaming → affiché
  - Arrêter stream → message partiel sauvegardé
  - Tool call → UI update
  - Reconnexion après déconnexion

- [ ] **Load tests**
  - 100 streams simultanés
  - Latence P95 < 2s
  - Error rate < 1%

### ✅ Documentation

- [ ] **README**
  - Architecture overview
  - Setup instructions
  - Environment variables

- [ ] **API docs**
  - OpenAPI/Swagger
  - SSE events documentés
  - Exemples curl

- [ ] **Runbook**
  - Procédure redémarrage worker
  - Debug stream stuck
  - Rollback procédure

## Checklist post-déploiement

### Jour 1 (J+0)

- [ ] Vérifier logs (pas d'erreurs critiques)
- [ ] Vérifier métriques (latence, error rate)
- [ ] Tester manuellement 5-10 streams
- [ ] Vérifier alertes (pas de faux positifs)

### Semaine 1 (J+7)

- [ ] Review error rate (objectif <1%)
- [ ] Review latence P95 (objectif <2s)
- [ ] Review circuit breaker events
- [ ] Ajuster pool sizes si nécessaire

### Mois 1 (J+30)

- [ ] Analyse logs (patterns d'erreurs)
- [ ] Review scaling (peak load)
- [ ] Optimisations (caching, indexes)
- [ ] Update runbook (incidents rencontrés)

## Outils recommandés

### Monitoring
- **Prometheus** : Métriques
- **Grafana** : Dashboards
- **Loki** : Logs centralisés
- **Jaeger** : Tracing (si microservices)

### Debugging
- **Browser DevTools** : Network tab (Protocol: h2)
- **curl** : Tester SSE manuellement
  ```bash
  curl -N -H "Accept: text/event-stream" https://api.example.com/chats/123/stream
  ```
- **redis-cli** : Monitor sessions actives
  ```bash
  redis-cli KEYS "stream:*"
  ```

### Load testing
- **k6** : Load tests SSE
  ```javascript
  import http from 'k6/http';
  export default function() {
    http.get('https://api.example.com/chats/123/stream', {
      headers: { 'Accept': 'text/event-stream' },
    });
  }
  ```

### CI/CD
- **GitHub Actions** : Tests automatisés
- **Docker Compose** : Environnement dev
- **Kubernetes** : Orchestration production (optionnel)

---

## Signature de validation

**Date** : _____________

**Validé par** : _____________

**Environnement** : [ ] Dev [ ] Staging [ ] Production

**Checklist complétée** : ____ / ____ items

**Commentaires** :
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

Félicitations ! Votre système de streaming SSE est prêt pour la production. 🚀
