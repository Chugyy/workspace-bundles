## Gestion des Couleurs et Thème Dark/Light

### Architecture du theming

Le projet utilise `next-themes` pour gérer le basculement entre modes clair et sombre, combiné avec des CSS variables pour les couleurs.

### Configuration next-themes

**src/app/layout.tsx** :
```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### Stratégie de couleurs

#### Principe : Blanc/Noir cassé

Au lieu de blanc pur (#FFFFFF) et noir pur (#000000), utiliser des teintes légèrement colorées :

**Light Mode** :
```css
:root {
  --background: oklch(0.98 0.01 235);  /* Blanc cassé bleuté */
  --foreground: oklch(0.20 0.02 235);  /* Noir cassé bleuté */
}
```

**Dark Mode** :
```css
.dark {
  --background: oklch(0.15 0.02 235);  /* Noir cassé bleuté */
  --foreground: oklch(0.95 0.01 235);  /* Blanc cassé bleuté */
}
```

#### Avantages du blanc/noir cassé

1. **Moins de fatigue oculaire** : Contraste plus doux
2. **Look premium** : Plus raffiné que le blanc/noir pur
3. **Cohérence chromatique** : Légère teinte bleue unifiée
4. **Meilleure lisibilité** : Particulièrement en dark mode

### Palette de couleurs complète

```css
:root {
  /* Couleur principale - Bleu ciel */
  --primary: oklch(0.65 0.15 235);
  --primary-foreground: oklch(0.99 0 0);

  /* Couleur secondaire */
  --secondary: oklch(0.92 0.02 235);

  /* Surfaces */
  --background: oklch(0.98 0.01 235);
  --foreground: oklch(0.20 0.02 235);
  --card: oklch(0.99 0.005 235);
  --card-foreground: oklch(0.20 0.02 235);

  /* États */
  --muted: oklch(0.95 0.01 235);
  --muted-foreground: oklch(0.50 0.02 235);
  --accent: oklch(0.90 0.03 235);
  --accent-foreground: oklch(0.20 0.02 235);

  /* Bordures et inputs */
  --border: oklch(0.88 0.02 235);
  --input: oklch(0.88 0.02 235);
  --ring: oklch(0.65 0.15 235);

  /* Destructive */
  --destructive: oklch(0.58 0.25 27);
}
```

### Règles de contraste

#### WCAG AA minimum (4.5:1 pour texte normal)

**Vérifier le contraste** :
```css
/* ✅ Bon contraste */
background: oklch(0.98 0.01 235);  /* Très clair */
foreground: oklch(0.20 0.02 235);  /* Très foncé */
/* Ratio ≈ 14:1 */

/* ❌ Mauvais contraste */
background: oklch(0.95 0.01 235);
foreground: oklch(0.90 0.01 235);
/* Ratio ≈ 1.5:1 - illisible */
```

#### Adaptation en dark mode

En dark mode, **inverser les lightness** mais **augmenter légèrement la primary** pour compenser :

```css
.dark {
  /* Primary plus clair en dark pour meilleure visibilité */
  --primary: oklch(0.70 0.15 235);  /* 0.65 → 0.70 */

  /* Background/foreground inversés */
  --background: oklch(0.15 0.02 235);  /* 0.98 → 0.15 */
  --foreground: oklch(0.95 0.01 235);  /* 0.20 → 0.95 */
}
```

### Gestion des cartes en dark mode

Les cards doivent être **légèrement plus claires** que le background pour se démarquer :

```css
.dark {
  --background: oklch(0.15 0.02 235);
  --card: oklch(0.18 0.02 235);  /* +0.03 lightness */
}
```

### Composant ThemeToggle

**src/components/layout/ThemeToggle.tsx** :
```tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### Prévenir le flash de contenu

**Problème** : Le thème ne s'applique qu'après hydration → flash blanc

**Solution** : `next-themes` injecte un script avant le rendu :

```tsx
<html suppressHydrationWarning>
  {/* next-themes injecte automatiquement le script */}
</html>
```

### Testing checklist

Avant de valider les modifications de couleurs :

- [ ] Vérifier tous les composants en **light mode**
- [ ] Vérifier tous les composants en **dark mode**
- [ ] Tester le **toggle** entre les deux modes
- [ ] Vérifier le **contraste** avec un outil (ex: WebAIM)
- [ ] Tester avec le mode **system** (auto dark/light selon l'OS)
- [ ] Vérifier les **hover states** et **focus rings**
- [ ] Valider les **badges** et **status colors**

### Erreurs courantes

#### ❌ Oublier de redéfinir une couleur en dark mode

```css
:root {
  --card: oklch(0.99 0.005 235);
}

.dark {
  /* ❌ --card manquant, reste blanc en dark mode */
}
```

#### ❌ Contraste insuffisant

```css
.dark {
  --background: oklch(0.15 0.02 235);
  --muted-foreground: oklch(0.25 0.02 235);
  /* ❌ Ratio trop faible, texte illisible */
}
```

#### ❌ Utiliser des couleurs codées en dur dans les composants

```tsx
// ❌ Ne s'adapte pas au thème
<div className="bg-white text-black">

// ✅ Utilise les variables de thème
<div className="bg-background text-foreground">
```

### Ressources

- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

***
