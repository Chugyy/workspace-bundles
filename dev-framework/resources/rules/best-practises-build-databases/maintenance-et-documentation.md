## Maintenance et Documentation

### ✅ Bonnes Pratiques

#### 1. Documentation du Schéma

**Documenter les Tables et Colonnes** :

```sql
-- PostgreSQL : Commentaires sur objets
COMMENT ON TABLE customers IS 
'Stocke les informations des clients. 
Mise à jour quotidienne via ETL depuis le CRM.';

COMMENT ON COLUMN customers.customer_id IS 
'Identifiant unique du client (clé primaire auto-incrémentée)';

COMMENT ON COLUMN customers.customer_status IS 
'Statut du client. Valeurs possibles : active, inactive, suspended';

COMMENT ON COLUMN customers.last_purchase_date IS 
'Date du dernier achat. NULL si aucun achat effectué.';

-- Récupérer les commentaires
SELECT 
    cols.column_name,
    pg_catalog.col_description(c.oid, cols.ordinal_position::int)
FROM information_schema.columns cols
JOIN pg_catalog.pg_class c ON c.relname = cols.table_name
WHERE cols.table_name = 'customers';
```

**Diagrammes Entité-Relation (ERD)** :

```
Outils recommandés :
- dbdiagram.io
- draw.io
- Lucidchart
- DbSchema
- MySQL Workbench
- pgAdmin (PostgreSQL)

Mettre à jour le ERD à chaque changement de schéma
Stocker dans le contrôle de version avec le code
```

#### 2. Versionnement du Schéma

**Migrations de Base de Données** :

```sql
-- Migration 001_create_users.sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration 002_add_user_status.sql
ALTER TABLE users 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;

ALTER TABLE users 
ADD CONSTRAINT ck_users_status 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Migration 003_create_orders.sql
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user 
        FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

**Table de Suivi des Migrations** :

```sql
CREATE TABLE schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Enregistrer chaque migration
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Create users table');

INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Add user status column');
```

**Outils de Migration** :

* **Flyway** (Java, multi-BD)
* **Liquibase** (Java, XML/JSON/SQL)
* **Alembic** (Python)
* **Rails Migrations** (Ruby)
* **Knex.js** (JavaScript)
* **golang-migrate** (Go)

#### 3. Procédures de Maintenance

**Checklist Quotidienne** :

```
□ Vérifier les sauvegardes (succès/échec)
□ Surveiller l'espace disque
□ Vérifier les requêtes lentes
□ Examiner les logs d'erreur
□ Surveiller les connexions actives
```

**Checklist Hebdomadaire** :

```
□ Analyser les statistiques de tables
□ Vérifier les index inutilisés
□ Examiner les plans d'exécution des requêtes critiques
□ Vérifier les deadlocks
□ Tester la restauration d'une sauvegarde
```

**Checklist Mensuelle** :

```
□ Réviser et optimiser les requêtes lentes
□ Nettoyer les données obsolètes
□ Vérifier la croissance de la BD
□ Revoir les permissions utilisateurs
□ Mettre à jour la documentation
□ Planifier les mises à niveau
```

#### 4. Standards de Développement

**Document de Standards** :

```markdown
# Standards de Base de Données - Projet XYZ

## Conventions de Nommage
- Tables : snake_case, pluriel (ex: `customers`, `order_items`)
- Colonnes : snake_case (ex: `first_name`, `created_at`)
- Index : `idx_table_column` (ex: `idx_users_email`)
- Contraintes FK : `fk_table_ref` (ex: `fk_orders_customer`)
- Contraintes CK : `ck_table_condition` (ex: `ck_users_age`)

## Types de Données Standards
- ID : SERIAL (PostgreSQL) / INT AUTO_INCREMENT (MySQL)
- Montants : DECIMAL(10, 2)
- Dates : TIMESTAMP WITH TIME ZONE
- Booléens : BOOLEAN
- Texte court : VARCHAR(n)
- Texte long : TEXT

## Règles d'Index
- Toujours indexer les clés étrangères
- Index sur colonnes fréquentes dans WHERE
- Nommer explicitement tous les index
- Documenter la raison des index composites

## Process de Migration
1. Créer script de migration numéroté
2. Tester sur environnement dev
3. Révision par pair
4. Tester sur staging
5. Planifier maintenance pour production
6. Exécuter et valider
7. Mettre à jour documentation

## Sauvegardes
- Complète : 2h du matin quotidien
- Incrémentale : Toutes les heures
- Rétention : 30 jours
- Localisation : S3 + backup local
- Test restauration : Premier lundi du mois
```

#### 5. Gestion des Environnements

```
Environnements Standard :
1. Développement (dev)
   - Données de test
   - Schéma identique à production
   - Permissions moins restrictives

2. Test / QA
   - Données anonymisées de production
   - Tests automatisés
   - Tests de performance

3. Staging
   - Réplique exacte de production
   - Dernière validation avant déploiement
   - Volume de données similaire

4. Production
   - Données réelles
   - Haute disponibilité
   - Surveillance stricte
   - Sauvegardes rigoureuses
```

### ❌ Erreurs à Éviter

* **❌ Aucune documentation** : "Le code se documente tout seul"
* **❌ Modifications directes en production** : Sans scripts de migration
* **❌ Pas de contrôle de version** : Schéma non versionné
* **❌ Négliger la maintenance** : Ne jamais faire VACUUM/ANALYZE
* **❌ Ignorer les logs** : Ne pas surveiller les erreurs
* **❌ Environnements incohérents** : Dev différent de Prod

***
