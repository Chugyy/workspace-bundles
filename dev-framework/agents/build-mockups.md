---
name: build-mockups
description: >
  Génère des pages HTML statiques de preview (Tailwind CDN) depuis
  l'architecture frontend + branding. Purement visuel, non fonctionnel.
allowed-tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Build Mockups — Pages HTML de preview

## Objectif

Générer des pages HTML statiques standalone pour chaque page clé de l'application. L'utilisateur les ouvre dans son navigateur pour visualiser le résultat avant le code réel.

## Arguments attendus

- `frontend_arch_path` : Chemin vers frontend-architecture.md
- `mockups_path` : Chemin de sortie (ex: `docs/mockups`)
- `branding` : Résumé du branding validé (couleurs, font, radius, style)
- `layout` : Type de layout choisi (sidebar, navbar, etc.)

## Process

### 1. Lire les regles et specs

**Regles** (via `.claude/resources/rules/index.md`) :
- Conseille : bonnes pratiques frontend (design system Tailwind, theming, couleurs) pour le visuel

**Specs projet** :
1. `{frontend_arch_path}` — Pages, composants, structure
2. Comprendre le branding (couleurs hex, font, border-radius, dark mode)
3. Comprendre le layout (sidebar gauche, navbar top, etc.)

### 2. Générer chaque page HTML

Pour chaque page clé identifiée dans l'architecture :

```html
<!DOCTYPE html>
<html lang="fr" class="{dark si dark mode}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{Page Name} — {App Name} Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '{primary_color}',
                        'primary-foreground': '{primary_fg}',
                        secondary: '{secondary_color}',
                        background: '{bg_color}',
                        foreground: '{fg_color}',
                        muted: '{muted_color}',
                        border: '{border_color}',
                    },
                    borderRadius: {
                        DEFAULT: '{radius}',
                    },
                    fontFamily: {
                        sans: ['{font}', 'system-ui', 'sans-serif'],
                    },
                }
            }
        }
    </script>
    <style>
        /* Bannière indicative */
        .preview-banner {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: #f59e0b; color: #000; text-align: center;
            padding: 8px; font-size: 14px; z-index: 9999;
        }
    </style>
</head>
<body class="bg-background text-foreground font-sans">
    <!-- Bannière de preview -->
    <div class="preview-banner">
        ⚠️ PREVIEW UNIQUEMENT — Non fonctionnel, non optimisé. Aperçu visuel.
    </div>

    <!-- Layout -->
    {layout_html}

    <!-- Contenu de la page -->
    {page_content_html}

    <!-- Padding pour la bannière -->
    <div class="h-10"></div>
</body>
</html>
```

### 3. Principes de génération

- **Données fake réalistes** : noms crédibles, chiffres cohérents, dates réalistes
- **Layout inclus dans chaque page** : sidebar/navbar reproduit dans chaque fichier (standalone)
- **Pas de JS** : aucune interactivité. Les boutons/liens ne font rien.
- **Responsive** : le HTML doit s'adapter en mobile (Tailwind responsive classes)
- **Bannière visible** : rappel permanent que c'est un aperçu non fonctionnel
- **Navigation entre pages** : liens `<a href="{other_page}.html">` pour naviguer entre les mockups

### 4. Pages à générer

Au minimum :
- `layout.html` — Page d'accueil / dashboard avec le layout complet
- Une page par type de vue majeur (list, detail, form, settings)

Nommer chaque fichier de manière descriptive : `dashboard.html`, `entity-list.html`, `entity-detail.html`, `settings.html`, etc.

## Output

- `{mockups_path}/*.html` — Une page HTML par vue clé
- `{mockups_path}/README.md` — Liste des pages avec description

## Règles strictes

- Tailwind CDN UNIQUEMENT — pas de fichier CSS séparé
- TOUT inline dans le HTML (pas de fichier JS séparé)
- Chaque fichier est standalone (ouvrable directement dans le navigateur)
- Données fake RÉALISTES (pas de "Lorem ipsum")
- Bannière de preview TOUJOURS visible
- NE PAS utiliser de framework JS
