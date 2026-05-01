## Gestion des Erreurs

Une bonne gestion des erreurs améliore considérablement l'expérience développeur.

### ❌ Erreur Majeure : Messages d'Erreur Inutiles

```
❌ {"error": "An error occurred"}
❌ {"error": "Error 500"}
❌ {"message": "Something went wrong"}
```

Ces messages ne donnent aucune information exploitable.

### ✅ Format d'Erreur Standard

**Structure Recommandée :**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for one or more fields",
    "details": [
      {
        "field": "email",
        "message": "Email format is invalid",
        "code": "INVALID_FORMAT"
      },
      {
        "field": "age",
        "message": "Age must be at least 18",
        "code": "MIN_VALUE_VIOLATION"
      }
    ],
    "request_id": "req_abc123xyz",
    "documentation_url": "https://api.example.com/docs/errors/validation-error"
  }
}
```

**Éléments Clés :**

* **code** : Identifiant machine-readable
* **message** : Description humaine
* **details** : Erreurs spécifiques par champ
* **request\_id** : Pour le debugging et le support
* **documentation\_url** : Lien vers la doc de l'erreur

### RFC 7807 - Problem Details

Standard IETF pour les erreurs HTTP

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 400,
  "detail": "Account balance is insufficient for this transaction",
  "instance": "/transactions/tx_123",
  "balance": 30.00,
  "required": 50.00
}
```

### Codes d'Erreur Personnalisés

**✅ Créez un catalogue d'erreurs**

```
AUTH_001: Invalid credentials
AUTH_002: Token expired
AUTH_003: Insufficient permissions

VAL_001: Missing required field
VAL_002: Invalid format
VAL_003: Value out of range

RES_001: Resource not found
RES_002: Resource already exists
RES_003: Resource locked
```

### Erreurs de Validation

**✅ Détaillez chaque problème de validation**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "validation_errors": [
    {
      "field": "user.email",
      "message": "Must be a valid email address",
      "received": "not-an-email",
      "constraint": "format:email"
    },
    {
      "field": "user.password",
      "message": "Must be at least 8 characters",
      "received_length": 5,
      "constraint": "minLength:8"
    }
  ]
}
```

### ❌ Erreurs de Sécurité à Éviter

**Ne jamais exposer :**

* Stack traces complets
* Détails d'implémentation
* Chemins de fichiers serveur
* Requêtes SQL
* Versions de framework/bibliothèques
* Messages d'erreur DB bruts

**❌ Mauvais Exemple :**

```json
{
  "error": "SQLException: Duplicate entry 'john@example.com' for key 'users.email_unique' at line 42 in /var/www/api/controllers/UserController.php"
}
```

**✅ Bon Exemple :**

```json
{
  "error": "DUPLICATE_EMAIL",
  "message": "A user with this email already exists",
  "request_id": "req_abc123"
}
```

### Logging des Erreurs

**✅ Loggez les détails sensibles côté serveur**

* Stack trace complète
* Contexte de la requête
* État de l'application
* Identifiant de corrélation

**Mais ne retournez que l'essentiel au client**

### Gestion des Erreurs 5xx

**Pour les erreurs serveur :**

```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred. Please try again later.",
  "request_id": "req_abc123",
  "support_contact": "support@example.com"
}
```

Le request\_id permet au support de retrouver les logs détaillés.

***
