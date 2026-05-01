---
name: build-entity-frontend
description: >
  Génère les services TypeScript, types, hooks React Query et composants
  spécifiques pour UNE entité. Agent exécutant — suit les specs.
allowed-tools: Read, Write, Edit, Glob, Bash, mcp__origin-ui__search_components, mcp__origin-ui__get_component, mcp__shadcn__search_components, mcp__shadcn__get_component
model: sonnet
---

# Build Entity Frontend

## Objectif

Générer les services, types, hooks et composants frontend pour UNE entité depuis l'API et l'architecture frontend.

## Arguments attendus

- `entity` : Nom de l'entité (ex: "property")
- `api_path` : Chemin vers l'API de l'entité (ex: `docs/architecture/backend/api/property.md`)
- `frontend_arch_path` : Chemin vers frontend-architecture.md
- `frontend_path` : Chemin vers le frontend (ex: `dev/frontend`)

## Process

### 1. Lire les regles et specs

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques frontend (design system Tailwind, theming, erreurs courantes, checklist)
- Conseille : bonnes pratiques API (comprendre les formats de reponse pour les types TypeScript)

**Specs projet** :
1. `{api_path}` — Endpoints REST (methodes, params, responses)
2. `{frontend_arch_path}` — Section de l'entite (pages, composants, endpoints mappes)
3. Si des composants sont marques **Reference** dans l'architecture → lire le code source dans `.claude/resources/templates/projects/{project}/` pour s'en inspirer

### 2. Générer Types (`services/{entity}/types.ts`)

Depuis les Input/Output Pydantic de l'API :

```typescript
export interface {Entity} {
  id: number;
  name: string;
  createdAt: string; // ISO 8601
  ...
}

export interface {Entity}Create {
  name: string;
  ...
}

export interface {Entity}Update {
  name?: string;
  ...
}

export interface {Entity}ListParams {
  page?: number;
  limit?: number;
  sort?: string;
  ...filters
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

**Règle** : camelCase en TypeScript (le backend convertit snake_case → camelCase via Pydantic).

### 3. Générer Service API (`services/{entity}/api.ts`)

```typescript
import { apiFetch } from '@/lib/api';
import type { {Entity}, {Entity}Create, {Entity}Update, {Entity}ListParams, PaginatedResponse } from './types';

const BASE_URL = '/api/{entities}';

export const {entity}Api = {
  list: async (params?: {Entity}ListParams): Promise<PaginatedResponse<{Entity}>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const res = await apiFetch(`${BASE_URL}?${searchParams}`);
    if (!res.ok) throw new Error(`Failed to fetch {entities}`);
    return res.json();
  },

  getById: async (id: number): Promise<{Entity}> => {
    const res = await apiFetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(`{Entity} not found`);
    return res.json();
  },

  create: async (data: {Entity}Create): Promise<{Entity}> => {
    const res = await apiFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create {entity}`);
    return res.json();
  },

  update: async (id: number, data: {Entity}Update): Promise<{Entity}> => {
    const res = await apiFetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update {entity}`);
    return res.json();
  },

  delete: async (id: number): Promise<void> => {
    const res = await apiFetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete {entity}`);
  },
};
```

### 4. Générer Hooks React Query (`hooks/use-{entity}.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {entity}Api } from '@/services/{entity}/api';
import type { {Entity}Create, {Entity}Update, {Entity}ListParams } from '@/services/{entity}/types';

export function use{Entities}(params?: {Entity}ListParams) {
  return useQuery({
    queryKey: ['{entities}', params],
    queryFn: () => {entity}Api.list(params),
  });
}

export function use{Entity}(id: number) {
  return useQuery({
    queryKey: ['{entities}', id],
    queryFn: () => {entity}Api.getById(id),
    enabled: !!id,
  });
}

export function useCreate{Entity}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {Entity}Create) => {entity}Api.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['{entities}'] }),
  });
}

export function useUpdate{Entity}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: {Entity}Update }) => {entity}Api.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['{entities}'] }),
  });
}

export function useDelete{Entity}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {entity}Api.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['{entities}'] }),
  });
}
```

### 5. Installer les composants externes (si listés dans l'architecture)

Depuis `frontend-architecture.md`, identifier les composants classifiés **shadcn**, **Registry**, ou **Origin UI** pour cette entité :

1. **Lire la classification** et la commande d'installation dans l'architecture
2. **Installer** via CLI
3. **Adapter** si nécessaire (renommer, ajuster les props pour l'entité)

```bash
# shadcn officiel
cd {frontend_path} && npx shadcn@latest add {component_name}

# Registry tiers (Dice UI, Magic UI, Animate UI, etc.)
cd {frontend_path} && npx shadcn@latest add @namespace/composant

# Origin UI
cd {frontend_path} && npx shadcn@latest add {origin_ui_component_url}
```

Les composants installés via registries héritent automatiquement du design du projet (couleurs, radius, fonts, dark mode) car ils utilisent les CSS variables locales.

### 6. Générer Composants spécifiques (`components/{entity}/*.tsx`)

Depuis `frontend-architecture.md` section de l'entité, créer les composants **composés** et **nouveaux** listés :

- `{Entity}Card.tsx` — Card composant (si listé)
- `{Entity}Form.tsx` — Formulaire create/edit (React Hook Form + Zod)
- `{Entity}Filters.tsx` — Filtres (si listé)
- Autres composants spécifiques mentionnés dans l'architecture

Utiliser les composants shadcn existants (`ui/*.tsx`) ET les composants Origin UI installés comme building blocks.

#### Regles de styling STRICTES

**Composition pure** : les composants composés assemblent les primitifs shadcn, ils n'inventent PAS de styling.

```tsx
// ✅ Composer les primitifs — zero styling ajouté
<Card>
  <CardHeader><CardTitle>{entity.name}</CardTitle></CardHeader>
  <CardContent><Badge>{entity.status}</Badge></CardContent>
</Card>

// ❌ INTERDIT — styling inventé hors design system
<div className="bg-white rounded-lg p-8 shadow-md">
  <h3 className="text-lg font-bold text-gray-900 mb-2">...</h3>
</div>
```

**Couleurs** : UNIQUEMENT via tokens semantiques (`bg-primary`, `text-foreground`, `bg-card`). JAMAIS de couleurs raw (`bg-blue-500`, `text-black`, `bg-white`, hex).

**Spacing** : UNIQUEMENT `gap-*` pour espacer les enfants. JAMAIS `space-y-*`, `space-x-*`, ou `mb-*` entre sections. Les composants primitifs (Card, Button) gerent deja leur padding interne — ne pas en rajouter.

**Layout via className** : `className` sur un composant shadcn sert UNIQUEMENT au layout (flex, grid, col-span, w-full). JAMAIS au style visuel (couleurs, padding, ombres).

**Dark mode** : automatique via les CSS variables. Ne PAS ajouter de prefixes `dark:` sauf si documenté dans les best practices.

## Output

- `{frontend_path}/src/services/{entity}/types.ts`
- `{frontend_path}/src/services/{entity}/api.ts`
- `{frontend_path}/src/hooks/use-{entity}.ts`
- `{frontend_path}/src/components/{entity}/*.tsx` (composants spécifiques listés dans l'architecture)

## Règles strictes

- NE PAS modifier les fichiers d'une autre entité
- NE PAS modifier les composants `ui/*.tsx`
- NE PAS créer de pages (c'est le job de build-frontend-shell)
- camelCase en TypeScript
- Typage strict — jamais de `any`
- **apiFetch obligatoire** : Tous les services (sauf auth login/register) doivent utiliser `apiFetch` depuis `@/lib/api` au lieu de `fetch` natif. `apiFetch` injecte le Bearer token depuis `localStorage`. Si `lib/api.ts` n'existe pas, le créer avec ce contenu :
  ```typescript
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
    return fetch(`${API_URL}${path}`, { ...options, headers });
  }
  ```
- **Cookie + localStorage pour auth** : L'entité `auth` (login) doit setter le token dans DEUX endroits après un login réussi : `localStorage.setItem('access_token', token)` ET `document.cookie = 'access_token=' + token + '; path=/'`. Ceci car le middleware Next.js (server-side) lit les cookies tandis que les services API lisent localStorage.
- **Ne pas utiliser `z.coerce`** avec `react-hook-form` — `z.coerce.number()` infère le type input comme `unknown`, conflit avec `zodResolver`. Utiliser `z.number()` + conversion manuelle dans `onChange`.
