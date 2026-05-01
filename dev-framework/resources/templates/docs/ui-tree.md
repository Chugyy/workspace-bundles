# {Project Name} — UI Tree

> Document genere en mode split. Voir `prd.md` pour le contexte global.
> Chaque element interactif indique ce qu'il declenche. Assez detaille pour qu'un developpeur construise chaque page.

## Layout global

```
App
├── Header
│   ├── Logo → /
│   ├── Navigation principale
│   │   ├── {Item 1} → /{route}
│   │   └── {Item 2} → /{route}
│   └── [SI connecte] Avatar + menu profil
│       ├── Mon profil → /profile
│       └── Deconnexion
├── [SI role=admin] Sidebar
│   ├── {Section 1}
│   └── {Section 2}
├── Content (voir pages ci-dessous)
└── Footer
```

## Pages

### /{route} — {Nom de la page}

**Acces** : {Public / Connecte / Role specifique}
**FR associes** : {FR1, FR2}

```
/{route}
├── {Section 1}
│   ├── {Element} (description du contenu)
│   ├── [SI condition] {Element conditionnel}
│   │   └── {Detail}
│   └── [SINON] {Element alternatif}
├── {Section 2}
│   ├── {Element avec action}
│   │   └── Action → Modale "{Nom}"
│   │       ├── Champ : {nom} ({type}, {contraintes})
│   │       ├── Champ : {nom} ({type})
│   │       ├── Bouton "Annuler" → fermer
│   │       └── Bouton "Confirmer" → {effet} → redirect /{route}
│   └── {Liste / Tableau}
│       ├── Colonnes : {col1}, {col2}, {col3}
│       ├── Tri par : {colonne par defaut}
│       ├── Filtres : {filtre1}, {filtre2}
│       └── Pagination : {X} elements par page
```

### /{route2} — {Autre page}

...
