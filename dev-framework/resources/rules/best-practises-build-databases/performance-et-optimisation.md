## Performance et Optimisation

### ✅ Bonnes Pratiques

#### 1. Métriques de Performance à Surveiller

**Métriques Clés** :

```
- Temps de réponse des requêtes
- Utilisation CPU et mémoire
- I/O disque (lectures/écritures)
- Nombre de connexions actives
- Taux de hit du cache
- Temps de verrouillage (locks)
- Taille de la base de données
```

**Requêtes Lentes** :

```sql
-- PostgreSQL : Activer le logging des requêtes lentes
-- postgresql.conf
log_min_duration_statement = 1000  -- Log requêtes > 1 seconde

-- Analyser les requêtes lentes
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### 2. Optimisation des Requêtes

**Utiliser EXPLAIN ANALYZE** :

```sql
EXPLAIN ANALYZE
SELECT 
    o.order_id,
    o.total_amount,
    c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2024-01-01'
  AND o.status = 'completed';

-- Chercher :
-- - Seq Scan (scan complet) → Ajouter index
-- - High cost → Optimiser requête
-- - Nested Loop inefficace → Vérifier index jointures
```

**Éviter les Scans Complets** :

```sql
-- ❌ MAUVAIS : Scan complet
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
-- Index sur email n'est pas utilisé à cause de LOWER()

-- ✅ BON : Index fonctionnel
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- ✅ ENCORE MIEUX : Stocker email en lowercase
SELECT * FROM users WHERE email = 'john@example.com';
```

**Optimiser les Jointures** :

```sql
-- ✅ BON : Filtrer avant de joindre
SELECT 
    o.order_id,
    c.customer_name
FROM (
    SELECT order_id, customer_id
    FROM orders
    WHERE order_date >= '2024-01-01'  -- Filtre en premier
) o
JOIN customers c ON o.customer_id = c.customer_id;

-- Mieux encore : Laisser l'optimiseur décider
SELECT 
    o.order_id,
    c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2024-01-01';
-- Avec statistiques à jour, l'optimiseur choisira le meilleur plan
```

#### 3. Mise en Cache

**Cache de Requêtes** :

```sql
-- Vues matérialisées pour résultats coûteux
CREATE MATERIALIZED VIEW sales_summary AS
SELECT 
    DATE_TRUNC('month', order_date) AS month,
    product_category,
    SUM(total_amount) AS total_sales,
    COUNT(*) AS order_count
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY DATE_TRUNC('month', order_date), product_category;

-- Créer index sur la vue matérialisée
CREATE INDEX idx_sales_summary_month ON sales_summary(month);

-- Rafraîchir périodiquement
REFRESH MATERIALIZED VIEW sales_summary;

-- Ou rafraîchir de manière concurrente (sans bloquer lectures)
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary;
```

**Cache Applicatif** :

```python
# Redis pour cache applicatif
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379)

def get_user(user_id):
    # Vérifier cache
    cache_key = f"user:{user_id}"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Requête BD si pas en cache
    user = db.query("SELECT * FROM users WHERE user_id = %s", (user_id,))
    
    # Mettre en cache (expiration 1 heure)
    redis_client.setex(
        cache_key,
        3600,
        json.dumps(user)
    )
    
    return user
```

#### 4. Partitionnement

**Partitionnement par Plage (Range)** :

```sql
-- PostgreSQL : Partitionnement par date
CREATE TABLE orders (
    order_id BIGSERIAL,
    customer_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10, 2),
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

-- Créer les partitions
CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE orders_2024_q3 PARTITION OF orders
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE orders_2024_q4 PARTITION OF orders
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- Les requêtes utilisent automatiquement la bonne partition
SELECT * FROM orders 
WHERE order_date BETWEEN '2024-07-01' AND '2024-09-30';
-- Scanne uniquement orders_2024_q3
```

**Partitionnement par Liste** :

```sql
-- Partitionnement par région
CREATE TABLE customers (
    customer_id SERIAL,
    name VARCHAR(100),
    region VARCHAR(50),
    PRIMARY KEY (customer_id, region)
) PARTITION BY LIST (region);

CREATE TABLE customers_europe PARTITION OF customers
    FOR VALUES IN ('UK', 'FR', 'DE', 'IT', 'ES');

CREATE TABLE customers_asia PARTITION OF customers
    FOR VALUES IN ('JP', 'CN', 'IN', 'KR');

CREATE TABLE customers_americas PARTITION OF customers
    FOR VALUES IN ('US', 'CA', 'BR', 'MX');
```

#### 5. Pool de Connexions

```python
# ✅ BON : Utiliser un pool de connexions
from psycopg2 import pool

# Créer un pool
connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=20,  # Maximum 20 connexions
    host='localhost',
    database='mydb',
    user='app_user',
    password='secure_password'
)

# Obtenir une connexion du pool
conn = connection_pool.getconn()

try:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
finally:
    # Retourner la connexion au pool
    connection_pool.putconn(conn)
```

#### 6. Statistiques et Vacuum

```sql
-- PostgreSQL : Mettre à jour les statistiques
ANALYZE users;
ANALYZE orders;

-- Vacuum pour récupérer l'espace
VACUUM ANALYZE users;

-- Configuration autovacuum (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
```

#### 7. Configuration du Serveur

```ini
# postgresql.conf - Exemples d'optimisations

# Mémoire
shared_buffers = 4GB              # 25% de RAM
effective_cache_size = 12GB       # 75% de RAM
work_mem = 64MB                   # Par opération de tri/hash
maintenance_work_mem = 1GB        # Pour VACUUM, CREATE INDEX

# Connexions
max_connections = 100
superuser_reserved_connections = 3

# Checkpoint et WAL
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB

# Logging
logging_collector = on
log_min_duration_statement = 1000  # Log requêtes > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
```

### ❌ Erreurs à Éviter

* **❌ Ne jamais analyser les requêtes lentes**
* **❌ Ne pas surveiller les métriques de performance**
* **❌ Utiliser SELECT \* partout**
* **❌ Créer des index sans mesurer l'impact**
* **❌ Ne pas maintenir les statistiques à jour**
* **❌ Ignorer les verrous (deadlocks)**
* **❌ Ne pas utiliser de pool de connexions**
* **❌ Partitionner sans nécessité réelle**

***
