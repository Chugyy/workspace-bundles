## Normalisation des Données

### ✅ Bonnes Pratiques

#### Comprendre les Formes Normales

**Première Forme Normale (1NF)** :

* Éliminer les groupes répétitifs
* Valeurs atomiques uniquement
* Chaque colonne contient un seul type de donnée

```sql
-- ❌ MAUVAIS : Violation de 1NF
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    phone_numbers VARCHAR(200)  -- "123-456-7890, 098-765-4321"
);

-- ✅ BON : Conforme à 1NF
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE employee_phones (
    phone_id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    phone_number VARCHAR(20),
    phone_type VARCHAR(20),  -- 'mobile', 'home', 'work'
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);
```

**Deuxième Forme Normale (2NF)** :

* Conforme à 1NF
* Éliminer les dépendances partielles
* Tous les attributs non-clés dépendent de la totalité de la clé primaire

```sql
-- ❌ MAUVAIS : Violation de 2NF
CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    product_name VARCHAR(100),    -- Dépend uniquement de product_id
    product_price DECIMAL(10, 2), -- Dépend uniquement de product_id
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id)
);

-- ✅ BON : Conforme à 2NF
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name VARCHAR(100),
    product_price DECIMAL(10, 2)
);

CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price DECIMAL(10, 2),  -- Prix au moment de la commande
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

**Troisième Forme Normale (3NF)** :

* Conforme à 2NF
* Éliminer les dépendances transitives
* Les attributs non-clés ne dépendent que de la clé primaire

```sql
-- ❌ MAUVAIS : Violation de 3NF
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    department_id INTEGER,
    department_name VARCHAR(100),    -- Dépend de department_id
    department_location VARCHAR(100) -- Dépend de department_id
);

-- ✅ BON : Conforme à 3NF
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name VARCHAR(100),
    location VARCHAR(100)
);

CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```

#### Quand Dénormaliser

La dénormalisation peut être appropriée pour :

**1. Amélioration des performances** :

```sql
-- Exemple : Table de reporting pré-calculée
CREATE TABLE monthly_sales_summary (
    year INTEGER,
    month INTEGER,
    product_category VARCHAR(50),
    total_sales DECIMAL(12, 2),
    total_orders INTEGER,
    PRIMARY KEY (year, month, product_category)
);
-- Mise à jour via trigger ou job planifié
```

**2. Data Warehousing / OLAP** :

```sql
-- Schéma en étoile pour analyses
CREATE TABLE fact_sales (
    sale_id BIGINT PRIMARY KEY,
    date_key INTEGER,
    product_key INTEGER,
    customer_key INTEGER,
    store_key INTEGER,
    quantity INTEGER,
    revenue DECIMAL(10, 2),
    cost DECIMAL(10, 2),
    profit DECIMAL(10, 2)
);
```

**Règles de dénormalisation** :

* Documenter clairement les raisons
* Mesurer l'amélioration réelle des performances
* Maintenir l'intégrité par triggers ou code applicatif
* Considérer les vues matérialisées comme alternative

### ❌ Erreurs à Éviter

* **❌ Sur-normalisation** : Créer trop de tables pour de petits ensembles de données
* **❌ Sous-normalisation** : Accepter la redondance par paresse
* **❌ Dénormaliser prématurément** : Optimiser avant de mesurer
* **❌ Ignorer les formes normales** : Ne pas comprendre les principes

***
