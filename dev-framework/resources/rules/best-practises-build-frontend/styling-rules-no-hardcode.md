## Regles de Styling — Zero Hardcode

### Principe fondamental

Chaque decision visuelle remonte aux tokens. Aucun composant ne doit inventer de valeur de couleur, spacing, ou radius. La chaine de confiance est :

```
CSS Variables (:root) → @theme inline (Tailwind) → Composants ui/ (CVA) → Composants composes → Pages
```

Chaque couche herite de la precedente. Personne n'invente de valeur.

### Regles strictes

#### Couleurs

| Interdit | Correct | Pourquoi |
|----------|---------|----------|
| `bg-blue-500`, `bg-white`, `text-black` | `bg-primary`, `bg-background`, `text-foreground` | Casse le theming et le dark mode |
| `dark:bg-gray-950` | (rien) | Les tokens semantiques gerent le dark mode automatiquement |
| `hover:bg-[#383838]` | `hover:bg-primary/90` | Les hex hardcodes ne suivent pas la palette |
| `border-black/[.08]` | `border-border` | Utiliser le token de bordure |

#### Spacing

| Interdit | Correct | Pourquoi |
|----------|---------|----------|
| `p-8`, `py-32`, `px-16` | `p-page`, `p-card`, `gap-section` | Utiliser les tokens de spacing mappes dans @theme |
| `space-y-4`, `space-x-2` | `flex flex-col gap-component` | `gap-*` fonctionne avec RTL et evite les margin-collapse |
| `mb-4`, `mt-6` entre sections | `gap-section` sur le parent | Le parent gere l'espacement, pas les enfants |
| Padding inline sur un wrapper de Card | (rien) | Le composant `Card` gere deja son padding interne (`px-6 py-6`) |

#### Layout

| Interdit | Correct | Pourquoi |
|----------|---------|----------|
| `<div className="p-6"><h1>Title</h1>...</div>` | `<PageContainer><PageHeader>...` | Utiliser les composants layout qui encapsulent le spacing |
| `z-50` sur Dialog/Popover | (rien) | Les composants shadcn gerent le stacking en interne |
| `w-[350px]`, `h-[600px]` | Laisser le contenu definir la taille | Eviter les dimensions fixes sauf contraintes explicites |

### Composants composes — regles de composition

Quand on cree un composant compose (ex: `PropertyCard`), il **compose** les primitifs shadcn sans ajouter de styling :

```tsx
// ✅ Composition pure — zero styling ajoute
function PropertyCard({ property }: { property: Property }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{property.name}</CardTitle>
        <CardDescription>{property.address}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge>{property.status}</Badge>
      </CardContent>
    </Card>
  )
}

// ❌ Styling invente — padding, couleurs, ombres hors design system
function PropertyCard({ property }: { property: Property }) {
  return (
    <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-2">{property.name}</h3>
      <p className="text-gray-500 mb-4">{property.address}</p>
      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{property.status}</span>
    </div>
  )
}
```

### Quand on a le droit d'ajouter du styling

1. **Layout flex/grid** sur le parent : `flex flex-col`, `grid grid-cols-2`, `items-center`, `justify-between`
2. **Gap entre enfants** : `gap-component`, `gap-2`, `gap-4` (via les tokens)
3. **Responsive** : `md:grid-cols-3`, `lg:hidden` (breakpoints)
4. **Variantes via CVA** : si le composant a plusieurs modes d'affichage, definir des variants

### Tokens de spacing disponibles

Definis dans `globals.css` et mappes dans `@theme inline` :

| Token CSS | Classe Tailwind | Valeur | Usage |
|-----------|----------------|--------|-------|
| `--page-padding` | `p-page` | 1.5rem (24px) | Padding du contenu principal |
| `--section-gap` | `gap-section` | 1.5rem (24px) | Espace entre sections d'une page |
| `--component-gap` | `gap-component` | 1rem (16px) | Espace entre composants dans une section |
| `--card-padding` | `p-card` | 1.5rem (24px) | Padding interne des cards (gere par Card) |

### className sur les composants shadcn — quand c'est OK

Le `cn()` + `className` servent **uniquement au layout** (position, flex, grid, gap), jamais au style visuel :

```tsx
// ✅ className pour le layout
<Card className="col-span-2">
<Button className="w-full">
<Badge className="ml-auto">

// ❌ className pour le style visuel
<Card className="bg-blue-50 shadow-xl p-10">
<Button className="bg-green-600 text-white rounded-full">
```

### Checklist agent

Avant de generer un composant, l'agent verifie :
- [ ] Aucune couleur raw (pas de `bg-*-500`, pas de hex, pas de `text-black`)
- [ ] Aucun padding invente (le composant parent gere ou les tokens sont utilises)
- [ ] `gap-*` partout, jamais `space-*` ou `mb-*` entre sections
- [ ] Composants shadcn utilises comme building blocks, pas recrees
- [ ] Dark mode automatique via tokens (pas de `dark:` sauf cas specifique documente)

***
