## Boutons Relief 3D et Warm Shadows

### Vue d'ensemble

Les boutons utilisent un effet de relief 3D subtil (gradient + ombres multicouches + inset lumineux) qui donne de la profondeur sans tomber dans le skeuomorphisme. Combiné avec des warm shadows teintées, cela crée une interface tactile et premium.

### Architecture des ombres

#### 1. Variable `--shadow-color` (teinte des ombres)

Les ombres ne sont jamais grises neutres — elles sont teintees selon la palette du projet :

```css
:root {
  /* Teinte chaude pour les ombres (hsl sans fonction) */
  --shadow-color: 40 15% 20%;
}
.dark {
  --shadow-color: 40 20% 10%;
}
```

#### 2. Echelle de warm shadows

Quatre niveaux d'ombre pour les surfaces (cards, popovers, etc.) :

```css
:root {
  --shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.04);
  --shadow-sm: 0 1px 3px hsl(var(--shadow-color) / 0.08), 0 1px 2px hsl(var(--shadow-color) / 0.04);
  --shadow-md: 0 4px 6px hsl(var(--shadow-color) / 0.08), 0 2px 4px hsl(var(--shadow-color) / 0.04);
  --shadow-lg: 0 10px 15px hsl(var(--shadow-color) / 0.08), 0 4px 6px hsl(var(--shadow-color) / 0.04);
  --shadow-glow: 0 0 20px oklch(0.75 0.17 55 / 0.25); /* accent glow */
}
```

Classes utilitaires correspondantes :

```css
.shadow-warm-xs { box-shadow: var(--shadow-xs); }
.shadow-warm-sm { box-shadow: var(--shadow-sm); }
.shadow-warm-md { box-shadow: var(--shadow-md); }
.shadow-warm-lg { box-shadow: var(--shadow-lg); }
.shadow-glow { box-shadow: var(--shadow-glow); }
```

#### 3. Ombres relief pour boutons (3D)

Trois etats : repos, hover, active. Chaque etat utilise une combinaison de :
- **Ombre externe multicouche** (profondeur)
- **Inset blanc** en haut (reflet lumineux = effet 3D)
- **Border-bottom** subtile (separation avec la surface)

```css
:root {
  --shadow-relief: 0 1px 3px hsl(var(--shadow-color) / 0.10),
                   0 4px 8px hsl(var(--shadow-color) / 0.06),
                   inset 0 1px 0 rgba(255,255,255,0.12);
  --shadow-relief-hover: 0 2px 4px hsl(var(--shadow-color) / 0.12),
                         0 6px 12px hsl(var(--shadow-color) / 0.08),
                         inset 0 1px 0 rgba(255,255,255,0.18);
  --shadow-relief-active: 0 1px 1px hsl(var(--shadow-color) / 0.10),
                          inset 0 1px 2px hsl(var(--shadow-color) / 0.08);
}

.dark {
  /* Ombres plus prononcees en dark pour rester visibles */
  --shadow-relief: 0 1px 3px hsl(var(--shadow-color) / 0.20),
                   0 4px 8px hsl(var(--shadow-color) / 0.12),
                   inset 0 1px 0 rgba(255,255,255,0.08);
  --shadow-relief-hover: 0 2px 4px hsl(var(--shadow-color) / 0.25),
                         0 6px 12px hsl(var(--shadow-color) / 0.15),
                         inset 0 1px 0 rgba(255,255,255,0.12);
  --shadow-relief-active: 0 1px 1px hsl(var(--shadow-color) / 0.20),
                          inset 0 1px 2px hsl(var(--shadow-color) / 0.15);
}
```

### Classes CSS

#### `.btn-relief` — Bouton primaire (gradient + 3D)

```css
.btn-relief {
  background: linear-gradient(180deg, var(--primary-light) 0%, var(--primary-dark) 100%);
  box-shadow: var(--shadow-relief);
  border-bottom: 1px solid oklch(0 0 0 / 0.08);
}
.btn-relief:hover {
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: var(--shadow-relief-hover);
}
.btn-relief:active {
  background: linear-gradient(180deg, var(--primary-dark) 0%, var(--primary-dark) 100%);
  box-shadow: var(--shadow-relief-active);
}
```

Necessite les variables de couleur primaire en 3 nuances :

```css
:root {
  --primary: oklch(0.75 0.17 55);
  --primary-light: oklch(0.80 0.16 55);  /* +0.05 lightness */
  --primary-dark: oklch(0.68 0.18 55);   /* -0.07 lightness */
}
```

#### `.btn-relief-neutral` — Boutons secondaires (outline, ghost, sidebar items)

Meme principe de relief mais sans gradient, avec des ombres plus legeres :

```css
.btn-relief-neutral {
  box-shadow: 0 1px 2px hsl(var(--shadow-color) / 0.06),
              inset 0 1px 0 rgba(255,255,255,0.5);
  border-bottom: 1px solid oklch(0 0 0 / 0.05);
}
.btn-relief-neutral:hover {
  box-shadow: 0 1px 3px hsl(var(--shadow-color) / 0.08),
              0 3px 6px hsl(var(--shadow-color) / 0.04),
              inset 0 1px 0 rgba(255,255,255,0.6);
}
.btn-relief-neutral:active {
  box-shadow: inset 0 1px 2px hsl(var(--shadow-color) / 0.06);
}

/* Dark mode — inset blanc reduit, ombres renforcees */
.dark .btn-relief-neutral {
  box-shadow: 0 1px 2px hsl(var(--shadow-color) / 0.15),
              inset 0 1px 0 rgba(255,255,255,0.04);
  border-bottom: 1px solid oklch(0 0 0 / 0.12);
}
.dark .btn-relief-neutral:hover {
  box-shadow: 0 1px 3px hsl(var(--shadow-color) / 0.20),
              0 3px 6px hsl(var(--shadow-color) / 0.10),
              inset 0 1px 0 rgba(255,255,255,0.06);
}
.dark .btn-relief-neutral:active {
  box-shadow: inset 0 1px 2px hsl(var(--shadow-color) / 0.15);
}
```

### Integration avec le composant Button (shadcn/ui + CVA)

Le composant Button utilise ces classes dans ses variants :

```tsx
const buttonVariants = cva(
  "... transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] ...",
  {
    variants: {
      variant: {
        default: "btn-relief text-primary-foreground",
        outline: "btn-relief-neutral border bg-background hover:bg-accent ...",
        secondary: "btn-relief-neutral bg-secondary text-secondary-foreground ...",
        ghost: "btn-relief-neutral hover:bg-accent ...",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
    },
  }
)
```

Points cles :
- `transition-[transform,box-shadow]` — animer seulement ces deux proprietes (pas `all`)
- `cubic-bezier(0.34,1.56,0.64,1)` — easing spring pour le rebond
- `active:scale-[0.97]` — micro-scale au clic pour l'effet "presse"
- `link` n'a pas de relief (pas de box-shadow sur un lien)

### Principes de design

#### Pourquoi l'inset blanc en haut ?
Simule la lumiere venant du haut. Le cerveau interprete ca comme une surface en relief, meme si c'est plat. En dark mode, reduire l'opacite du blanc (0.5 → 0.04) pour eviter un eclat artificiel.

#### Pourquoi des ombres teintees ?
Les ombres grises neutres paraissent "sales" sur des palettes chaudes. Teinter les ombres avec `--shadow-color` les integre visuellement a la palette.

#### Pourquoi 3 nuances de primary ?
Le gradient `primary-light → primary-dark` donne l'illusion de volume. Sans ces 3 nuances, le bouton parait plat meme avec les ombres.

### A faire / A eviter

#### A faire
- Definir `--shadow-color` en hsl sans fonction (ex: `40 15% 20%`) pour pouvoir composer avec `hsl(var(...) / alpha)`
- Definir `--shadow-relief` dans `:root` ET `.dark` avec des opacites differentes
- Utiliser `btn-relief` uniquement sur le variant `default` (primaire)
- Utiliser `btn-relief-neutral` sur outline, secondary, ghost, et les items de sidebar
- Animer `transform` et `box-shadow` ensemble pour un feedback complet

#### A eviter
- Ne pas mettre `btn-relief` sur tous les boutons (hierarchie visuelle perdue)
- Ne pas utiliser `transition: all` (performance + effets de bord sur les couleurs)
- Ne pas oublier l'etat `active` (sans lui, le clic parait "mort")
- Ne pas hardcoder les valeurs de shadow dans les composants (toujours via variables)

### Utilisation sur les cards

Les warm shadows s'appliquent aussi aux surfaces :

```tsx
<Card className="shadow-warm-sm hover:shadow-warm-md transition-shadow duration-300">
  ...
</Card>
```

***
