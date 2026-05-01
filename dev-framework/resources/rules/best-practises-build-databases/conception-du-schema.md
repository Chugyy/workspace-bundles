## Conception du Schéma

### ✅ Bonnes Pratiques

#### 1. Conventions de Nommage

**Tables** :

```sql
-- ✅ BON : Noms descriptifs, cohérents
CREATE TABLE customers (...)
CREATE TABLE orders (...)
CREATE TABLE order_items (...)

-- ❌ MAUVAIS : Noms vagues, incohérents
CREATE TABLE tbl1 (...)
CREATE TABLE data (...)
CREATE TABLE OrderDetail (...)  -- Incohérence de casse
```

**Colonnes** :

```sql
-- ✅ BON : Noms clairs et standardisés
customer_id
first_name
last_name
email_address
created_at

-- ❌ MAUVAIS : Abréviations, mots réservés
cust_id
fname
ln
email
order  -- Mot réservé SQL
```

**Règles générales** :

* Utiliser snake\_case ou camelCase (être cohérent)
* Noms descriptifs mais concis
* Éviter les mots réservés SQL
* Ne pas utiliser d'espaces ou de caractères spéciaux
* Préfixer les clés étrangères de manière cohérente (ex: `fk_table_column`)
* Suffixer les dates avec `_at` ou `_date`

#### 2. Clés Primaires

**Utiliser des clés artificielles (surrogate keys)** :

```sql
-- ✅ BON : Clé artificielle auto-incrémentée
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    -- autres colonnes
);

-- ❌ ÉVITER : Utiliser des données business comme clé primaire
CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,  -- Problématique si l'email change
    username VARCHAR(50) NOT NULL,
    -- autres colonnes
);
```

**Avantages des clés artificielles** :

* Immuables (ne changent jamais)
* Plus performantes pour les jointures
* Simplifient les relations
* Indépendantes des données métier

#### 3. Types de Données

**Choisir les types appropriés** :

```sql
-- ✅ BON : Types précis et optimisés
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- Longueur appropriée
    description TEXT,                      -- Texte long
    price DECIMAL(10, 2) NOT NULL,        -- Précision pour l'argent
    quantity_in_stock INTEGER NOT NULL,   -- Entier pour quantité
    is_active BOOLEAN DEFAULT TRUE,       -- Boolean pour drapeaux
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ❌ MAUVAIS : Types inappropriés
CREATE TABLE products (
    product_id VARCHAR(50) PRIMARY KEY,   -- String au lieu d'INT
    name VARCHAR(255),                    -- Trop large
    description VARCHAR(100),             -- Trop court pour description
    price FLOAT,                          -- Imprécis pour l'argent
    quantity_in_stock VARCHAR(10),        -- String au lieu d'INT
    is_active VARCHAR(5),                 -- String au lieu de BOOLEAN
    created_at VARCHAR(50)                -- String au lieu de TIMESTAMP
);
```

**Recommandations** :

* `DECIMAL/NUMERIC` pour les valeurs monétaires (jamais FLOAT)
* `VARCHAR(n)` avec une longueur appropriée
* `TEXT` pour les contenus longs et variables
* `INTEGER/BIGINT` pour les nombres entiers
* `BOOLEAN` pour les valeurs vrai/faux
* `TIMESTAMP` pour les dates et heures
* `DATE` pour les dates sans heure

#### 4. Contraintes d'Intégrité

**Implémenter toutes les contraintes nécessaires** :

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    account_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Contraintes d'unicité
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    
    -- Contraintes de validation
    CONSTRAINT ck_users_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_users_minimum_age 
        CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '13 years'),
    CONSTRAINT ck_users_status 
        CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT ck_users_balance 
        CHECK (account_balance >= 0)
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Clé étrangère avec actions en cascade
    CONSTRAINT fk_orders_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id)
        ON DELETE RESTRICT  -- Empêche la suppression d'un utilisateur avec commandes
        ON UPDATE CASCADE   -- Propage les mises à jour de l'ID
);
```

**Types de contraintes** :

* **NOT NULL** : Valeur obligatoire
* **UNIQUE** : Valeur unique dans la table
* **PRIMARY KEY** : Identifiant unique de la ligne
* **FOREIGN KEY** : Référence vers une autre table
* **CHECK** : Validation de valeur personnalisée
* **DEFAULT** : Valeur par défaut

#### 5. Relations Entre Tables

**One-to-Many (1:N)** :

```sql
-- Un client peut avoir plusieurs commandes
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);
```

**Many-to-Many (N:N)** :

```sql
-- Plusieurs produits dans plusieurs commandes
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de jonction
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    
    CONSTRAINT fk_order_items_order 
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_order_items_product 
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_order_items 
        UNIQUE (order_id, product_id)  -- Un produit par commande
);
```

**One-to-One (1:1)** :

```sql
-- Séparation pour des raisons de performance ou de sécurité
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL
);

CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY,
    bio TEXT,
    avatar_url VARCHAR(255),
    
    CONSTRAINT fk_user_profiles_user 
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);
```

### ❌ Erreurs à Éviter

#### 1. Stocker Plusieurs Valeurs dans une Seule Colonne

```sql
-- ❌ MAUVAIS : Stocker plusieurs valeurs séparées par virgules
CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    tags VARCHAR(500)  -- "tech,programming,database,sql"
);

-- ✅ BON : Table séparée pour les tags
CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    title VARCHAR(200)
);

CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

CREATE TABLE article_tags (
    article_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id)
);
```

#### 2. Utiliser le Modèle EAV (Entity-Attribute-Value) sans Nécessité

```sql
-- ❌ ÉVITER (sauf cas très spécifiques) : Modèle EAV
CREATE TABLE customer_attributes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    attribute_name VARCHAR(50),
    attribute_value TEXT
);
-- Rend les requêtes extrêmement complexes

-- ✅ BON : Structure traditionnelle
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20)
);
```

#### 3. Utiliser des GUID/UUID sans Raison Valable

```sql
-- ❌ CONSIDÉRER PRUDEMMENT : UUID comme clé primaire
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50)
);
-- Moins performant pour les jointures et l'indexation

-- ✅ BON (dans la plupart des cas) : Integer auto-incrémenté
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50)
);
-- Plus performant, plus compact
```

**Quand utiliser UUID** :

* Systèmes distribués nécessitant des ID uniques globalement
* Fusion de bases de données
* Besoin de générer des IDs côté client
* Sécurité par obscurité (ID non séquentiels)

***
