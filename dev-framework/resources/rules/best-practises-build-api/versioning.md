## Versioning

Le versioning permet l'évolution de l'API sans casser les clients existants.

### Pourquoi versionner ?

* Introduire des breaking changes
* Faire évoluer le modèle de données
* Déprécier des fonctionnalités
* Maintenir la compatibilité ascendante

### Stratégies de Versioning

**1. URL Versioning (Recommandé)**

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

**Avantages :**

* Très visible et explicite
* Facile à router
* Compatible avec les outils de test

**Inconvénients :**

* URLs multiples pour même ressource
* Peut violer le principe REST pur

**2. Header Versioning**

```
GET /users
Accept: application/vnd.example.v2+json
```

ou

```
GET /users
API-Version: 2
```

**Avantages :**

* URLs stables
* Plus RESTful

**Inconvénients :**

* Moins visible
* Plus complexe à tester

**3. Query Parameter Versioning**

```
GET /users?version=2
```

**À éviter généralement** - peut causer des problèmes de cache

### Bonnes Pratiques de Versioning

**✅ Versionner dès le début**

```
✅ /v1/users (dès le premier jour)
❌ /users puis /v2/users (tard)
```

**✅ Maintenir au moins 2 versions**

* Version actuelle (N)
* Version précédente (N-1)
* Permet migration progressive

**✅ Documenter les changements**

* Changelog détaillé
* Guide de migration
* Date de dépréciation

**✅ Communiquer les dépréciations**

```
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Deprecation: true
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

**✅ Ne pas faire de micro-versions**

```
❌ v1.2.3, v1.2.4, v1.3.0
✅ v1, v2, v3
```

**✅ Breaking vs Non-Breaking Changes**

**Breaking Changes (nécessite nouvelle version) :**

* Supprimer un endpoint
* Renommer un champ
* Changer le type d'un champ
* Modifier le comportement d'un endpoint

**Non-Breaking Changes (même version) :**

* Ajouter un nouveau endpoint
* Ajouter un nouveau champ optionnel
* Ajouter une nouvelle valeur enum

***
