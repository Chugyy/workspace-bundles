---
name: prd
description: >
  Brainstorming conversationnel + PRD adaptatif. 1 checkpoint brainstorming,
  1 checkpoint PRD. Detecte scope (standalone/full-stack) et complexite
  (compact/split) pour adapter le format de sortie.
allowed-tools: Read, Write
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif (ex: `./tests-note/docs/prd.md`). Le dossier projet est communique par l'utilisateur ou le workflow parent.

# De l'idee au PRD

2 checkpoints humains. Le reste est silencieux.

---

## CHECKPOINT 1 — Brainstorming conversationnel

**Objectif** : Comprendre l'intention de l'utilisateur en profondeur via une conversation crescendo.

### Approche

Conversation naturelle, pas un formulaire. Monter crescendo :

**Niveau 1 — Vision** (questions ouvertes)
- "C'est quoi le projet en une phrase ?"
- "C'est pour qui ?"
- "Quel probleme ca resout ?"

**Niveau 2 — Cadrage** (questions de plus en plus precises)
- "Qu'est-ce qui existe deja comme solution ?"
- "C'est quoi le truc que ton app fait que personne d'autre fait ?"
- "Si tu devais montrer UNE seule fonctionnalite a quelqu'un, ce serait laquelle ?"

**Niveau 3 — Limites** (challenge)
- "Qu'est-ce qui est absolument PAS dans le MVP ?"
- "Quelles contraintes techniques ? (budget, temps, stack imposee)"
- "Il y a des utilisateurs avec des roles differents ?"

**Niveau 4 — Details critiques** (precision)
- Questions specifiques au domaine detecte
- Challenge les incoherences ("tu dis X mais ca implique Y, tu confirmes ?")
- Approfondir les features mentionnees en passant

### Techniques appliquees silencieusement

Le LLM utilise SCAMPER, 5 Whys, First Principles en interne pour structurer sa comprehension. Il ne les mentionne PAS a l'utilisateur.

### Detection de scope et complexite

Pendant le brainstorming, le LLM identifie silencieusement :

**Scope :**

| Scope | Description | Exemple |
|-------|-------------|---------|
| `full-stack` | App complete (backend + frontend + DB, ou sous-ensemble) | App web, API seule, dashboard |
| `standalone` | Pas d'app — scripts, prompts, docs, outils | Serie de prompts, CLI tool, automation |

**Complexite (si full-stack) :**

| Mode | Condition | Format de sortie |
|------|-----------|-----------------|
| `compact` | Peu de complexite : ≤ 3 entites, pas de roles multiples, peu de services externes | Un seul `prd.md` complet |
| `split` | Complexite significative : 4+ entites, OU roles multiples, OU 2+ services externes, OU flows conditionnels | `prd.md` + `requirements.md` + `user-stories.md` + `ui-tree.md` |

C'est un jugement contextuel, pas un seuil rigide. Un projet avec 3 entites mais des workflows complexes avec conditions peut justifier un split.

### Validation

Quand le LLM estime avoir assez de matiere :
- Presenter un **resume structure** en langage humain :
  - "Ton projet c'est {resume}. Il permet a {users} de {action principale}."
  - "Le MVP inclut : {liste courte}"
  - "Ce qu'on garde pour plus tard : {liste courte}"
  - **"Scope : {scope}, Mode : {compact/split}"**
- L'utilisateur valide ou ajuste
- Passer au CHECKPOINT 2

---

## CHECKPOINT 2 — PRD

**Objectif** : Generer le(s) document(s) et presenter un overview non-technique.

### Mode standalone

Generer `docs/prd.md` avec :
- Vision et contexte
- Livrables attendus (fichiers/outputs avec description)
- Contraintes
- `docs/for-later.md`

### Mode compact (full-stack, faible complexite)

Generer un seul `docs/prd.md` contenant TOUT :

**Template** : `.claude/resources/templates/docs/prd.md`

Sections :
1. **Goals & Background** — Contexte, objectifs, entites metier, scope
2. **Functional Requirements** — FR avec flows conditionnels si necessaire (voir syntaxe ci-dessous)
3. **User Stories** — Parcours par role avec branches
4. **UI Tree** — Arborescence de l'interface (si frontend)
5. **Non-Functional Requirements** — Performance, securite

+ `docs/for-later.md`

### Mode split (full-stack, complexite significative)

Generer 4 documents + for-later :

**`docs/prd.md`** — Document cadre (leger)
- Goals & Background
- Entites metier identifiees
- Scope et mode detectes
- Non-Functional Requirements
- Pointe vers les autres documents

**`docs/requirements.md`** — Functional Requirements detailles
- FR groupes par entite
- Flows conditionnels (syntaxe SI/SINON)
- Priorites (Must-have / Should-have / Nice-to-have)

**`docs/user-stories.md`** — Parcours utilisateur
- Organises par role
- Ordre chronologique reel
- Branches conditionnelles

**`docs/ui-tree.md`** — Arbre UI (si frontend)
- Arborescence des pages et composants
- Etats conditionnels (premium vs free, connecte vs anonyme)
- Actions et navigations

**`docs/for-later.md`** — Post-MVP

### Syntaxe des flows conditionnels

Dans les FR et user stories, utiliser cette syntaxe pour les branches :

```markdown
**FR3** — Reservation d'un logement

1. Verifier les disponibilites
2. Calculer le prix total
3. **SI** le client a un abonnement premium :
   a. Appliquer la reduction abonne
   b. Utiliser le moyen de paiement enregistre
4. **SINON** :
   a. Rediriger vers le formulaire de paiement
   b. Attendre la confirmation du paiement
5. **SI** le paiement est confirme :
   a. Bloquer les dates
   b. Notifier le proprietaire
   c. Envoyer la confirmation au client
6. **SINON** :
   a. Enregistrer l'echec
   b. Notifier le client de l'echec
→ Resultat : reservation confirmee OU echec avec notification
```

Meme syntaxe pour les user stories :

```markdown
▸ Quand un client reserve un logement :
  1. Il choisit les dates et le logement
  2. Il voit le prix total calcule
  3. SI il est abonne premium :
     a. Le prix reduit s'affiche
     b. Il confirme en un clic (paiement enregistre)
  4. SINON :
     a. Il remplit le formulaire de paiement
     b. Il attend la confirmation Stripe
  5. Il recoit un email de confirmation
  → Resultat visible : page "Mes reservations" avec la nouvelle reservation
```

Et pour l'UI tree, les etats conditionnels :

```
App
├── /bookings
│   ├── Liste des reservations
│   │   ├── [SI role=client] Mes reservations uniquement
│   │   └── [SI role=owner] Reservations de mes logements
│   ├── Bouton "Reserver" → /bookings/new
│   └── Filtre par statut (confirmee, en attente, annulee)
├── /bookings/new
│   ├── Formulaire dates + logement
│   ├── Resume prix
│   │   ├── [SI premium] Prix reduit + badge "Abonne"
│   │   └── [SI standard] Prix normal
│   ├── [SI premium] Bouton "Confirmer" (paiement auto)
│   └── [SI standard] Formulaire paiement Stripe
```

### Presentation a l'utilisateur (non-technique)

**Ne PAS presenter le(s) doc(s) brut(s).** Presenter un overview adapte :

**Si full-stack (avec frontend) :**
> "Ton app permet a {users} de {actions principales}."
>
> **Ce qu'elle fait (MVP) :**
> - {Feature 1} — {description en 1 ligne}
>
> **Les roles :**
> - {Role 1} : peut {actions resumees}
>
> **Les pages principales :**
> - {Page 1} : {ce qu'on y fait}
>
> **Ce qu'on garde pour plus tard :**
> - {Item 1}, {Item 2}, ...

**Si full-stack (sans frontend — API seule) :**
> "Ton API permet a {consumers} de {actions principales}."
>
> **Endpoints principaux :**
> - {Endpoint 1} — {ce qu'il fait}

**Si standalone :**
> "Ce projet produit {livrables}."
>
> **Livrables :**
> - {Livrable 1} — {description}

Puis : "Le PRD est dans `docs/`. On continue ?"

**L'utilisateur** : "OK" ou feedbacks, puis ajuster et ecrire les documents.

---

## Fin du workflow — Next Step adaptatif

| Scope | Next Step | Raison |
|-------|-----------|--------|
| `full-stack` | `/jobs` | Cartographie des entites, jobs et services |
| `standalone` | Execution directe | Pas besoin d'architecture — l'agent principal code le livrable |

```
Livrables (selon le mode) :

Mode compact :
- docs/prd.md (tout dedans)
- docs/for-later.md

Mode split :
- docs/prd.md (document cadre)
- docs/requirements.md (FR avec flows conditionnels)
- docs/user-stories.md (parcours par role)
- docs/ui-tree.md (arbre UI si frontend)
- docs/for-later.md

Mode standalone :
- docs/prd.md (minimal)
- docs/for-later.md
```
