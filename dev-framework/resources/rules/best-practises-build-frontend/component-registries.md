## Registries de Composants shadcn

### Principe

shadcn/ui dispose d'un systeme de registries : des librairies tierces qui distribuent des composants installables via CLI. Ces composants :
- Atterrissent dans `components/ui/` ou `components/blocks/`
- Importent les primitifs locaux (`Button`, `Card`, etc.)
- Utilisent les CSS variables du projet (`bg-primary`, `text-foreground`)
- Heritent automatiquement du preset/theme actif (couleurs, radius, fonts)
- Fonctionnent en dark mode sans modification

### Installation

```bash
npx shadcn@latest add @namespace/composant
```

### Ordre de recherche OBLIGATOIRE

Avant de creer un composant, chercher dans cet ordre :

1. **shadcn/ui officiel** (`@shadcn-ui`) — composants de base + blocks
2. **Registries recommandes** (voir tableau ci-dessous) — composants composes, animations, patterns
3. **Compose manuellement** — assembler des primitifs shadcn locaux
4. **Custom** — creer from scratch (dernier recours uniquement)

### Criteres de validation d'un registry

Avant d'utiliser un composant d'un registry tiers, verifier :

- [ ] Utilise **Radix UI** comme primitifs (pas Base UI) — sinon incompatible avec les presets shadcn
- [ ] Compatible **React 19** et **Next.js App Router**
- [ ] Utilise les **CSS variables semantiques** (pas de couleurs hardcodees)
- [ ] TypeScript strict (pas de `any`)
- [ ] Maintenu activement (derniere mise a jour < 3 mois)

### Registries recommandes

#### Composants composes (usage general)

| Registry | Namespace | Composants | Usage |
|----------|-----------|-----------|-------|
| shadcn/ui | `@shadcn-ui` | 405 | Base : Button, Card, Dialog, Table, + blocks (dashboard, auth, sidebar) |
| Dice UI | `@sadmann7` | 242 | Avances : file upload, combobox, tags input, multi-select, date range |
| Kibo UI | `@shadcnblocks` | 41 | Data-heavy : tables complexes, filtres avances, dashboards internes |
| Shadcn Blocks | `@shadcnblocks` | 2640 | Pages entieres : login, pricing, dashboard, landing, settings |

#### Animations et interactions

| Registry | Namespace | Composants | Usage |
|----------|-----------|-----------|-------|
| Magic UI | `@magicuidesign` | 231 | Landing pages : shimmer buttons, animated borders, marquee, meteors |
| Animate UI | `@imskyleen` | 580 | Composants animes : reveal, fade, scale, slide, stagger |
| Motion Primitives | `@ibelick` | — | Primitifs motion : parallax, scroll-triggered, magnetic |
| SmoothUI | `@educlopez` | 107 | Sections marketing : hero, pricing, testimonials avec GSAP |

#### Cas specifiques

| Registry | Namespace | Usage |
|----------|-----------|-------|
| Plate | `@udecode` | Editeur rich text AI-powered (315 composants) |
| assistant-ui | `@assistant-ui` | Chat IA style ChatGPT (messages, conversations, streaming) |
| AI Elements | `@vercel` | Composants pour apps IA (conversations, code blocks) |
| Clerk | `@clerk` | Auth complete (login, signup, user profile, organisations) |
| Supabase UI | `@supabase` | Composants connectes a Supabase |
| pqoqubbw/icons | `@pqoqubbw` | 405 icones animees (basees sur Lucide) |
| Shadcn Form Builder | — | Formulaires generes depuis un schema |

### A eviter

| Registry | Pourquoi |
|----------|----------|
| COSS UI (`@cosscom`) | Utilise Base UI au lieu de Radix → ecrase les composants et change de primitifs |
| Tout registry sans CSS variables | Ne s'adapte pas au theme du projet |
| Registries non TypeScript | Incompatible avec le typage strict |

### Utilisation dans le workflow build

L'agent `build-entity-frontend` doit :
1. Lire la classification du composant dans `frontend-architecture.md`
2. Si le composant est marque **shadcn** ou **Registry** → installer via CLI
3. Si marque **Origin UI** → installer via CLI ou copier depuis le MCP
4. Si marque **Compose** → assembler les primitifs locaux (zero styling ajoute)
5. Si marque **Custom** → creer (justifier pourquoi rien d'existant ne convient)

L'agent `frontend-architect` doit :
1. Chercher dans shadcn officiel et les registries recommandes AVANT de classifier un composant comme "Compose" ou "Custom"
2. Mentionner le namespace et la commande d'installation dans l'architecture

***
