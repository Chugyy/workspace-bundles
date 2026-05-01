## Méthodes HTTP et Codes de Statut

### Utilisation Correcte des Méthodes HTTP

**GET** - Récupération de données

* Idempotent et sans effet de bord
* Ne modifie jamais les données
* Peut être mis en cache

```
GET /users/123
GET /products?category=electronics
```

**POST** - Création de ressources

* Non idempotent
* Crée une nouvelle ressource
* Retourne généralement `201 Created` avec l'URL de la nouvelle ressource

```
POST /users
Body: { "name": "John Doe", "email": "john@example.com" }
```

**PUT** - Remplacement complet d'une ressource

* Idempotent
* Remplace entièrement la ressource existante

```
PUT /users/123
Body: { "name": "John Updated", "email": "john.new@example.com" }
```

**PATCH** - Modification partielle

* Idempotent (généralement)
* Met à jour seulement les champs spécifiés

```
PATCH /users/123
Body: { "email": "john.new@example.com" }
```

**DELETE** - Suppression de ressource

* Idempotent
* Supprime la ressource

```
DELETE /users/123
```

**HEAD** - Identique à GET mais sans corps de réponse

* Utile pour vérifier l'existence ou obtenir les métadonnées

**OPTIONS** - Décrit les options de communication

* Utilisé pour CORS et discovery

### Codes de Statut HTTP Standards

**2xx - Succès**

* `200 OK` : Requête réussie (GET, PATCH général)
* `201 Created` : Ressource créée avec succès (POST)
* `204 No Content` : Succès sans contenu à retourner (DELETE)

**3xx - Redirection**

* `301 Moved Permanently` : Ressource déplacée définitivement
* `304 Not Modified` : Ressource non modifiée (cache)

**4xx - Erreurs Client**

* `400 Bad Request` : Syntaxe de requête invalide
* `401 Unauthorized` : Authentification requise
* `403 Forbidden` : Authentifié mais non autorisé
* `404 Not Found` : Ressource inexistante
* `405 Method Not Allowed` : Méthode HTTP non supportée
* `409 Conflict` : Conflit avec l'état actuel (ex: doublon)
* `422 Unprocessable Entity` : Syntaxe correcte mais sémantique invalide
* `429 Too Many Requests` : Limite de taux dépassée

**5xx - Erreurs Serveur**

* `500 Internal Server Error` : Erreur serveur générique
* `502 Bad Gateway` : Réponse invalide du serveur amont
* `503 Service Unavailable` : Service temporairement indisponible

### ❌ Erreur à Éviter : Mauvaise Utilisation des Codes de Statut

```
❌ Retourner 200 OK pour toutes les réponses, même les erreurs
❌ Utiliser des codes génériques sans distinction
✅ Utiliser le code de statut approprié pour chaque situation
```

***
