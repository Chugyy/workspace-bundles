# HTTP/2 et Scalabilité

## Problème HTTP/1.1

### Limitation des connexions
HTTP/1.1 limite à **6 connexions simultanées par domaine** dans les navigateurs.

Impact sur SSE :
- 1 stream SSE = 1 connexion
- Si 6 streams actifs → Impossible d'ouvrir un 7ème
- Bloquant pour : multi-tabs, multi-chats, dashboards

### Head-of-line blocking
HTTP/1.1 traite les requêtes séquentiellement sur chaque connexion.

## Solution : HTTP/2

### Multiplexing
HTTP/2 permet **plusieurs streams sur une seule connexion TCP**.

Bénéfices :
- Jusqu'à **100 streams simultanés** par défaut (négociable)
- Plus de limite de 6 connexions
- Latence réduite (pas de handshake TCP répété)

### Server Push
HTTP/2 peut pousser des ressources avant que le client ne les demande.

**Note** : Peu utilisé pour SSE (SSE suffit pour le push).

### Header compression (HPACK)
Réduction de l'overhead des headers HTTP répétés.

### Binary protocol
Plus efficace à parser que HTTP/1.1 (texte).

## Migration vers HTTP/2

### Backend : Uvicorn (FastAPI)

#### Installation
```bash
pip install uvicorn[standard] httpx[http2] h2
```

#### Configuration
```python
# main.py
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        http="h2",  # Force HTTP/2
        # ou "auto" pour HTTP/1.1 + HTTP/2
    )
```

#### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--http", "h2"]
```

### Reverse Proxy : Nginx

#### Configuration HTTP/2
```nginx
server {
    listen 443 ssl http2;  # Activer HTTP/2
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/example.crt;
    ssl_certificate_key /etc/ssl/private/example.key;

    # SSE-specific
    location /api/chats/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;

        # Headers SSE
        proxy_set_header Connection "";
        proxy_set_header X-Accel-Buffering no;
        proxy_buffering off;
        proxy_cache off;

        # Timeout long
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;

        # Forward real IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets (benefit from HTTP/2 multiplexing)
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
```

#### Vérification Nginx
```bash
nginx -v
# doit afficher: nginx version: nginx/1.20.0 ou supérieur

nginx -t  # Vérifier config
systemctl reload nginx
```

### Reverse Proxy : Apache

```apache
<VirtualHost *:443>
    ServerName api.example.com

    # Activer HTTP/2
    Protocols h2 http/1.1

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/example.crt
    SSLCertificateKeyFile /etc/ssl/private/example.key

    # SSE configuration
    <Location /api/chats/>
        ProxyPass http://localhost:8000/api/chats/
        ProxyPassReverse http://localhost:8000/api/chats/

        ProxyTimeout 300
        SetEnv proxy-nokeepalive 1
        SetEnv proxy-initial-not-pooled 1
    </Location>
</VirtualHost>
```

### Frontend : Aucune modification

Le navigateur négocie automatiquement HTTP/2 si disponible.

Vérification dans DevTools :
```
Network tab → Select request → Protocol column → "h2"
```

## Scalabilité horizontale

### Pattern : Load Balancer + Workers

```
                    ┌─────────────┐
                    │ Load Balancer│
                    │  (Nginx)     │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌───▼───────┐
    │ Worker 1  │    │ Worker 2  │    │ Worker N  │
    │ (Uvicorn) │    │ (Uvicorn) │    │ (Uvicorn) │
    └───────────┘    └───────────┘    └───────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼───────┐
                    │   Database   │
                    │   (Postgres) │
                    └──────────────┘
```

### Sticky sessions

**Problème** : SSE crée une connexion longue → le load balancer doit router vers le même worker.

#### Nginx sticky sessions
```nginx
upstream backend {
    # IP hash : même client → même worker
    ip_hash;

    server worker1:8000;
    server worker2:8000;
    server worker3:8000;
}

server {
    location /api/ {
        proxy_pass http://backend;
        # ... config SSE ...
    }
}
```

#### Alternative : Session cookie
```nginx
upstream backend {
    server worker1:8000;
    server worker2:8000;
    server worker3:8000;

    # Sticky sessions via cookie
    sticky cookie srv_id expires=1h path=/;
}
```

### Stateless workers (recommandé)

Éviter de stocker l'état dans les workers :

```python
# ❌ Éviter : état en mémoire
class StreamManager:
    def __init__(self):
        self.active_sessions = {}  # Perdu si worker redémarre

# ✅ Préférer : état en DB/Redis
class StreamManager:
    def __init__(self, redis_client):
        self.redis = redis_client

    def start_session(self, chat_id, user_id):
        self.redis.setex(
            f"stream:{chat_id}",
            ttl=300,  # 5 minutes
            value=json.dumps({"user_id": user_id, "started_at": datetime.now()})
        )
```

**Avantage** : Workers interchangeables, restart sans perte d'état.

## Optimisations

### Connection pooling (Database)

```python
# app/database/connection.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=10,          # Connexions permanentes
    max_overflow=20,       # Connexions temporaires supplémentaires
    pool_pre_ping=True,    # Vérifier connexion avant utilisation
    pool_recycle=3600,     # Recycler après 1h
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
```

### HTTP client pooling (LLM providers)

```python
# app/core/utils/shared/http_client.py
import httpx

_http_client = None

async def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(300.0),  # 5 minutes
            limits=httpx.Limits(
                max_connections=100,
                max_keepalive_connections=20
            ),
            http2=True,  # HTTP/2 pour providers LLM
        )
    return _http_client

async def close_http_client():
    global _http_client
    if _http_client:
        await _http_client.aclose()
        _http_client = None
```

### Caching agressif (non-streaming)

```python
from functools import lru_cache
from redis import Redis

redis_client = Redis(host='localhost', port=6379)

@lru_cache(maxsize=128)
def get_agent_by_id(agent_id: str):
    """Cache en mémoire (LRU)"""
    # Chargement agent depuis YAML
    return load_agent_yaml(agent_id)

async def get_messages_cached(chat_id: str):
    """Cache Redis"""
    cached = redis_client.get(f"messages:{chat_id}")
    if cached:
        return json.loads(cached)

    messages = await crud.get_messages_by_chat(chat_id)
    redis_client.setex(
        f"messages:{chat_id}",
        ttl=60,  # 1 minute
        value=json.dumps(messages)
    )
    return messages
```

## Monitoring scalabilité

### Métriques clés

```python
from prometheus_client import Gauge, Histogram

# Connexions actives
active_connections = Gauge(
    'sse_active_connections',
    'Number of active SSE connections',
    ['worker_id']
)

# Latence stream
stream_latency = Histogram(
    'sse_stream_latency_seconds',
    'Time to first byte (TTFB)',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

# Throughput
chunks_per_second = Gauge(
    'sse_chunks_per_second',
    'SSE chunks throughput',
    ['chat_id']
)

# Erreurs
stream_errors = Counter(
    'sse_stream_errors_total',
    'Total SSE stream errors',
    ['error_type']
)
```

### Dashboard Grafana

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: ['worker1:8000', 'worker2:8000', 'worker3:8000']
    metrics_path: '/metrics'
```

Requêtes utiles :
```promql
# Connexions actives par worker
sum(sse_active_connections) by (worker_id)

# Latence P95
histogram_quantile(0.95, rate(sse_stream_latency_seconds_bucket[5m]))

# Taux d'erreurs
rate(sse_stream_errors_total[5m])

# Throughput moyen
rate(sse_chunks_per_second[1m])
```

## Limites et contraintes

### HTTP/2 max streams
Limite négociable entre client et serveur (défaut : 100).

Si besoin de plus :
```python
# Uvicorn config (hypothétique, dépend de l'implémentation)
uvicorn.run(
    app,
    http="h2",
    http2_max_concurrent_streams=200  # Doubler la limite
)
```

**Attention** : Augmenter trop = risque d'épuisement mémoire/CPU.

### Keep-alive timeout
Connexions HTTP/2 doivent être maintenues actives.

```nginx
keepalive_timeout 300s;  # 5 minutes
```

### TLS overhead
HTTP/2 nécessite HTTPS (TLS).

Mitigation :
- Terminer TLS au load balancer (pas sur workers)
- Utiliser TLS 1.3 (plus rapide que 1.2)

## Checklist scalabilité

### Infrastructure
- [ ] HTTP/2 activé (Nginx/Apache + Uvicorn)
- [ ] HTTPS/TLS en production (Let's Encrypt)
- [ ] Load balancer avec sticky sessions
- [ ] Workers stateless (état en DB/Redis)
- [ ] Connection pooling (DB + HTTP client)

### Monitoring
- [ ] Métriques Prometheus (connexions, latence, erreurs)
- [ ] Dashboard Grafana
- [ ] Alertes (latence > 5s, erreurs > 1%)
- [ ] Logs centralisés (ELK, Loki)

### Performance
- [ ] Caching agressif (agents, messages)
- [ ] Compression gzip/brotli (static assets)
- [ ] CDN pour frontend (Cloudflare, Fastly)
- [ ] Rate limiting (par user, par IP)

---

**Prochaine section** : [Gestion des Erreurs et Reconnexion](gestion-erreurs.md)
