## Opérations CRUD

### ✅ Bonnes Pratiques

#### CREATE (INSERT)

**Validation des Données** :

```sql
-- ✅ BON : Validation au niveau de la base de données
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    
    CONSTRAINT ck_users_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_users_age_valid 
        CHECK (age >= 0 AND age <= 150)
);

-- Insertion sécurisée avec paramètres liés (préparé statement)
-- Python (psycopg2)
cursor.execute(
    "INSERT INTO users (email, age) VALUES (%s, %s)",
    (email, age)
)
```

**Insertions en Masse** :

```sql
-- ✅ BON : Insertion multiple en une requête
INSERT INTO products (name, price, category_id)
VALUES 
    ('Product 1', 19.99, 1),
    ('Product 2', 29.99, 1),
    ('Product 3', 39.99, 2);

-- ❌ MAUVAIS : Insertions séparées
INSERT INTO products (name, price, category_id) VALUES ('Product 1', 19.99, 1);
INSERT INTO products (name, price, category_id) VALUES ('Product 2', 29.99, 1);
INSERT INTO products (name, price, category_id) VALUES ('Product 3', 39.99, 2);
```

**UPSERT (INSERT or UPDATE)** :

```sql
-- PostgreSQL : ON CONFLICT
INSERT INTO users (user_id, username, email, last_login)
VALUES (1, 'john_doe', 'john@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (user_id) 
DO UPDATE SET 
    last_login = EXCLUDED.last_login,
    updated_at = CURRENT_TIMESTAMP;

-- MySQL : ON DUPLICATE KEY UPDATE
INSERT INTO users (user_id, username, email, last_login)
VALUES (1, 'john_doe', 'john@example.com', NOW())
ON DUPLICATE KEY UPDATE 
    last_login = VALUES(last_login),
    updated_at = NOW();
```

#### READ (SELECT)

**Sélection Spécifique** :

```sql
-- ✅ BON : Sélectionner uniquement les colonnes nécessaires
SELECT user_id, username, email 
FROM users 
WHERE status = 'active';

-- ❌ MAUVAIS : SELECT *
SELECT * FROM users WHERE status = 'active';
-- Problèmes : performance, consommation réseau, couplage fort
```

**Utilisation de LIMIT** :

```sql
-- ✅ BON : Paginer les résultats
SELECT user_id, username, email 
FROM users 
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;  -- Page 1

-- Pour pagination efficace (PostgreSQL) :
SELECT user_id, username, email 
FROM users 
WHERE created_at < '2024-01-01 12:00:00'  -- Dernière valeur de la page précédente
ORDER BY created_at DESC
LIMIT 20;
```

**Jointures Efficaces** :

```sql
-- ✅ BON : Jointure avec index sur les clés
SELECT 
    o.order_id,
    o.order_date,
    c.customer_name,
    c.email
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2024-01-01'
  AND o.status = 'completed';
-- Assurer que customer_id est indexé dans les deux tables

-- Utiliser EXPLAIN pour analyser
EXPLAIN ANALYZE
SELECT ...
```

**Éviter N+1 Queries** :

```sql
-- ❌ MAUVAIS : N+1 queries
-- 1 requête pour les commandes
SELECT * FROM orders WHERE customer_id = 123;
-- Puis N requêtes pour chaque item
SELECT * FROM order_items WHERE order_id = ?;

-- ✅ BON : Jointure unique
SELECT 
    o.order_id,
    o.order_date,
    oi.product_id,
    oi.quantity,
    oi.unit_price
FROM orders o
LEFT JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.customer_id = 123;
```

#### UPDATE

**Toujours utiliser WHERE** :

```sql
-- ✅ BON : Mise à jour ciblée
UPDATE users 
SET last_login = CURRENT_TIMESTAMP,
    login_count = login_count + 1
WHERE user_id = 123;

-- ❌ DANGER : Sans WHERE, met à jour TOUTES les lignes !
UPDATE users 
SET last_login = CURRENT_TIMESTAMP;
```

**Mise à Jour Conditionnelle** :

```sql
-- ✅ BON : Vérifier avant de mettre à jour
UPDATE products 
SET 
    price = 29.99,
    updated_at = CURRENT_TIMESTAMP
WHERE product_id = 456
  AND price != 29.99  -- Ne met à jour que si le prix est différent
RETURNING *;  -- PostgreSQL : retourne les lignes mises à jour
```

**Mise à Jour en Masse** :

```sql
-- ✅ BON : Mise à jour basée sur une jointure
UPDATE products p
SET category_id = c.new_category_id
FROM category_mappings c
WHERE p.category_id = c.old_category_id;
```

**Soft Delete vs Hard Delete** :

```sql
-- ✅ RECOMMANDÉ : Soft delete avec flag
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP,
    deleted_by = 'admin_user'
WHERE user_id = 123;

-- Requêtes excluent les supprimés
SELECT * FROM users WHERE deleted_at IS NULL;

-- ✅ Alternative : Statut
UPDATE users 
SET status = 'deleted',
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = 123;
```

#### DELETE

**Protection contre Suppression Accidentelle** :

```sql
-- ✅ BON : Toujours utiliser WHERE
DELETE FROM logs 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- ❌ DANGER : Sans WHERE supprime TOUT !
DELETE FROM logs;
-- Préférer TRUNCATE si c'est intentionnel :
TRUNCATE TABLE logs;  -- Plus rapide, reset auto-increment
```

**Suppression avec Cascade** :

```sql
-- Définir le comportement en cascade
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE  -- Supprime les commandes si client supprimé
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE  -- Supprime les items si commande supprimée
);

-- Suppression d'un client supprime automatiquement ses commandes et items
DELETE FROM customers WHERE customer_id = 123;
```

**Suppression par Lots** :

```sql
-- ✅ BON : Supprimer par petits lots pour éviter le verrouillage
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    LOOP
        DELETE FROM logs 
        WHERE log_id IN (
            SELECT log_id FROM logs 
            WHERE created_at < CURRENT_DATE - INTERVAL '1 year'
            LIMIT 1000
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count = 0;
        
        PERFORM pg_sleep(0.1);  -- Petite pause entre les lots
    END LOOP;
END $$;
```

### Transactions et Intégrité

```sql
-- ✅ BON : Utiliser des transactions pour opérations multiples
BEGIN;
    -- Débiter le compte
    UPDATE accounts 
    SET balance = balance - 100 
    WHERE account_id = 1 AND balance >= 100;
    
    -- Vérifier qu'une ligne a été affectée
    IF NOT FOUND THEN
        ROLLBACK;
        RAISE EXCEPTION 'Solde insuffisant';
    END IF;
    
    -- Créditer l'autre compte
    UPDATE accounts 
    SET balance = balance + 100 
    WHERE account_id = 2;
    
    -- Enregistrer la transaction
    INSERT INTO transactions (from_account, to_account, amount)
    VALUES (1, 2, 100);
    
COMMIT;
```

**Niveaux d'Isolation** :

```sql
-- Par défaut : READ COMMITTED
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Pour cohérence stricte : SERIALIZABLE
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Pour lectures répétables : REPEATABLE READ
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### ❌ Erreurs à Éviter

#### 1. Injection SQL

```sql
-- ❌ DANGER : Concaténation de chaînes
query = "SELECT * FROM users WHERE username = '" + username + "'"
-- Vulnérable à : admin' OR '1'='1

-- ✅ BON : Requêtes paramétrées
cursor.execute(
    "SELECT * FROM users WHERE username = %s",
    (username,)
)
```

#### 2. Oublier les Transactions

```sql
-- ❌ MAUVAIS : Opérations liées sans transaction
UPDATE inventory SET quantity = quantity - 5 WHERE product_id = 1;
INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 1, 5);
-- Si la seconde échoue, l'inventaire est incorrect !

-- ✅ BON : Dans une transaction
BEGIN;
    UPDATE inventory SET quantity = quantity - 5 WHERE product_id = 1;
    INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 1, 5);
COMMIT;
```

#### 3. Ne Pas Valider les Données

```sql
-- ❌ MAUVAIS : Aucune validation
INSERT INTO users (age, email) VALUES (-5, 'invalid-email');

-- ✅ BON : Contraintes de validation
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL CHECK (email LIKE '%_@__%.__%'),
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150)
);
```

***
