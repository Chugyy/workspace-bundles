## Conception des URLs et Endpoints

### Bonnes Pratiques de Nommage

**✅ Utilisez des noms au pluriel pour les collections**

```
✅ GET /users
✅ GET /orders
❌ GET /user
❌ GET /order
```

**✅ Utilisez des noms, pas des verbes**

```
✅ GET /users/123
✅ POST /users
❌ GET /getUser/123
❌ POST /createUser
```

Les méthodes HTTP (GET, POST, PUT, DELETE) expriment déjà l'action. Utiliser des verbes dans les URLs est redondant et non-RESTful.

**✅ Hiérarchie logique pour les ressources imbriquées**

```
✅ GET /users/123/orders
✅ GET /customers/456/invoices/789
```

**✅ Utilisez des kebab-case ou snake\_case de manière cohérente**

```
✅ /product-categories
✅ /product_categories
❌ /productCategories (éviter le camelCase dans les URLs)
```

### Structure d'URL Prévisible

Créez une hiérarchie claire et intuitive :

```
/resources                    # Collection
/resources/{id}              # Ressource spécifique
/resources/{id}/sub-resource # Sous-ressource
```

### Évitez les URLs Trop Profondes

```
❌ /users/123/orders/456/items/789/reviews/012
✅ /reviews/012?order_item=789
```

Les URLs trop profondes deviennent difficiles à maintenir et à comprendre. Préférez des paramètres de requête ou des endpoints dédiés.

***
