# {Project Name} — Product Requirements Document

**Scope** : {full-stack / standalone}
**Mode** : {compact / split}

## 1. Goals & Background

### Contexte
{2-3 phrases : qu'est-ce qu'on construit, pourquoi}

### Objectifs
- {Objectif 1 avec metrique}
- {Objectif 2 avec metrique}

### Entites metier identifiees
- **{Entity1}** : {description courte}
- **{Entity2}** : {description courte}

---

## 2. Functional Requirements

### {Domaine / Entite}

**FR1** — {Titre du requirement}
- {Description detaillee}
- Validation : {critere testable}
- Entite : {entite metier}
- Priorite : {Must-have / Should-have / Nice-to-have}

**FR2** — {Titre avec flow conditionnel}
1. {Etape 1}
2. **SI** {condition} :
   a. {Etape si vrai}
   b. {Suite}
3. **SINON** :
   a. {Etape alternative}
→ Resultat : {outcome}

---

## 3. User Stories

### {Role 1}

▸ Quand un {role} {action} :
  1. {Etape 1}
  2. {Etape 2}
  3. **SI** {condition} :
     a. {Branche A}
  4. **SINON** :
     a. {Branche B}
  → Resultat visible : {ce que l'utilisateur voit}

---

## 4. UI Tree

```
App
├── /route
│   ├── Section
│   │   ├── [SI condition] Element conditionnel
│   │   └── Element
│   ├── Action → Modale/Navigation
│   └── Resultat
```

---

## 5. Non-Functional Requirements

**NFR1** — Performance
- {Critere mesurable}

**NFR2** — Securite
- {Critere}
