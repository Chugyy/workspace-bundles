## Erreurs Courantes à Éviter

### 🚫 Erreur #1 : Manque de Planification

**Symptômes** :

* Tables créées "à la volée" sans réflexion
* Relations manquantes ou incorrectes
* Nécessité de refonte majeure après quelques mois

**Conséquences** :

* Perte de temps importante
* Données incohérentes
* Coût élevé de refactorisation
* Frustration de l'équipe

**Solution** :

* Investir du temps dans l'analyse initiale
* Créer des diagrammes ER
* Valider avec les parties prenantes
* Prototyper et tester

***

### 🚫 Erreur #2 : Ignorer la Normalisation

**Exemple** :

```sql
-- ❌ Table dénormalisée avec redondance
CREATE TABLE orders_bad (
    order_id INTEGER PRIMARY KEY,
    customer_name VARCHAR(100),
    customer_email VARCHAR(255),
    customer_address TEXT,
    product_name VARCHAR(100),
    product_price DECIMAL(10, 2),
    quantity INTEGER
);
-- Problèmes : Mise à jour difficile, redondance, incohérence

-- ✅ Tables normalisées
CREATE TABLE customers (...);
CREATE TABLE products (...);
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date TIMESTAMP
);
CREATE TABLE order_items (
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER,
    unit_price DECIMAL(10, 2)
);
```

***

### 🚫 Erreur #3 : Pas de Clés Étrangères

**Conséquences** :

* Données orphelines
* Intégrité référentielle non garantie
* Bugs difficiles à tracer
* Nettoyage manuel nécessaire

```sql
-- ❌ Sans contraintes
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER  -- Rien n'empêche un customer_id invalide !
);

-- ✅ Avec contraintes
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT
);
```

***

### 🚫 Erreur #4 : Mauvais Types de Données

```sql
-- ❌ Types inappropriés
CREATE TABLE bad_types (
    price VARCHAR(20),           -- Impossible de faire SUM()
    is_active VARCHAR(5),         -- "true", "false", "yes", "no" ?
    created_date VARCHAR(50),     -- Impossible de trier correctement
    quantity FLOAT                -- Imprécis pour inventaire
);

-- ✅ Types corrects
CREATE TABLE good_types (
    price DECIMAL(10, 2),
    is_active BOOLEAN,
    created_date TIMESTAMP,
    quantity INTEGER
);
```

***

### 🚫 Erreur #5 : Conventions de Nommage Incohérentes

```sql
-- ❌ Inconsistant et confus
CREATE TABLE Customer (        -- PascalCase
    custID INT,                -- camelCase + abréviation
    First_Name VARCHAR(50),    -- Snake_Case avec majuscules
    LASTNAME VARCHAR(50),      -- UPPERCASE
    email_address VARCHAR(255) -- snake_case
);

-- ✅ Cohérent et clair
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(255)
);
```

***

### 🚫 Erreur #6 : Index Manquants ou Excessifs

```sql
-- ❌ Aucun index sur colonne souvent requêtée
SELECT * FROM orders WHERE customer_id = 123;
-- Scan complet de la table à chaque fois !

-- ✅ Index approprié
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- ❌ Trop d'index
CREATE INDEX idx1 ON users(first_name);
CREATE INDEX idx2 ON users(last_name);
CREATE INDEX idx3 ON users(email);
CREATE INDEX idx4 ON users(created_at);
CREATE INDEX idx5 ON users(updated_at);
-- Ralentit énormément INSERT/UPDATE/DELETE

-- ✅ Index judicieux
CREATE INDEX idx_users_email ON users(email);  -- Login fréquent
-- Pas d'index sur first_name, last_name si rarement utilisés seuls
```

***

### 🚫 Erreur #7 : NULL vs Valeur par Défaut

```sql
-- ❌ Confusion sur NULL
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    is_active BOOLEAN  -- NULL = quoi ? Actif ? Inactif ? Inconnu ?
);

-- ✅ Clarté avec valeur par défaut
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,  -- Obligatoire
    is_active BOOLEAN NOT NULL DEFAULT TRUE  -- Défaut clair
);
```

**Quand utiliser NULL** :

* Vraiment optionnel et absence significative
* Exemples : `middle_name`, `deleted_at`, `last_login`

**Quand éviter NULL** :

* Valeur par défaut logique existe
* Simplifie la logique applicative
* Exemples : `is_active`, `quantity`, `price`

***

### 🚫 Erreur #8 : Pas de Documentation

**Conséquences** :

* Nouveaux développeurs perdus
* Logique métier obscure
* Colonnes mystérieuses ("Qu'est-ce que `user_flag_3` ?")
* Temps perdu à deviner

**Solution** :

```sql
-- Documenter !
COMMENT ON TABLE users IS 
'Table principale des utilisateurs de l''application.
Synchronisée avec le SSO toutes les nuits.';

COMMENT ON COLUMN users.legacy_id IS 
'ID de l''ancien système. NULL pour nouveaux utilisateurs.
À supprimer après migration complète (T3 2025).';

COMMENT ON COLUMN users.tier IS 
'Niveau d''abonnement : free, pro, enterprise';
```

***

### 🚫 Erreur #9 : Ignorer les Transactions

```sql
-- ❌ Opérations liées sans transaction
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
-- Si crash ici, l'argent disparaît !
UPDATE accounts SET balance = balance + 100 WHERE account_id = 2;

-- ✅ Transaction ACID
BEGIN;
    UPDATE accounts SET balance = balance - 100 
    WHERE account_id = 1 AND balance >= 100;
    
    IF NOT FOUND THEN
        ROLLBACK;
        RAISE EXCEPTION 'Solde insuffisant';
    END IF;
    
    UPDATE accounts SET balance = balance + 100 
    WHERE account_id = 2;
COMMIT;
```

***

### 🚫 Erreur #10 : Négliger la Sécurité

```sql
-- ❌ Permissions trop larges
GRANT ALL PRIVILEGES ON DATABASE mydb TO app_user;
-- Application a accès à TOUT !

-- ✅ Principe du moindre privilège
GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE orders TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE order_items TO app_user;
-- Pas de DELETE, pas d'accès aux tables admin
```

```python
# ❌ Injection SQL
query = f"SELECT * FROM users WHERE username = '{username}'"

# ✅ Requête paramétrée
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))
```

***
