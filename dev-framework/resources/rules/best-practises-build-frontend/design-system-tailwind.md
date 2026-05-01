## Design System avec Tailwind CSS v4

### Vue d'ensemble

Tailwind CSS v4 introduit une nouvelle approche pour définir les design tokens directement en CSS via la directive `@theme`. Cette approche remplace la configuration JavaScript traditionnelle et offre une meilleure intégration avec les CSS variables.

### Architecture recommandée

#### 1. Définition des tokens dans globals.css

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Border radius */
  --radius: 0.75rem;  /* 12px - valeur de base */

  /* Colors - Light Mode */
  --primary: oklch(0.65 0.15 235);
  --primary-foreground: oklch(0.99 0 0);
  --background: oklch(0.98 0.01 235);
  --foreground: oklch(0.20 0.02 235);
  /* ... autres couleurs */
}

.dark {
  /* Colors - Dark Mode */
  --primary: oklch(0.70 0.15 235);
  --background: oklch(0.15 0.02 235);
  --foreground: oklch(0.95 0.01 235);
  /* ... autres couleurs */
}

@theme inline {
  /* Mapping des tokens pour Tailwind */
  --color-primary: var(--primary);
  --color-background: var(--background);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  /* ... autres mappings */
}
```

### Principes clés

#### ✅ À faire

1. **Définir les tokens dans :root et .dark**
   - Toujours définir les mêmes variables dans les deux scopes
   - Utiliser la notation `oklch()` pour les couleurs (meilleur contrôle perceptuel)

2. **Mapper les tokens dans @theme inline**
   - Préfixer avec le type : `--color-*`, `--radius-*`, `--font-*`
   - Utiliser `var()` pour référencer les tokens :root

3. **Tester systématiquement les deux modes**
   - Vérifier le contraste en light ET dark mode
   - S'assurer que tous les composants restent visibles

4. **Utiliser calc() pour les variations**
   ```css
   --radius-sm: calc(var(--radius) - 4px);
   --radius-lg: calc(var(--radius) + 4px);
   ```

#### ❌ À éviter

1. **Ne jamais modifier directement @theme sans :root**
   - Les variables @theme doivent pointer vers :root, pas contenir de valeurs en dur

2. **Éviter les valeurs oklch() invalides**
   ```css
   /* ❌ Invalide - lightness > 1 */
   --background: oklch(1.5 0.1 200);

   /* ✅ Valide - lightness entre 0 et 1 */
   --background: oklch(0.98 0.01 200);
   ```

3. **Ne pas oublier de définir les variables en dark mode**
   ```css
   /* ❌ Problème - card manquant en dark */
   .dark {
     --background: oklch(0.15 0.02 235);
     /* --card manquant ! */
   }

   /* ✅ Complet */
   .dark {
     --background: oklch(0.15 0.02 235);
     --card: oklch(0.18 0.02 235);
   }
   ```

### Format couleur oklch()

**Syntaxe** : `oklch(lightness chroma hue [/ alpha])`

- **lightness** : 0 à 1 (0 = noir, 1 = blanc)
- **chroma** : 0 à 0.4 (intensité de la couleur)
- **hue** : 0 à 360 (teinte en degrés)
- **alpha** : 0 à 1 (optionnel, transparence)

**Exemples** :
```css
--primary: oklch(0.65 0.15 235);     /* Bleu ciel */
--success: oklch(0.60 0.20 145);     /* Vert */
--warning: oklch(0.75 0.18 85);      /* Jaune */
--error: oklch(0.58 0.25 27);        /* Rouge */
--neutral: oklch(0.50 0 0);          /* Gris */
```

### Avantages de oklch() vs hsl()

1. **Perception uniforme** : Même lightness = même luminosité perçue
2. **Gamut étendu** : Plus de couleurs accessibles
3. **Interpolation naturelle** : Dégradés plus harmonieux
4. **Contraste prévisible** : Meilleur pour l'accessibilité

### Organisation des tokens

```css
:root {
  /* 1. Tokens de base (spacing, radius, etc.) */
  --radius: 0.75rem;
  --height-sm: 2rem;

  /* 2. Couleurs sémantiques */
  --primary: oklch(...);
  --secondary: oklch(...);
  --destructive: oklch(...);

  /* 3. Couleurs de surface */
  --background: oklch(...);
  --foreground: oklch(...);
  --card: oklch(...);
  --border: oklch(...);

  /* 4. Couleurs d'état */
  --muted: oklch(...);
  --accent: oklch(...);
  --ring: oklch(...);
}
```

### Intégration avec shadcn/ui

Les composants shadcn/ui utilisent automatiquement les CSS variables définies. Pas besoin de modification supplémentaire :

```tsx
// Le composant Button utilise automatiquement les nouvelles couleurs
<Button variant="default">Click me</Button>
// bg-primary, text-primary-foreground appliqués via les classes Tailwind
```

### Ressources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/blog/tailwindcss-v4)
- [oklch Color Picker](https://oklch.com/)
- [Understanding oklch](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)

***
