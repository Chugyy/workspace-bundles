# Reference Projects — Component & Pattern Catalog

5 projets de reference contenant des composants, patterns et architectures reutilisables.
Stack commune : Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui + TanStack Query 5 + React Hook Form + Zod + Lucide.

---

## 1. chat-interface

**Sujet** : Interface chat GPT-like avec gestion de workspaces, profils et fichiers.
**Source** : Agent Claude Code personnel (full-stack).
**Backend** : FastAPI + asyncpg + WebSocket SSE streaming.

### Patterns frontend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **Chat messages** | `frontend/src/components/chat/` | Bubbles user/assistant, markdown rendering (react-markdown + remark-gfm), auto-scroll |
| **Tool blocks** | `frontend/src/components/chat/tool-block.tsx` | Blocs collapsibles color-coded par type d'outil (Bash, Read, Write, etc.) avec status dot |
| **Chat input** | `frontend/src/components/chat/input.tsx` | Textarea auto-height, file attachments, voice input (MediaRecorder), model selector |
| **SSE streaming** | `frontend/src/services/sessions/hooks.ts` | EventSource → injection dans le cache React Query en temps reel |
| **File explorer** | `frontend/src/components/explorer/` | Tree recursif, Monaco editor, context menu, cross-workspace move |
| **Sidebar navigation** | `frontend/src/components/sidebar/sidebar.tsx` | Hierarchie folders/workspaces avec drag-drop, search, tri |
| **Workspace selector** | `frontend/src/components/workspace/selector.tsx` | Combobox (cmdk) avec creation inline |
| **Voice input** | `frontend/src/components/chat/input.tsx` | MediaRecorder → transcription API → texte |

### Patterns backend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **SSE endpoint** | `backend/app/api/routes/sessions.py` | Server-Sent Events pour streaming des reponses agent |
| **File operations** | `backend/app/api/routes/workspaces.py` | CRUD fichiers/dossiers avec profils applicables |
| **Transcription** | `backend/app/api/routes/transcription.py` | Audio → texte via Whisper |

### Service layer (pattern commun)
`frontend/src/services/{entity}/` : `service.ts` (API calls) + `hooks.ts` (React Query) + `types.ts` (interfaces)

---

## 2. form-onboarding

**Sujet** : Formulaire d'onboarding multi-etapes (6 steps) avec scoring et dashboard admin.
**Source** : Client Killian Monteur (coaching montage video).
**Backend** : FastAPI + asyncpg.

### Patterns frontend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **Multi-step form** | `frontend/src/components/onboarding/onboarding-form.tsx` | Orchestrateur : stepper, navigation, validation per-step, state central via hook |
| **Step components** | `frontend/src/components/onboarding/steps/` | 6 etapes : RadioQuestion, Slider, Checkbox array, Text input |
| **Stepper UI** | `frontend/src/components/ui/stepper.tsx` | Indicateur de progression multi-etapes (completed/active/pending) |
| **Score results** | `frontend/src/components/onboarding/score-result.tsx` | Affichage score /100, badge route, progress bars par bloc, axes prioritaires |
| **Form hook** | `frontend/src/hooks/use-onboarding-form.ts` | State central : step courant, answers, validation errors, scoring, navigation |
| **Scoring logic** | `frontend/src/lib/scoring.ts` | Calcul client-side : 4 blocs → total → route (Constructeur/Stabilisateur/Performant) |
| **Admin stats** | `frontend/src/app/admin/_components/stats-panel.tsx` | Moyennes, distribution routes, breakdown par question |
| **Admin table** | `frontend/src/app/admin/_components/submissions-table.tsx` | Table soumissions avec scores et badges |

### Patterns backend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **Form submission** | `backend/app/api/routes/` | POST soumission + GET stats/submissions admin |
| **JWT admin auth** | `backend/app/` | Auth simple par password + token |

---

## 3. dashboard-crm

**Sujet** : CRM personnel avec gestion leads (pipeline), taches et evenements.
**Source** : Dashboard personnel v2.
**Backend** : FastAPI + asyncpg.

### Patterns frontend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **Dashboard layout** | `frontend/src/components/layout/` | AppShell + AppSidebar (collapsible) + Header + UserMenu |
| **KPI cards** | `frontend/src/components/dashboard/KpiCard.tsx` | Card avec icone, valeur, sous-titre, couleur custom — en grid |
| **Data table** | `frontend/src/components/leads/TableView.tsx` | Table triable, cliquable, avec badges status/heat |
| **Kanban board** | `frontend/src/components/leads/KanbanView.tsx` | Drag-drop entre 9 colonnes status (@dnd-kit), update auto |
| **Kanban card** | `frontend/src/components/leads/KanbanCard.tsx` | Card lead avec nom, email, company, badge heat |
| **Detail sheet** | `frontend/src/components/leads/LeadDetailSheet.tsx` | Panel lateral : contact info, social links, notes, tasks, events |
| **Task list** | `frontend/src/components/tasks/TaskList.tsx` | Groupe par urgence (overdue/today/tomorrow/week/later/no-date/done), color-coded |
| **Task card** | `frontend/src/components/tasks/TaskCard.tsx` | Checkbox toggle, priority badge, lead link, due date |
| **Filters** | `frontend/src/components/leads/FiltersGroup.tsx` | Multi-select status, heat level, city |
| **Search + Sort** | `frontend/src/components/leads/SearchInput.tsx` + `SortControl.tsx` | Barre recherche + tri dropdown |
| **CRUD modal** | `frontend/src/components/leads/CreateEditLeadModal.tsx` | Dialog + React Hook Form + Zod, mode create/edit |
| **Event card** | `frontend/src/components/events/EventCard.tsx` | Card interaction : channel icon, type badge, date, description |
| **Pagination** | `frontend/src/components/leads/PaginationControls.tsx` | Prev/Next + page indicator |
| **Auth guard** | `frontend/src/components/auth/ProtectedRoute.tsx` | Client-side localStorage check → redirect /login |

### Patterns backend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **CRUD complet** | `backend/app/` | Leads, Tasks, Notes, Events — chacun avec CRUD + filtres + pagination |
| **Auth JWT** | `backend/app/` | Login/register + bearer token |
| **fetchWithAuth** | `frontend/src/lib/apiClient.ts` | Axios wrapper avec interceptor 401 |

---

## 4. cloud-interface

**Sujet** : Interface cloud storage personnel (type Google Drive/Dropbox).
**Source** : Personal cloud.
**Backend** : FastAPI + asyncpg + chunked upload.

### Patterns frontend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **File table** | `frontend/src/components/file-table.tsx` | Table fichiers/dossiers : inline edit, favoris, multi-select, batch actions |
| **Folder breadcrumb** | `frontend/src/components/folder-breadcrumb.tsx` | Navigation recursive child → root, cliquable |
| **File preview** | `frontend/src/components/file-preview.tsx` | Modal preview : images, PDFs (iframe), videos, audio, texte |
| **Cloud sidebar** | `frontend/src/components/cloud-sidebar.tsx` | Nav Home/Favorites/Trash + storage quota progress bar |
| **Batch actions** | `frontend/src/components/batch-actions-banner.tsx` | Banner sticky bottom : count + actions (duplicate/delete/restore) |
| **Trash view** | `frontend/src/components/trash-view.tsx` | Table items supprimes, restore/delete permanent, empty trash |
| **Favorites view** | `frontend/src/components/favorites-view.tsx` | Table favoris avec "go to location" |
| **Share dialog** | `frontend/src/components/share-dialog.tsx` | Generation lien + copy-to-clipboard |
| **New item button** | `frontend/src/components/new-item-button.tsx` | Dropdown : new folder (dialog) + upload files (multi) |
| **File tree** | `frontend/src/components/file-tree.tsx` | Tree collapsible hierarchique (non utilise en production, mais disponible) |
| **Chunked upload** | `frontend/src/lib/api.ts` | Upload 5MB chunks avec progress callback |

### Patterns backend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **File CRUD** | `backend/app/` | Upload (chunked), download, rename, duplicate, soft delete |
| **Trash system** | `backend/app/` | Soft delete + restore + permanent delete + empty trash |
| **Favorites** | `backend/app/` | Toggle favorite par fichier/dossier |
| **Share links** | `backend/app/` | Generation lien public |
| **Storage stats** | `backend/app/` | Calcul quota utilise/disponible |

---

## 5. vscode-shell

**Sujet** : IDE web type VS Code avec terminal SSH, editeur de code et gestion sessions.
**Source** : Shell de l'agent Claude Code personnel.
**Backend** : Next.js API routes + WebSocket terminal proxy.

### Patterns frontend cles

| Pattern | Chemin | Description |
|---------|--------|-------------|
| **Split pane layout** | `frontend/src/components/layouts/app-shell.tsx` | react-resizable-panels : sidebar (15-40%) + content, resize handle |
| **Tab bar** | `frontend/src/components/editor/tab-bar.tsx` | Tabs avec drag-reorder, dirty indicator (dot), close button, add terminal |
| **Tab item** | `frontend/src/components/editor/tab-item.tsx` | Tab : icon par type, nom, dirty/close toggle |
| **Code editor** | `frontend/src/components/editor/codemirror-editor.tsx` | CodeMirror 6 : JS/TS/Python/JSON/HTML/CSS/MD, Cmd+S save |
| **File editor** | `frontend/src/components/editor/file-editor.tsx` | Toolbar + CodeMirror + dirty state + save button |
| **File tree** | `frontend/src/components/explorer/file-tree.tsx` | Tree recursif avec drag-drop, context menu, inline rename |
| **File tree item** | `frontend/src/components/explorer/file-tree-item.tsx` | Row : expand toggle, icon, name, context menu (new/rename/delete/copy/move) |
| **Inline input** | `frontend/src/components/explorer/inline-input.tsx` | Input inline pour creation/rename (Enter save, Escape cancel) |
| **Explorer toolbar** | `frontend/src/components/explorer/explorer-toolbar.tsx` | Boutons : new file, new folder, refresh, collapse all |
| **Terminal** | `frontend/src/components/terminal/terminal-instance.tsx` | xterm.js wrapper avec WebSocket, visibility toggle |
| **Terminal toolbar** | `frontend/src/components/terminal/terminal-toolbar.tsx` | Mobile : modifier keys (Ctrl/Shift/Alt), arrows, Ctrl+C/D/Z/L, voice input |
| **Markdown preview** | `frontend/src/components/editor/markdown-preview.tsx` | GitHub-flavored markdown renderer |
| **Close confirm** | `frontend/src/components/editor/close-confirm-dialog.tsx` | Dialog unsaved changes : Save/Discard/Cancel |
| **Session management** | `frontend/src/components/sessions/` | Liste sessions, creation, suppression |

### Architecture specifique

| Element | Chemin | Description |
|---------|--------|-------------|
| **Workspace context** | `frontend/src/contexts/workspace-context.tsx` | State global : sessions, tabs actifs, file tree root |
| **Terminal hook** | `frontend/src/hooks/use-terminal.ts` | Init xterm, WebSocket connect, resize sync |
| **File tree hook** | `frontend/src/hooks/use-file-tree.ts` | Expanded state, toggle, collapse all |

---

## Utilisation par les agents

Quand un agent frontend doit creer un composant :

1. **Identifier le pattern** le plus proche dans cet index
2. **Lire le code source** du composant reference pour comprendre la structure
3. **Adapter** au contexte du projet en cours (entite, API, style)
4. **Ne pas copier-coller** — s'inspirer de l'architecture et des patterns

### Mapping type de page → projet de reference

| Type de page | Projet de reference | Composants cles |
|-------------|-------------------|-----------------|
| Dashboard avec KPIs | `dashboard-crm` | KpiCard, AppShell, AppSidebar |
| Table de donnees avec filtres | `dashboard-crm` | TableView, FiltersGroup, SearchInput, PaginationControls |
| Kanban / Pipeline | `dashboard-crm` | KanbanView, KanbanColumn, KanbanCard |
| Detail panel lateral | `dashboard-crm` | LeadDetailSheet |
| Liste de taches | `dashboard-crm` | TaskList, TaskCard, TaskFilters |
| CRUD modal | `dashboard-crm` | CreateEditLeadModal, LeadForm |
| Formulaire multi-etapes | `form-onboarding` | onboarding-form, stepper, steps/*, use-onboarding-form |
| Resultats / Scoring | `form-onboarding` | score-result |
| File manager | `cloud-interface` | file-table, folder-breadcrumb, file-preview, batch-actions |
| Chat / Messaging | `chat-interface` | chat/messages, chat/message, chat/input |
| Streaming temps reel | `chat-interface` | sessions/hooks (useSessionStream) |
| Editeur de code | `vscode-shell` | codemirror-editor, file-editor, tab-bar |
| Terminal | `vscode-shell` | terminal-instance, use-terminal |
| Split pane layout | `vscode-shell` | app-shell (react-resizable-panels) |
| File tree navigation | `vscode-shell` ou `chat-interface` | file-tree, file-tree-item |
| Admin dashboard | `form-onboarding` | stats-panel, submissions-table |
