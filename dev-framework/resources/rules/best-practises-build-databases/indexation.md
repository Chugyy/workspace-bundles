## Indexation

### ✅ Bonnes Pratiques

#### 1. Identifier les Colonnes à Indexer

**Colonnes fréquemment utilisées dans** :

* Clauses `WHERE`
* Clauses `JOIN`
* Clauses `ORDER BY`
* Clauses `GROUP BY`

```sql
-- Exemple d'analyse des requêtes fréquentes
-- Si requête fréquente :
SELECT * FROM orders 
WHERE customer_id = 123 
  AND status = 'pending'
ORDER BY created_at DESC;

-- Créer des index appropriés :
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Ou un index composite :
CREATE INDEX idx_orders_customer_status_date 
    ON orders(customer_id, status, created_at);
```

#### 2. Types d'Index

**Index B-tree (par défaut)** :

```sql
-- Index standard, bon pour la plupart des cas
CREATE INDEX idx_users_email ON users(email);
```

**Index Unique** :

```sql
-- Garantit l'unicité et crée un index
CREATE UNIQUE INDEX idx_users_username_unique ON users(username);
```

**Index Composite** :

```sql
-- Pour requêtes multi-colonnes
CREATE INDEX idx_orders_customer_date 
    ON orders(customer_id, order_date);

-- L'ordre des colonnes est important !
-- Cet index aide pour :
-- - WHERE customer_id = X
-- - WHERE customer_id = X AND order_date = Y
-- Mais PAS pour :
-- - WHERE order_date = Y (seule)
```

**Index Partiel** :

```sql
-- Index uniquement sur un sous-ensemble de données
CREATE INDEX idx_orders_pending 
    ON orders(created_at) 
    WHERE status = 'pending';
-- Utile quand on requête souvent un statut spécifique
```

**Index Full-Text** (PostgreSQL) :

```sql
-- Pour recherches textuelles
CREATE INDEX idx_articles_content_fts 
    ON articles 
    USING gin(to_tsvector('french', content));

-- Utilisation :
SELECT * FROM articles 
WHERE to_tsvector('french', content) @@ to_tsquery('french', 'database & performance');
```

#### 3. Stratégie d'Indexation

**Règles générales** :

```sql
-- ✅ BON : Index sur colonnes sélectives
CREATE INDEX idx_users_country ON users(country);
-- Si la table a beaucoup d'utilisateurs de différents pays

-- ❌ MAUVAIS : Index sur colonnes peu sélectives
CREATE INDEX idx_users_is_active ON users(is_active);
-- Si 99% des utilisateurs sont actifs, l'index apporte peu

-- ✅ BON : Index couvrant
CREATE INDEX idx_orders_covering 
    ON orders(customer_id) 
    INCLUDE (order_date, total_amount);
-- Permet de récupérer ces colonnes directement de l'index
```

**Surveiller la performance** :

```sql
-- PostgreSQL : Analyser l'utilisation des index
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Index jamais utilisés
ORDER BY pg_relation_size(indexrelid) DESC;

-- Supprimer les index inutilisés
DROP INDEX IF EXISTS idx_unused_index;
```

#### 4. Équilibrer Lecture vs Écriture

```
Index = Amélioration des LECTURES / Ralentissement des ÉCRITURES

Trop d'index :
- INSERT plus lent (chaque index doit être mis à jour)
- UPDATE plus lent (si colonnes indexées changent)
- DELETE plus lent (chaque index doit être mis à jour)
- Espace disque supplémentaire

Pas assez d'index :
- SELECT très lent
- Scans complets de tables
- Ressources serveur gaspillées
```

**Recommandations** :

* Commencer avec les index essentiels (clés primaires, étrangères, uniques)
* Ajouter des index basés sur les requêtes réelles
* Monitorer et supprimer les index inutilisés
* Pour tables write-heavy, être conservateur avec les index
* Pour tables read-heavy, indexer généreusement

### ❌ Erreurs à Éviter

#### 1. Sur-indexation

```sql
-- ❌ MAUVAIS : Trop d'index sur une petite table
CREATE TABLE settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE,
    setting_value TEXT
);

-- Pas besoin d'ajouter :
CREATE INDEX idx_settings_key ON settings(setting_key);    -- Redondant avec UNIQUE
CREATE INDEX idx_settings_value ON settings(setting_value); -- Probablement inutile
```

#### 2. Index Redondants

```sql
-- Si vous avez :
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);

-- Pas besoin de :
CREATE INDEX idx_orders_customer ON orders(customer_id);
-- Le premier index composite couvre déjà customer_id seul
```

#### 3. Ignorer l'Ordre des Colonnes dans Index Composites

```sql
-- Pour la requête :
SELECT * FROM orders 
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'
  AND customer_id = 123;

-- ✅ BON :
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);

-- ❌ MOINS BON :
CREATE INDEX idx_orders_date_customer ON orders(order_date, customer_id);
-- Moins efficace car customer_id est très sélectif
```

**Règle générale pour l'ordre** :

1. Colonnes avec égalité (`=`) en premier
2. Colonnes avec plages (`BETWEEN`, `>`, `<`) ensuite
3. Colonnes les plus sélectives en premier

***
