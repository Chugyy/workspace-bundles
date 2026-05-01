# Checklist Validation API Draft

Cette checklist permet de valider un draft API (phase design) contre les best practices REST.

**Usage**: Vérifier chaque point en lisant la doc détaillée correspondante, puis analyser le draft.

---

## 1. Nommage URLs

**Doc détaillée**: `conception-des-urls-et-endpoints.md`

**Points à vérifier**:
- [ ] Ressources au pluriel (`/users` pas `/user`)
- [ ] Pas de verbes dans URLs (`/users` pas `/getUsers`)
- [ ] kebab-case ou snake_case cohérent (`/product-categories` pas `/productCategories`)
- [ ] Hiérarchie REST logique (`/users/{id}/orders` pas `/user-orders`)
- [ ] URLs pas trop profondes (max 3 niveaux recommandé)

**Anti-patterns à détecter**:
- ❌ Verbes dans URL: `/createUser`, `/deleteOrder`
- ❌ Singulier: `/user`, `/order`
- ❌ camelCase: `/productCategories`, `/userProfiles`
- ❌ URLs incohérentes: `/users` ET `/user-list`

---

## 2. Méthodes HTTP et Codes Statut

**Doc détaillée**: `methodes-http-et-codes-de-statut.md`

**Points à vérifier**:
- [ ] POST pour création (retourne 201 Created)
- [ ] GET pour lecture (retourne 200 OK)
- [ ] PUT/PATCH pour modification (retourne 200 OK)
- [ ] DELETE pour suppression (retourne 204 No Content)
- [ ] Codes statut appropriés (400, 401, 403, 404, 409, 500)
- [ ] Pas de GET pour actions modifiant l'état

**Anti-patterns à détecter**:
- ❌ GET qui modifie: `GET /users/123/delete`
- ❌ POST pour lecture: `POST /users/search`
- ❌ Codes génériques partout: toujours 200 OK
- ❌ Méthodes inappropriées: `GET /orders/456/cancel`

---

## 3. Pagination et Filtres

**Doc détaillée**: `gestion-des-donnees.md`

**Points à vérifier**:
- [ ] GET lists ont pagination documentée (`?page=1&limit=20` ou `?cursor=X`)
- [ ] Filtres via query params (`?status=active&role=admin`)
- [ ] Tri documenté si applicable (`?sort=created_at:desc`)
- [ ] Recherche full-text si applicable (`?search=keyword`)
- [ ] Field selection si applicable (`?fields=id,name,email`)

**Anti-patterns à détecter**:
- ❌ GET list sans pagination (retourne tous les items)
- ❌ Filtres dans le body d'un GET
- ❌ Endpoints multiples pour même ressource filtrée

---

## 4. Sécurité

**Doc détaillée**: `04-securite.md`

**Points à vérifier**:
- [ ] Auth documentée (publique vs protégée)
- [ ] Pas de données sensibles dans URLs (`?password=xxx`)
- [ ] Rate limiting documenté sur endpoints sensibles (auth, public)
- [ ] CORS mentionné si API publique
- [ ] Pas de secrets/tokens dans query params

**Anti-patterns à détecter**:
- ❌ Credentials dans URL: `/login?password=secret`
- ❌ Aucune mention d'auth sur endpoints sensibles
- ❌ Pas de rate limiting sur auth endpoints

---

## 5. Cohérence et Redondance

**Doc détaillée**: `erreurs-courantes-a-eviter.md`

**Points à vérifier**:
- [ ] Nommage cohérent entre entités
- [ ] Pas de redondance d'endpoints
- [ ] Pas d'endpoints qui font la même chose
- [ ] Convention JSON cohérente (snake_case ou camelCase documenté)
- [ ] Structure de réponse cohérente entre endpoints

**Anti-patterns à détecter**:
- ❌ Endpoints redondants: `/users`, `/all-users`, `/list-users`
- ❌ Nommage incohérent: `/properties` et `/listings` pour même ressource
- ❌ Mélange snake_case et camelCase entre endpoints
- ❌ Actions custom mal nommées: `/users/search` au lieu de `/users?search=X`

---

## 6. Conventions Pydantic (Backend FastAPI)

**Doc détaillée**: `pydantic-models-and-naming-conventions.md`

**Points à vérifier**:
- [ ] Response models extends BaseAPIModel
- [ ] Pas de `dict` ou `List[dict]` dans responses (typage complet)
- [ ] Nested structures ont leurs propres modèles Pydantic
- [ ] snake_case en Python converti en camelCase pour JSON
- [ ] Validation Pydantic documentée (email, phone, etc.)

**Anti-patterns à détecter**:
- ❌ Response: `data: dict` au lieu de modèle typé
- ❌ Nested dict non typé: `metadata: Dict[str, Any]`
- ❌ Utilisation de BaseModel au lieu de BaseAPIModel

---

## Format du Rapport de Validation

Pour chaque point de la checklist:

### ✅ Point X : [Nom]

**Statut**: Conforme

**Exemples conformes**:
- `/api/users` (pluriel ✓)
- `/api/properties/{id}/photos` (hiérarchie REST ✓)

**Référence**: `01-nommage-urls.md`

---

### ❌ Point X : [Nom]

**Statut**: Non conforme

**Problèmes détectés**:
1. `/api/users/create` (POST) - Verbe dans URL
   → **Correction**: `/api/users` (POST)
   → **Référence**: `01-nommage-urls.md` section "Pas de verbes"

2. `/api/getProperties` (GET) - Verbe + camelCase
   → **Correction**: `/api/properties` (GET)
   → **Référence**: `01-nommage-urls.md` sections "Pas de verbes" + "kebab-case"

---

## Notes Importantes

**Validation systématique**:
- Toujours lire la doc détaillée AVANT de valider le point
- Vérifier TOUS les endpoints du draft (pas juste un échantillon)
- Proposer corrections concrètes (pas juste "à améliorer")
- Citer exemples du draft dans les feedbacks

**Scope de cette checklist**:
- ✅ Validation de DRAFT API (phase design)
- ❌ PAS pour validation production-ready (monitoring, CI/CD, RGPD)

**Docs détaillées disponibles**:
1. `conception-des-urls-et-endpoints.md` - Nommage URLs
2. `methodes-http-et-codes-de-statut.md` - Méthodes HTTP
3. `gestion-des-donnees.md` - Pagination, filtres, tri
4. `securite.md` - Sécurité, auth, CORS
5. `erreurs-courantes-a-eviter.md` - 15 anti-patterns
6. `pydantic-models-and-naming-conventions.md` - Conventions Pydantic
