## Sécurité

La sécurité est primordiale et doit être intégrée dès la conception de l'API.

### HTTPS/TLS

**✅ Utilisez TOUJOURS HTTPS**

* Chiffre les données en transit
* Protège contre les attaques man-in-the-middle
* Valide l'id"entity" du serveur
* Obligatoire pour toute API de production

**✅ Configurez correctement TLS**

* Utilisez TLS 1.2 minimum, préférablement TLS 1.3
* Désactivez les cipher suites faibles
* Implémentez HSTS (HTTP Strict Transport Security)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Authentification

L'authentification vérifie l'id"entity" de l'utilisateur ou de l'application.

**Méthodes d'Authentification :**

**1. API Keys**

* Simple mais limité en sécurité
* Approprié pour les APIs internes ou à faible risque
* ⚠️ Toujours transmettre via l'en-tête Authorization

```
Authorization: Bearer YOUR_API_KEY
```

❌ Jamais dans l'URL (risque de logging)

**Bonnes pratiques API Keys :**

* Rotation régulière
* Différents niveaux de permissions
* Possibilité de révoquer individuellement
* Utiliser des credentials temporaires quand possible

**2. JSON Web Tokens (JWT)**

* Tokens auto-contenus avec claims
* Stateless - parfait pour REST
* Largement supporté

Structure JWT :

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Header.Payload.Signature

**Bonnes pratiques JWT :**

* Tokens d'accès courts (15-30 minutes)
* Refresh tokens pour renouvellement
* Validation de signature sur chaque requête
* Vérifier l'expiration (`exp`), émetteur (`iss`), audience (`aud`)
* Inclure un identifiant de clé (`kid`) pour la rotation des clés

**3. OAuth 2.0**

* Standard industriel pour l'autorisation déléguée
* Différents flows selon le cas d'usage
  * Authorization Code : Applications web
  * Client Credentials : Service-to-service
  * PKCE : Applications mobiles/SPA

**4. OpenID Connect (OIDC)**

* Couche d'id"entity" au-dessus d'OAuth 2.0
* Combine authentification et autorisation
* Idéal pour Single Sign-On (SSO)

**Choix de la méthode :**

* **APIs internes simples** : API Keys
* **Microservices** : JWT ou mTLS
* **APIs publiques** : OAuth 2.0 / OIDC
* **Applications tierces** : OAuth 2.0

### Autorisation

L'autorisation détermine ce qu'un utilisateur authentifié peut faire.

**Modèles d'Autorisation :**

**1. RBAC (Role-Based Access Control)**

* Basé sur les rôles (admin, user, guest)
* Simple et efficace pour la plupart des cas

**2. ABAC (Attribute-Based Access Control)**

* Basé sur des attributs contextuels
* Plus flexible et granulaire
* Exemple : "Accès autorisé si département=IT ET niveau=senior ET heure=business\_hours"

**3. ReBAC (Relationship-Based Access Control)**

* Basé sur les relations entre "entity"s
* Utile pour les systèmes collaboratifs

**✅ Principe du Moindre Privilège**

* N'accordez que les permissions strictement nécessaires
* Tokens avec scopes limités
* Permissions granulaires par endpoint

**✅ Vérification d'autorisation côté serveur**

```
❌ Faire confiance aux données client
✅ Toujours vérifier les permissions côté serveur
```

### Gestion des Secrets

**❌ Erreurs Critiques à Éviter :**

* Jamais de credentials en dur dans le code
* Jamais de secrets dans les repositories Git
* Jamais de clés dans les URLs
* Jamais d'exposition de secrets dans les erreurs

**✅ Bonnes Pratiques :**

* Utiliser des gestionnaires de secrets (HashiCorp Vault, AWS Secrets Manager)
* Variables d'environnement pour la configuration
* Rotation automatique des secrets
* Audit trail des accès aux secrets

### Protection contre les Abus

**1. Rate Limiting (Limitation de Débit)**

Protège contre :

* Attaques DDoS
* Abus de ressources
* Scripts mal configurés

Implémentation :

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1516239022
```

Si limite dépassée :

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 1 hour."
}
```

**Stratégies de Rate Limiting :**

* Par IP
* Par API key
* Par utilisateur
* Fenêtre glissante vs fenêtre fixe

**2. Throttling**

* Limitation progressive pour les requêtes excessives
* Queue avec backpressure

### Input Validation

**✅ Validez TOUTES les entrées**

```javascript
// Validation des types
// Validation de format (email, URL, dates)
// Validation de plage (min/max)
// Sanitization contre les injections
```

**Protection contre :**

* Injections SQL
* XSS (Cross-Site Scripting)
* Command Injection
* Path Traversal

### CORS (Cross-Origin Resource Sharing)

**✅ Configurez CORS correctement**

```
Access-Control-Allow-Origin: https://trustedentity.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

**❌ Évitez le wildcard en production**

```
❌ Access-Control-Allow-Origin: *
```

### Autres Protections

**✅ Protection des Données Sensibles**

* Chiffrement au repos
* Masquage des données sensibles dans les logs
* Pas de données sensibles dans les messages d'erreur
* PII (Personally Identifiable Information) conforme RGPD

**✅ Sécurité des Headers**

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

**✅ Scan de Vulnérabilités**

* Utiliser des outils comme OWASP ZAP, Burp Suite
* Tests de pénétration réguliers
* Audit de sécurité du code

***
