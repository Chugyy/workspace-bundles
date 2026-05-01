---
name: frontend
description: >
  Architecture frontend complete depuis le PRD + API docs. Agent Opus.
  Inclut branding, layout, mockups optionnels. Checkpoint humain pour le visuel.
allowed-tools: Read, Write, Agent, Glob, Grep, Bash, WebFetch
model: opus
user-invocable: true
disable-model-invocation: false
---

> **Convention projet** : Tous les chemins `docs/` et `dev/` sont relatifs au dossier projet actif.

# Architecture Frontend

**ORDRE CRITIQUE** : Collecter TOUTES les infos visuelles de l'utilisateur AVANT de lancer l'agent. L'agent recoit le branding dans son prompt pour l'integrer directement dans l'architecture.

## Prerequis

1. Lire `docs/prd.md` — Si absent, STOP, lancer `/prd`
2. Lire `docs/architecture/api/*.md` — Si absent, STOP, lancer `/api`
3. Verifier le scope dans `docs/brainstorming.md` — doit etre `full-stack` ou `frontend-only`

---

## Phase 1 — Branding (checkpoint humain — AVANT l'agent)

**OBLIGATOIRE** : Ne PAS lancer l'agent frontend-architect avant d'avoir toutes ces infos.

### Etape 1 — Preset shadcn

Presenter les presets shadcn disponibles (source: `.claude/resources/scripts/setup-infrastructure.py`) :

| Preset | Code | Description |
|--------|------|-------------|
| **vega** | `bIkeymG` | Simple, equilibre, classique (defaut) |
| **luma** | `b1VlIttI` | Arrondi, soft, genereux en spacing |
| **lyra** | `buFznsW` | Sharp, boxy, police monospace (JetBrains) |
| **mira** | `b1D0eCA4` | Compact, dense, optimise pour beaucoup de donnees |

Demander a l'utilisateur de choisir. Ces presets sont utilises par `setup-infrastructure.py` via `npx shadcn@latest init --preset {code}`.

### Etape 2 — Couleurs et identite visuelle

Demander : "Tu as un site existant, un logo, ou des couleurs en tete ?"
- Si oui (URL) : WebFetch, extraire couleurs/police/style
- Si non : Proposer 2-3 palettes coherentes basees sur le preset choisi

### Etape 3 — Preferences complementaires

- Dark mode par defaut ou light ?
- Couleur primaire custom ?
- Font override ?

### Etape 4 — Layout

Proposer 2-3 options de layout en wireframe texte. L'utilisateur choisit.

**Resultat** : un bloc `branding_summary` avec preset, couleurs, layout, dark mode. Ce bloc est passe a l'agent.

---

## Phase 2 — Frontend Architecture (1 agent Opus)

**UNIQUEMENT apres validation du branding par l'utilisateur.**

**Agent** : `frontend-architect` (Opus)
**Input** :
- `docs/prd.md`
- `docs/architecture/api/*.md`
- **Branding summary** (preset, couleurs, layout, dark mode — collecte en Phase 1)
**Contexte** :
- `.claude/resources/rules/best-practises-build-frontend/`
- `.claude/resources/templates/projects/INDEX.md` + code source des projets de reference
- `.claude/resources/templates/code/frontend/src/components/ui/`
**Output** : `docs/architecture/frontend/frontend-architecture.md`

Le prompt de l'agent DOIT inclure le branding :

```
Agent(frontend-architect, prompt="
  prd_path: docs/prd.md
  api_path: docs/architecture/api/
  ui_components_path: .claude/resources/templates/code/frontend/src/components/ui/
  
  BRANDING:
  - Preset shadcn: {preset_name} (code: {preset_code})
  - Couleur primaire: {primary_color}
  - Dark mode: {default_theme}
  - Layout: {layout_choice}
  - Font: {font_choice}
  
  Integrer ces choix dans la section Branding du document d'architecture.
  Le preset determine le design system de base (radius, spacing, fonts).
  Les couleurs custom overrident les couleurs du preset si specifiees.
")
```

Pas de JSON config pour le frontend — trop de variations, gere par agents au build.

---

## Phase 3 — Mockups HTML (optionnel)

Demander si l'utilisateur veut des previews HTML. Si oui :
```
Agent(build-mockups, prompt="frontend_arch_path: docs/architecture/frontend/frontend-architecture.md, mockups_path: docs/mockups, branding: {resume}, layout: {layout}")
```

---

## Output

```
Livrables :
- docs/architecture/frontend/frontend-architecture.md (avec branding integre)
- docs/mockups/*.html (si demande)

Next Step : /build
```
