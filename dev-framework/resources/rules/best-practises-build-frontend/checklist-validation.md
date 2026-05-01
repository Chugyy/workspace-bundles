## Checklist de Validation Frontend

### ✅ Design System

#### Couleurs
- [ ] Variables définies dans `:root` ET `.dark`
- [ ] Syntaxe `oklch()` valide (lightness 0-1, chroma 0-0.4)
- [ ] Contraste ≥ 4.5:1 (texte normal) vérifié avec WebAIM
- [ ] Contraste ≥ 3:1 (texte large, UI)
- [ ] Palette cohérente (même hue pour nuances)
- [ ] Toutes les couleurs sémantiques définies (primary, secondary, destructive, muted, accent, background, foreground, card, border, input, ring)

#### Radius
- [ ] Valeur de base `--radius` définie
- [ ] Variations calculées avec `calc()` (sm, md, lg, xl, pill)
- [ ] Mappé dans `@theme inline`

#### Typographie
- [ ] Polices chargées avec `next/font`
- [ ] Variables CSS définies (`--font-sans`, `--font-heading`, `--font-handwritten`)
- [ ] Poids utilisés spécifiés (éviter de charger tous les poids)
- [ ] Subsets appropriés (ex: `latin`)
- [ ] Classes appliquées au `<body>`

### ✅ Theming Dark/Light

- [ ] `ThemeProvider` configuré dans layout
- [ ] `suppressHydrationWarning` sur `<html>`
- [ ] ThemeToggle fonctionnel
- [ ] Tous les composants visibles en light mode
- [ ] Tous les composants visibles en dark mode
- [ ] Pas de flash de contenu au chargement
- [ ] Mode system fonctionne (suit l'OS)

### ✅ Layout et Structure

#### Responsive
- [ ] Mobile first (breakpoints sm, md, lg, xl)
- [ ] Padding adaptatif (`px-4 md:px-6 lg:px-8`)
- [ ] Pas de débordement horizontal (`max-w-[100vw]`)
- [ ] Grilles/Flex responsive
- [ ] Images responsive (`w-full h-auto`)

#### Navigation
- [ ] Header sticky fonctionnel
- [ ] Logo cliquable (retour accueil)
- [ ] Navigation accessible au clavier
- [ ] Active link highlights

#### Scroll
- [ ] Overflow gérés (`overflow-y-auto`)
- [ ] Scroll smooth si applicable
- [ ] Sticky elements avec bon z-index
- [ ] Pas de scroll horizontal non désiré

### ✅ Composants UI

#### Boutons
- [ ] États hover/focus/active définis
- [ ] Disabled state visible
- [ ] Loading state avec spinner
- [ ] Taille appropriée (touch targets ≥ 44px mobile)
- [ ] Variants cohérents (default, outline, ghost, destructive)

#### Forms
- [ ] Labels associés aux inputs
- [ ] Validation Zod configurée
- [ ] Messages d'erreur affichés
- [ ] États disabled pendant soumission
- [ ] Focus visible
- [ ] Autocomplete approprié

#### Cards
- [ ] Border radius appliqué
- [ ] Hover effects cohérents
- [ ] Padding interne cohérent
- [ ] Shadow appropriée

#### Modals/Dialogs
- [ ] Fermeture ESC fonctionnelle
- [ ] Fermeture click outside
- [ ] Focus trap actif
- [ ] Scroll body bloqué quand ouvert
- [ ] Animations smooth

### ✅ State Management

#### React Query
- [ ] Query keys bien structurées (hiérarchiques)
- [ ] `enabled` sur queries conditionnelles
- [ ] `staleTime` et `cacheTime` configurés
- [ ] Invalidation après mutations
- [ ] Optimistic updates si nécessaire
- [ ] Gestion erreurs avec `onError`
- [ ] Loading states affichés

#### Context API
- [ ] Providers au bon niveau
- [ ] Pas de re-renders inutiles
- [ ] État local vs global bien séparé

### ✅ Interactions

#### Drag and Drop
- [ ] `setNodeRef` sur éléments draggables
- [ ] IDs uniques
- [ ] Sensors configurés (distance activation)
- [ ] DragOverlay pour preview
- [ ] Feedback visuel (isOver, isDragging)
- [ ] Accessibilité clavier si applicable
- [ ] Update API après drop

#### Clicks et Hovers
- [ ] Cursors appropriés (pointer, grab, etc.)
- [ ] Transitions smooth
- [ ] Pas de conflits onClick/drag

### ✅ Performance

- [ ] Pas de re-renders inutiles (React DevTools Profiler)
- [ ] Images optimisées (next/image)
- [ ] Lazy loading si applicable
- [ ] Code splitting (dynamic imports)
- [ ] Polices self-hosted (next/font)
- [ ] CSS minifié en production
- [ ] Bundle size raisonnable

### ✅ Accessibilité (a11y)

- [ ] Tous les textes alternatifs présents
- [ ] Labels sur tous les inputs
- [ ] Navigation clavier fonctionnelle (Tab, Enter, Esc)
- [ ] Focus visible (ring)
- [ ] Contraste suffisant (WCAG AA)
- [ ] Screen reader friendly (sr-only classes)
- [ ] ARIA labels si nécessaire
- [ ] Pas de problèmes Lighthouse Accessibility

### ✅ TypeScript

- [ ] Pas de `any`
- [ ] Types importés depuis services
- [ ] Props interfaces définies
- [ ] Pas d'erreurs TS
- [ ] Strict mode activé

### ✅ Erreurs et Edge Cases

- [ ] Loading states gérés
- [ ] Error states avec retry
- [ ] Empty states informatifs
- [ ] 404 page
- [ ] Network errors gérées
- [ ] Toast notifications pour feedback

### ✅ Build et Déploiement

- [ ] `npm run build` réussit sans warnings
- [ ] Pas d'erreurs console en production
- [ ] Variables d'environnement correctes
- [ ] Pas de logs sensibles
- [ ] Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices, SEO)

### ✅ Documentation

- [ ] Composants documentés (JSDoc si complexe)
- [ ] README à jour
- [ ] ARCHITECTURE.md reflète l'état actuel
- [ ] Changelog si applicable

### 🔍 Tests manuels

#### Desktop
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

#### Mobile
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive DevTools

#### Modes
- [ ] Light mode
- [ ] Dark mode
- [ ] System mode

#### Tailles d'écran
- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px)
- [ ] Large (1920px)

***
