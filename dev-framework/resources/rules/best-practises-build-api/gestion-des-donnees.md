## Gestion des Données

### Format des Données

**✅ Utilisez JSON comme format standard**

* Plus léger que XML
* Facilement parsable
* Standard de facto pour les APIs REST modernes

**✅ Définissez Content-Type correctement**

```
Content-Type: application/json
```

**✅ Convention de nommage cohérente**

```json
{
  "user_id": 123,          // snake_case
  "first_name": "John",
  "created_at": "2025-01-16T10:30:00Z"
}
```

OU

```json
{
  "userId": 123,           // camelCase
  "firstName": "John",
  "createdAt": "2025-01-16T10:30:00Z"
}
```

Choisissez une convention et tenez-vous-y dans toute votre API.

### Pagination

**✅ Implémentez toujours la pagination pour les collections**

Sans pagination, retourner des milliers d'enregistrements peut :

* Causer des timeouts
* Surcharger le réseau
* Dégrader l'expérience utilisateur
* Augmenter vos coûts cloud

**Méthodes de pagination :**

**1. Pagination par offset/limit (page-based)**

```
GET /users?page=2&limit=20
GET /users?offset=40&limit=20
```

Réponse :

```json
{
  "data": [...],
  "pagination": {
    "current_page": 2,
    "per_page": 20,
    "total_pages": 10,
    "total_items": 200
  }
}
```

**2. Pagination par curseur (cursor-based)**
Meilleure pour les grands datasets et données changeantes

```
GET /users?cursor=eyJpZCI6MTIzfQ&limit=20
```

Réponse :

```json
{
  "data": [...],
  "next_cursor": "eyJpZCI6MTQzfQ",
  "has_more": true
}
```

### Filtrage et Recherche

**✅ Permettez le filtrage via paramètres de requête**

```
GET /products?category=electronics&price_min=100&price_max=500
GET /users?status=active&role=admin
GET /articles?published_after=2025-01-01
```

**✅ Implémentez la recherche full-text**

```
GET /products?search=laptop
GET /articles?q=machine+learning
```

### Tri

**✅ Permettez le tri personnalisable**

```
GET /users?sort=created_at:desc
GET /products?sort=price:asc,name:asc
```

### Sélection de Champs (Field Selection)

**✅ Permettez aux clients de spécifier les champs nécessaires**
Réduit la bande passante et améliore les performances

```
GET /users?fields=id,name,email
```

Réponse :

```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### ❌ Erreur : Surcharge de Données (Over-fetching)

```
❌ Retourner tous les champs pour chaque ressource
❌ Retourner des données imbriquées non demandées
✅ Permettre la sélection de champs
✅ Utiliser des endpoints dédiés pour différents niveaux de détail
```

***
