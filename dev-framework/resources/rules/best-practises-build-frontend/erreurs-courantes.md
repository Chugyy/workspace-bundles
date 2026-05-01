## Erreurs Courantes à Éviter

### 1. CSS et Styling

#### ❌ Modifier globals.css sans tester dark mode
```css
/* ❌ Oublier de redéfinir en .dark */
:root {
  --card: oklch(0.99 0.005 235);
}
/* .dark manquant → cards blanches en dark mode */
```

**Solution** : Toujours définir les variables dans `:root` ET `.dark`

#### ❌ Valeurs oklch() invalides
```css
/* ❌ Lightness > 1 */
--background: oklch(1.5 0.1 200);

/* ✅ Lightness entre 0 et 1 */
--background: oklch(0.98 0.01 235);
```

#### ❌ Contraste insuffisant
```css
/* ❌ Ratio < 4.5:1 - illisible */
--background: oklch(0.95 0.01 235);
--foreground: oklch(0.90 0.01 235);
```

**Solution** : Vérifier avec WebAIM Contrast Checker

#### ❌ Couleurs codées en dur
```tsx
// ❌ Ne s'adapte pas au thème
<div className="bg-white text-black">

// ✅ Utilise les CSS variables
<div className="bg-background text-foreground">
```

### 2. Polices

#### ❌ Oublier d'ajouter la variable au body
```tsx
// ❌ Police non disponible
<body>
  {children}
</body>

// ✅ Ajouter la classe variable
<body className={outfit.variable}>
  {children}
</body>
```

#### ❌ Charger trop de poids de police
```tsx
// ❌ Trop lourd (9 fichiers)
weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"]

// ✅ Seulement ce qui est utilisé
weight: ["400", "600", "700"]
```

#### ❌ Mauvaise syntaxe Tailwind v4
```tsx
// ❌ Syntaxe v3
<span className="font-caveat">

// ✅ Syntaxe v4
<span className="font-[family-name:var(--font-caveat)]">
```

### 3. Hover et Touch Devices

#### ❌ Utiliser opacity-0 group-hover:opacity-100 pour cacher des actions
```tsx
// ❌ Invisible sur mobile (pas de hover)
<button className="opacity-0 group-hover:opacity-100">
  <Trash2 />
</button>
```

**Solution** : Utiliser une classe globale `hover-action` definie avec `@media (hover: hover)`. Les elements sont visibles par defaut (mobile), et caches au hover uniquement sur desktop.

```css
/* globals.css */
@media (hover: hover) {
  .hover-action { opacity: 0; transition: opacity 150ms; }
  .group:hover .hover-action,
  [data-hovered="true"] .hover-action { opacity: 1; }
}
```

```tsx
// ✅ Visible sur mobile, hover sur desktop
<button className="hover-action">
  <Trash2 />
</button>
```

Ne JAMAIS utiliser `opacity-0 group-hover:opacity-100` directement dans les composants. Toujours passer par `hover-action`.

### 4. Layout et Responsive

#### ❌ Utiliser container sans max-width
```tsx
// ❌ Peut déborder sur petits écrans
<div className="container py-8">

// ✅ Limiter la largeur
<div className="w-full px-4 md:px-6 lg:px-8 py-8 max-w-[100vw]">
```

#### ❌ Oublier le z-index sur éléments flottants
```tsx
// ❌ Bouton sous le contenu
<Button className="fixed bottom-8 right-8">

// ✅ Au-dessus du contenu
<Button className="fixed bottom-8 right-8 z-[100]">
```

#### ❌ Scroll overflow caché
```css
/* ❌ Pas de scroll visible */
overflow: hidden;

/* ✅ Avec scroll si nécessaire */
overflow-y: auto;
```

### 4. State Management

#### ❌ Ne pas invalider le cache après mutation
```tsx
// ❌ Les données ne se rafraîchissent pas
const updateContent = useMutation({
  mutationFn: updateContentApi,
});

// ✅ Invalider pour refetch
const updateContent = useMutation({
  mutationFn: updateContentApi,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
  },
});
```

#### ❌ Oublier le enabled sur useQuery
```tsx
// ❌ Requête lancée même si contentId est null
useQuery({
  queryKey: ['content', contentId],
  queryFn: () => getContent(contentId),
});

// ✅ Requête conditionnelle
useQuery({
  queryKey: ['content', contentId],
  queryFn: () => getContent(contentId),
  enabled: !!contentId,
});
```

### 5. Drag and Drop

#### ❌ Oublier setNodeRef
```tsx
// ❌ Ne fonctionne pas
const { attributes, listeners } = useDraggable({ id: '1' });
return <div {...listeners} {...attributes}>Card</div>;

// ✅ Avec ref
const { setNodeRef, attributes, listeners } = useDraggable({ id: '1' });
return <div ref={setNodeRef} {...listeners} {...attributes}>Card</div>;
```

#### ❌ IDs non uniques
```tsx
// ❌ Conflits
{items.map(() => <DraggableCard id="1" />)}

// ✅ IDs uniques
{items.map((item) => <DraggableCard id={item.id.toString()} />)}
```

### 6. Next.js

#### ❌ Oublier 'use client'
```tsx
// ❌ Erreur : useState ne fonctionne pas
import { useState } from 'react';

export default function Page() {
  const [count, setCount] = useState(0);
}

// ✅ Directive client
'use client';

import { useState } from 'react';
```

#### ❌ Accès à window en SSR
```tsx
// ❌ Erreur SSR
const theme = localStorage.getItem('theme');

// ✅ Vérifier l'environnement
const theme = typeof window !== 'undefined'
  ? localStorage.getItem('theme')
  : null;
```

### 7. Performance

#### ❌ Re-renders inutiles
```tsx
// ❌ Nouvelle fonction à chaque render
<Button onClick={() => handleClick(id)}>

// ✅ Memoize avec useCallback
const handleClickMemo = useCallback(() => handleClick(id), [id]);
<Button onClick={handleClickMemo}>
```

#### ❌ Requêtes non optimisées
```tsx
// ❌ Refetch à chaque focus
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});

// ✅ Désactiver si non nécessaire
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
});
```

### 8. Formulaires

#### ❌ Pas de validation
```tsx
// ❌ Données invalides soumises
<form onSubmit={handleSubmit}>
  <input name="email" />
</form>

// ✅ Validation avec Zod
const schema = z.object({
  email: z.string().email(),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

#### ❌ États de chargement manquants
```tsx
// ❌ Pas de feedback utilisateur
<Button type="submit">Submit</Button>

// ✅ Désactiver pendant soumission
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
</Button>
```

### 9. Accessibilité

#### ❌ Manque de labels
```tsx
// ❌ Pas accessible
<input type="text" />

// ✅ Avec label
<label htmlFor="name">Name</label>
<input id="name" type="text" />
```

#### ❌ Texte alternatif manquant
```tsx
// ❌
<img src="/logo.png" />

// ✅
<img src="/logo.png" alt="Autom-Goodz AI Logo" />
```

### 10. TypeScript

#### ❌ any partout
```tsx
// ❌ Perd tous les bénéfices de TS
const data: any = await fetchData();

// ✅ Type correct
const data: Content[] = await fetchData();
```

#### ❌ Non-null assertion dangereuse
```tsx
// ❌ Peut crasher
const user = users.find(u => u.id === id)!;

// ✅ Vérification
const user = users.find(u => u.id === id);
if (!user) return;
```

### Checklist avant commit

- [ ] Tester en **light ET dark mode**
- [ ] Vérifier **responsive** (mobile, tablet, desktop)
- [ ] Valider **accessibilité** (labels, alt, contraste)
- [ ] Pas d'erreurs **TypeScript**
- [ ] Pas d'erreurs **console**
- [ ] **Performance** : pas de re-renders inutiles
- [ ] **Tests** : unitaires passent
- [ ] **Build** : `npm run build` réussit

***
