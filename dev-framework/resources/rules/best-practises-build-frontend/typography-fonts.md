## Typographie et Polices Custom

### Stratégie typographique

Le projet utilise deux polices complémentaires :
- **Outfit** : Police principale (géométrique, moderne, alternative à Futura)
- **Caveat** : Police manuscrite pour le logo et titres accent

### Configuration avec next/font

**src/app/layout.tsx** :
```tsx
import { Outfit, Caveat } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${caveat.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

### Mapping dans globals.css

```css
@theme inline {
  --font-sans: var(--font-outfit);
  --font-heading: var(--font-outfit);
  --font-handwritten: var(--font-caveat);
}
```

### Utilisation dans les composants

#### Police par défaut (Outfit)

```tsx
// Appliquée automatiquement via body
<p className="text-base">Texte standard</p>
```

#### Police manuscrite (Caveat)

```tsx
// Logo
<span className="font-[family-name:var(--font-caveat)]">
  Autom-Goodz AI
</span>

// Titre accent
<h1 className="text-4xl font-bold font-[family-name:var(--font-caveat)]">
  Dashboard
</h1>
```

### Hiérarchie typographique

```tsx
// Titres
<h1 className="text-4xl font-bold">Heading 1</h1>
<h2 className="text-3xl font-semibold">Heading 2</h2>
<h3 className="text-2xl font-semibold">Heading 3</h3>
<h4 className="text-xl font-medium">Heading 4</h4>

// Corps de texte
<p className="text-base">Texte normal</p>
<p className="text-sm">Texte petit</p>
<p className="text-xs">Texte très petit</p>

// Accents
<span className="text-muted-foreground">Texte muted</span>
<span className="font-semibold">Texte important</span>
```

### Polices locales (Futura, etc.)

Si vous avez besoin d'une police non disponible sur Google Fonts :

**1. Placer les fichiers dans /public/fonts** :
```
public/
  fonts/
    futura-regular.woff2
    futura-bold.woff2
```

**2. Configurer next/font/local** :
```tsx
import localFont from 'next/font/local';

const futura = localFont({
  src: [
    {
      path: '../public/fonts/futura-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/futura-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-futura',
});
```

**3. Appliquer dans layout** :
```tsx
<body className={futura.variable}>
```

### Alternatives à Futura (Google Fonts)

Si vous ne pouvez pas utiliser Futura (licence payante), voici les meilleures alternatives gratuites :

1. **Outfit** ⭐ (utilisé dans le projet)
   - Géométrique, moderne
   - Variable font (tous les poids)
   - Excellent rendu web

2. **Raleway**
   - Élégant, épuré
   - Proche de Futura

3. **Montserrat**
   - Très populaire
   - Géométrique sans empattement

4. **Jost**
   - Clone quasi-identique de Futura
   - Open source

### Polices manuscrites alternatives

1. **Caveat** ⭐ (utilisé dans le projet)
   - Style naturel, décontracté
   - Bonne lisibilité

2. **Dancing Script**
   - Plus formel, élégant
   - Cursive fluide

3. **Pacifico**
   - Fun, arrondi
   - Rétro années 50

4. **Indie Flower**
   - Handwriting authentique
   - Aspect dessiné à la main

### Optimisation des performances

#### ✅ Bonnes pratiques

1. **Limiter les poids de police** :
   ```tsx
   // ❌ Trop de poids
   weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"]

   // ✅ Seulement les poids utilisés
   weight: ["300", "400", "600", "700"]
   ```

2. **Utiliser les variable fonts** quand disponible :
   ```tsx
   // Outfit est une variable font, pas besoin de spécifier les poids
   const outfit = Outfit({
     variable: "--font-outfit",
     subsets: ["latin"],
   });
   ```

3. **Précharger les polices critiques** :
   ```tsx
   // next/font fait cela automatiquement
   ```

4. **Subsets appropriés** :
   ```tsx
   // ✅ Seulement latin pour un site FR/EN
   subsets: ["latin"]

   // ❌ Inutile si pas de contenu cyrillique
   subsets: ["latin", "cyrillic"]
   ```

#### Avantages de next/font

- **Self-hosting automatique** : Téléchargement au build
- **Zéro requête externe** : Pas de dépendance Google Fonts
- **Optimisation automatique** : font-display: swap
- **Aucun flash de texte** : Preload intelligent

### Accessibilité

```css
/* Taille de police minimale : 16px */
body {
  font-size: 1rem; /* 16px */
}

/* Line-height confortable */
p {
  line-height: 1.6;
}

/* Contraste suffisant */
color: var(--foreground); /* Contraste ≥ 4.5:1 */
```

### Erreurs courantes

#### ❌ Police non chargée

```tsx
// ❌ Oublier d'ajouter la variable au body
<body>  {/* --font-outfit non disponible */}

// ✅ Ajouter la classe variable
<body className={outfit.variable}>
```

#### ❌ Mauvaise syntaxe Tailwind v4

```tsx
// ❌ Syntaxe v3 ne fonctionne plus
<span className="font-caveat">

// ✅ Syntaxe v4 avec CSS variable
<span className="font-[family-name:var(--font-caveat)]">
```

#### ❌ Trop de polices

```tsx
// ❌ 5 polices différentes = lenteur
import { Outfit, Caveat, Roboto, Open_Sans, Lato } from "next/font/google";

// ✅ Maximum 2-3 polices
import { Outfit, Caveat } from "next/font/google";
```

### Testing checklist

- [ ] Les polices se chargent correctement (vérifier DevTools Network)
- [ ] Pas de FOUT (Flash Of Unstyled Text)
- [ ] Rendu correct sur différents navigateurs
- [ ] Poids de police utilisés sont bien chargés
- [ ] Fallback fonts définis pour offline

### Ressources

- [next/font Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Google Fonts](https://fonts.google.com/)
- [Variable Fonts Guide](https://web.dev/variable-fonts/)

***
