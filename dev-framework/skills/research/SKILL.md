---
name: research
description: >
  Recherche technique de services externes. Deux modes :
  (A) Decouverte — explorer les options pour un besoin, comparer, choisir.
  (B) Cible — documenter un service precis pour l'integration.
  Verifie la librairie partagee, recherche, demande credentials, cree le .env.
  Source unique : .claude/resources/researches/
allowed-tools: Read, Write, WebSearch, WebFetch, Glob, Grep, Bash
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif. Les recherches sont dans `.claude/resources/researches/`.

# Recherche des services externes

Source unique de verite pour les recherches : `.claude/resources/researches/`. Pas de copie dans le projet.

---

## Etape 0 — Routing

### Si invoque depuis le workflow (fr-mapping existe)

1. Lire `docs/prd.md` — Si absent, STOP → `/prd`
2. Lire `docs/architecture/fr-mapping.md` — Si absent, STOP → `/jobs`
3. Identifier les services externes depuis le fr-mapping (type = Service, categorie = API externe)
4. **Si aucun service externe identifie** : SKIP vers l'architecture.
5. Pour chaque service, determiner le mode :
   - Service **nomme explicitement** dans le fr-mapping (ex: "Stripe", "Twilio") → **Mode Cible**
   - Besoin **generique** sans service nomme (ex: "envoi de SMS", "paiement en ligne") → **Mode Decouverte**

### Si invoque directement par l'utilisateur

Presenter clairement les deux options :

```
Deux types de recherche disponibles :

A) Decouverte — "J'ai un besoin (ex: envoyer des SMS) mais je ne sais pas
   quel service utiliser." Je recherche les options, je compare, tu choisis,
   puis je documente le service retenu en detail.

B) Cible — "Je sais quel service je veux (ex: Twilio)."
   Je documente directement comment il fonctionne et comment l'integrer.

Tu veux faire quoi ?
```

**Si le message de l'utilisateur indique deja implicitement un mode** (ex: "recherche Twilio" → Cible, "j'ai besoin d'envoyer des emails" → Decouverte), **ne pas poser la question et avancer directement**.

---

## Mode A — Decouverte

### A.1 Cadrage du besoin

Clarifier avec l'utilisateur si necessaire :
- Quel est le besoin exact ?
- Contraintes ? (budget, volume, region, stack)
- Preferences ? (open source, SaaS, self-hosted)

Si le besoin est clair d'emblee, ne pas poser de questions inutiles.

### A.2 Recherche exploratoire

1. **WebSearch** `best {besoin} python api/sdk {annee}`, `{besoin} comparison`, `{besoin} alternatives`
2. **WebFetch** pages de comparatif, articles recents, pages pricing
3. Identifier **3 a 5 candidats** pertinents

### A.3 Tableau comparatif

Presenter a l'utilisateur :

```
| Critere | {Service A} | {Service B} | {Service C} |
|---------|-------------|-------------|-------------|
| SDK Python | oui/non + package | ... | ... |
| Auth | API key / OAuth | ... | ... |
| Pricing | gratuit / freemium / paye | ... | ... |
| Free tier | X req/mois | ... | ... |
| Rate limits | X req/min | ... | ... |
| Facilite d'integration | simple/moyen/complexe | ... | ... |
| Points forts | ... | ... | ... |
| Points faibles | ... | ... | ... |

Ma recommandation : {Service X} parce que {raison}.
Tu veux partir sur lequel ?
```

### A.4 Checkpoint utilisateur

- L'utilisateur choisit → passer en **Mode Cible** sur le service retenu
- L'utilisateur hesite → approfondir les points de doute, puis reproposer
- L'utilisateur veut un autre service non liste → rechercher et ajouter au comparatif

---

## Mode B — Cible

### B.1 Verifier la librairie

Pour chaque service, verifier si `.claude/resources/researches/{service}.md` existe.

| Service | Dans la librairie ? | Action |
|---------|-------------------|--------|
| {service} | OUI | Relire, verifier si a jour |
| {service} | NON | Recherche necessaire |

**Si le service est deja dans la librairie ET a jour** : presenter un resume a l'utilisateur et passer aux credentials.

### B.2 Recherche web

1. **WebSearch** `{service} python sdk documentation`
2. **WebFetch** pages cles (quickstart, API reference, pricing)
3. Extraire : SDK + version, auth, endpoints, formats I/O, limites, couts, exemples de code

**IMPORTANT — Pas de vrais credentials dans les recherches** : les fichiers `.claude/resources/researches/*.md` sont versionnes dans git. Ne JAMAIS y mettre de vrais tokens, cles API, webhooks ou secrets. Utiliser des placeholders (`<SLACK_WEBHOOK_URL>`, `{API_KEY}`, `YOUR_TOKEN_HERE`).

### B.3 Ecrire dans la librairie

Creer ou mettre a jour `.claude/resources/researches/{service}.md` :

```markdown
# {Service Name} — Research

## Resume
{Ce que fait le service, en 2-3 phrases}

## Integration
- **SDK/Librairie** : {package Python, version}
- **Auth** : {type d'auth — API key, OAuth, etc.}
- **Base URL** : {URL de l'API}

## Endpoints utiles

### {endpoint_name}
- **Methode** : {GET/POST/...}
- **URL** : {path}
- **Input** :
  ```json
  {exemple request body}
  ```
- **Output** :
  ```json
  {exemple response body}
  ```
- **Erreurs** : {codes d'erreur et signification}

## Limites & Couts
- **Rate limits** : {X req/min}
- **Cout** : {pricing pertinent}

## Patterns recommandes
- {best practices d'integration}
- {gestion d'erreurs, retries, idempotence}

## Exemples de code
```python
# snippet d'appel reel issu de la doc ou SDK
```

## Variables d'environnement necessaires
| Variable | Description |
|----------|-------------|
| `{VAR_NAME}` | {description} |
```

---

## Phase finale — Credentials & .env

S'applique apres le Mode A (service choisi) ou le Mode B (service documente).

### Demander les credentials

Presenter la liste de TOUS les services (librairie + nouvellement recherches) avec les credentials necessaires :

```
Pour builder et tester les services, j'ai besoin de tes cles API :

| Service | Variable | Statut |
|---------|----------|--------|
| {service} | {VAR_NAME} | EN ATTENTE |

Tu peux me les donner maintenant ?
```

**Des que l'utilisateur fournit les credentials** → creer le .env.

**Si l'utilisateur ne peut pas fournir certaines cles** → marquer comme STUB. Le build stubera ces services.

### Creer le .env

Ecrire `{project}/docs/.env` avec les credentials fournis :

```env
# === {Service Name} ===
{VAR_NAME}={valeur fournie}

# === Services stubes (credentials manquants) ===
# {VAR_NAME}=  # EN ATTENTE
```

Ce fichier sera copie dans `dev/backend/.env` par le build (Phase 0 setup).

---

## Fin du workflow

```
Livrables :
  .claude/resources/researches/{service}.md  — Recherches (source unique)
  docs/.env                       — Credentials pour le build

Next Step : architecture (/jobs, /schema, etc.)
```
