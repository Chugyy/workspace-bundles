# Custom Components — Matcher le Design System

## Problème rencontré

Lors de la création d'un `SearchableSelect` (Popover + Command searchable), le composant avait un style visuellement différent des `Select` natifs shadcn :
- Couleur de texte différente (placeholder muted vs texte normal)
- Hauteur différente (`h-9` vs `h-10`)
- Background du dropdown différent (`bg-popover` vs `bg-[color:var(--card-bg-input)]`)
- Border du dropdown différente
- Pas de `backdrop-blur-md`

## Cause racine

Le projet utilise un design system custom avec des CSS variables (`--card-bg-input`, `--card-border-alt`, etc.) définies dans `globals.css`. Les composants shadcn natifs (`SelectTrigger`, `SelectContent`) référencent ces variables. Mais les composants génériques shadcn (`Popover`, `Command`) utilisent les variables par défaut (`bg-popover`, `border`) qui ont des valeurs différentes.

Créer un composant custom qui "copie" les classes ne suffit pas car :
1. Les attributs `data-*` de Radix (`data-slot`, `data-size`, `data-placeholder`) activent des styles conditionnels
2. Les CSS variables du projet (`--card-bg-input`) diffèrent des variables shadcn par défaut (`--popover`)
3. La spécificité Tailwind v4 avec `data-[size=default]:h-10` override un simple `h-9`

## Solution

### Trigger — Reproduire le DOM exact du SelectTrigger

```tsx
<button
  data-slot="select-trigger"    // Active les styles globals ciblant ce slot
  data-size="default"           // Active data-[size=default]:h-10
  role="combobox"
  className={cn(
    // COPIER la string de classes EXACTE depuis select.tsx SelectTrigger
    "border-[color:var(--card-border-alt)] bg-[color:var(--card-bg-input)] ...",
    className,
  )}
>
```

Points critiques :
- `data-slot="select-trigger"` — les styles dans `globals.css` peuvent cibler ce sélecteur
- `data-size="default"` — doit matcher le `data-size` des autres Select sur la page
- NE PAS mettre `data-placeholder` si le texte affiché est un placeholder par défaut (sinon la couleur sera `text-muted-foreground` alors que les Select natifs affichent leur valeur par défaut en couleur normale)

### Dropdown — Override les styles du Popover et du Command

```tsx
<PopoverContent
  className="bg-[color:var(--card-bg-input)] backdrop-blur-md border-[color:var(--card-border-alt)] rounded-lg p-0"
>
  <Command className="bg-transparent">
    ...
    <CommandItem className="rounded-lg">
```

Points critiques :
- `PopoverContent` : override `bg-popover` par `bg-[color:var(--card-bg-input)]` + ajouter `backdrop-blur-md`
- `Command` : mettre `bg-transparent` pour ne pas superposer un 2e background
- `CommandItem` : ajouter `rounded-lg` pour matcher les `SelectItem`
- Border du popover : `border-[color:var(--card-border-alt)]` au lieu du border par défaut

## Règle générale

Quand on crée un composant custom qui doit visuellement matcher un composant shadcn existant :

1. **Inspecter le DOM** du composant natif (via DevTools ou Playwright) pour identifier les attributs `data-*` et les classes exactes
2. **Identifier les CSS variables** utilisées (pas les variables shadcn par défaut, mais celles du projet dans `globals.css`)
3. **Reproduire les mêmes attributs `data-*`** sur l'élément custom pour que les styles conditionnels s'appliquent
4. **Override les containers parents** (Popover, Command, Dialog) qui ont leur propre background/border par défaut
5. **Vérifier visuellement** avec Playwright screenshot côte à côte

Ne jamais supposer que "les mêmes classes = le même rendu". Les attributs `data-*`, la spécificité CSS, et les variables custom peuvent créer des différences invisibles dans le code mais visibles à l'écran.
