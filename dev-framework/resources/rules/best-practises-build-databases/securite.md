## Sécurité

### ✅ Bonnes Pratiques

#### 1. Authentification et Contrôle d'Accès

**Principe du Moindre Privilège** :

```sql
-- ✅ BON : Créer des rôles avec permissions minimales

-- Rôle lecture seule
CREATE ROLE readonly_user;
GRANT CONNECT ON DATABASE mydb TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Rôle application avec permissions limitées
CREATE ROLE app_user;
GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE orders TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE order_items TO app_user;
-- Pas de DELETE, pas d'accès aux tables sensibles

-- Rôle administrateur
CREATE ROLE admin_user WITH SUPERUSER;

-- Créer des utilisateurs assignés aux rôles
CREATE USER report_viewer WITH PASSWORD 'securepass123';
GRANT readonly_user TO report_viewer;

CREATE USER api_service WITH PASSWORD 'anothersecurepass456';
GRANT app_user TO api_service;
```

**Contrôle d'Accès au Niveau Ligne (Row-Level Security)** :

```sql
-- PostgreSQL : RLS
CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    owner_id INTEGER,
    is_public BOOLEAN DEFAULT FALSE
);

-- Activer RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Politique : Utilisateurs voient uniquement leurs documents ou publics
CREATE POLICY documents_select_policy ON documents
    FOR SELECT
    USING (owner_id = current_user_id() OR is_public = TRUE);

-- Politique : Utilisateurs modifient uniquement leurs documents
CREATE POLICY documents_update_policy ON documents
    FOR UPDATE
    USING (owner_id = current_user_id());
```

#### 2. Chiffrement

**Chiffrement au Repos** :

```
- Chiffrer le stockage au niveau du système de fichiers
- Utiliser Transparent Data Encryption (TDE) si disponible
- Chiffrer les sauvegardes
```

**Chiffrement en Transit** :

```
- Toujours utiliser SSL/TLS pour les connexions
- Configuration PostgreSQL :
  ssl = on
  ssl_cert_file = 'server.crt'
  ssl_key_file = 'server.key'
```

**Chiffrement au Niveau Application** :

```sql
-- Pour données très sensibles (numéros de carte, SSN)
-- Utiliser une bibliothèque de chiffrement côté application

-- PostgreSQL : Extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stockage de données chiffrées
INSERT INTO sensitive_data (user_id, encrypted_ssn)
VALUES (
    123,
    pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- Lecture
SELECT 
    user_id,
    pgp_sym_decrypt(encrypted_ssn::bytea, 'encryption_key') AS ssn
FROM sensitive_data
WHERE user_id = 123;
```

#### 3. Protection Contre les Injections SQL

**Toujours utiliser des requêtes paramétrées** :

```python
# ❌ DANGEREUX : Concaténation
username = request.get('username')
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

# ✅ SÉCURISÉ : Paramètres liés
username = request.get('username')
cursor.execute(
    "SELECT * FROM users WHERE username = %s",
    (username,)
)
```

```javascript
// ❌ DANGEREUX : Concaténation
const userId = req.params.id;
const query = `SELECT * FROM users WHERE user_id = ${userId}`;

// ✅ SÉCURISÉ : Requêtes paramétrées
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE user_id = ?';
db.query(query, [userId]);
```

**Procédures Stockées** :

```sql
-- ✅ BON : Utiliser des procédures stockées pour logique sensible
CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id INTEGER)
RETURNS TABLE (user_id INTEGER, username VARCHAR, email VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER  -- Exécute avec privilèges du propriétaire
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.username, u.email
    FROM users u
    WHERE u.user_id = p_user_id
      AND u.deleted_at IS NULL;
END;
$$;

-- Appel sécurisé
SELECT * FROM get_user_by_id(123);
```

#### 4. Audit et Surveillance

**Journalisation des Événements** :

```sql
-- Créer une table d'audit
CREATE TABLE audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    operation VARCHAR(10),
    user_name VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB,
    ip_address INET
);

-- Trigger d'audit automatique
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, user_name, new_values)
        VALUES (TG_TABLE_NAME, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, user_name, old_values, new_values)
        VALUES (TG_TABLE_NAME, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, user_name, old_values)
        VALUES (TG_TABLE_NAME, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Surveillance en Temps Réel** :

```
- Surveiller les tentatives de connexion échouées
- Détecter les patterns de requêtes suspects
- Alertes sur accès inhabituels
- Monitoring des performances (spikes inattendus)
```

#### 5. Gestion des Mots de Passe

```sql
-- ❌ JAMAIS : Stocker en clair
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    password VARCHAR(255)  -- DANGEREUX !
);

-- ✅ BON : Hasher avec salt
-- Utiliser bcrypt, scrypt, ou Argon2 dans l'application
-- PostgreSQL : Extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Insertion (côté application avec bcrypt recommandé)
-- Ou avec pgcrypto :
INSERT INTO users (username, password_hash)
VALUES (
    'john_doe',
    crypt('user_password', gen_salt('bf'))  -- Blowfish
);

-- Vérification
SELECT user_id, username
FROM users
WHERE username = 'john_doe'
  AND password_hash = crypt('user_password', password_hash);
```

#### 6. Sauvegardes Sécurisées

```bash
# ✅ BON : Sauvegardes régulières et chiffrées

# PostgreSQL : pg_dump avec compression
pg_dump -U postgres -Fc mydb > backup_$(date +%Y%m%d).dump

# Chiffrer la sauvegarde
gpg --encrypt --recipient admin@company.com backup_20240116.dump

# Stocker hors site (cloud sécurisé, stockage distant)
aws s3 cp backup_20240116.dump.gpg s3://secure-backups/db/

# Tester régulièrement la restauration !
pg_restore -U postgres -d mydb_test backup_20240116.dump
```

**Plan de sauvegarde** :

* Sauvegardes complètes quotidiennes
* Sauvegardes incrémentielles toutes les heures
* Rétention : 7 jours locaux, 30 jours distants
* Tester restauration mensuellement
* Chiffrer toutes les sauvegardes
* Stocker clés de chiffrement séparément

### ❌ Erreurs à Éviter

* **❌ Donner des droits SUPERUSER à l'application**
* **❌ Utiliser le compte 'root' ou 'postgres' pour l'application**
* **❌ Stocker des mots de passe en clair ou mal hashés (MD5)**
* **❌ Ne pas auditer les accès**
* **❌ Ignorer les mises à jour de sécurité**
* **❌ Exposer la base de données directement sur Internet**
* **❌ Ne pas tester les restaurations de sauvegardes**
* **❌ Utiliser des connexions non chiffrées**

***
