# Frontend Architecture — {Project Name}

Date: {YYYY-MM-DD}
Stack: {framework + UI lib + CSS + form lib + validation}

---

## Layout Global

### Structure

```
RootLayout
├── AuthLayout    → {routes publiques}
├── OnboardingLayout → {routes onboarding}
└── AppLayout     → {routes app}
    ├── Header
    ├── Sidebar / BottomNav (mobile)
    └── <children>
```

### Navigation Items

| Item | Route | Icone |
|------|-------|-------|
| {Item} | {/route} | {IconName} |

### Responsive
- **Desktop (≥ 768px)** : {layout desktop}
- **Mobile (< 768px)** : {layout mobile}

---

## Pages

### {N}. {PageName} — `{/route}`

**Description** : {1 phrase}
**Roles** : {Public / Authentifie / Authentifie + onboarde}

#### Structure

```
{PageName}
├── {Component} [{type}: {decomposition}]
│   └── Endpoints: {METHOD} {/api/path}
└── {Component}
```

#### Etats UI
- Loading : {comportement}
- Error : {comportement}
- Empty : {comportement}
- Success : {comportement}

---

## Composants

### Existants ({UI lib})
| Composant | Utilise dans |
|-----------|-------------|
| `{Component}` | {pages} |

### Composes (assemblages)
| Composant | Decomposition |
|-----------|--------------|
| `{Component}` | {composants combines} |

### Nouveaux (a creer)
| Composant | Notes |
|-----------|-------|
| `{Component}` | {description + justification} |

---

## Endpoints utilises

| Endpoint | Methode | Page | Trigger |
|----------|---------|------|---------|
| `{/api/path}` | {METHOD} | {PageName} | {action utilisateur} |
