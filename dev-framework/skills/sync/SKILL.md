---
name: sync
description: >
  Mise a jour du framework. Git pull, detection des changements de config
  (.mcp.json.example), demande des nouvelles infos si besoin, mise a jour
  du .mcp.json local.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
model: sonnet
user-invocable: true
disable-model-invocation: false
---

# Sync — Mise a jour du framework

## Objectif

Mettre a jour le framework local en recuperant les dernieres modifications depuis GitHub, et adapter la config si necessaire.

## Etapes

### 1. Detecter le repo

Chercher le dossier `.git` pour identifier la racine du framework :

```bash
git rev-parse --show-toplevel
```

Si pas dans un repo git, chercher dans les emplacements courants :
- `~/Documents/framework`
- Le dossier courant et ses parents

Si introuvable : "Je ne trouve pas le framework. Ou l'as-tu installe ?"

### 2. Verifier l'etat local

```bash
git status --short
```

Si des modifications locales existent (cas improbable en read-only), prevenir l'utilisateur :
"Il y a des modifications locales. Je vais les sauvegarder avant de mettre a jour."
```bash
git stash
```

### 3. Recuperer les mises a jour

```bash
git pull origin main
```

Interpreter le resultat :
- `Already up to date.` → rien a faire
- Liste de fichiers modifies → noter les changements
- Conflit → "Il y a un conflit. Je vais reinitialiser et reprendre proprement."
  ```bash
  git stash drop 2>/dev/null
  git reset --hard origin/main
  ```

### 4. Detecter les changements de config

Comparer `mcp.json.example` (ou le template dans le repo) avec le `.mcp.json` local :

```bash
diff <(jq -S 'keys' mcp.json.example) <(jq -S 'keys' .mcp.json) 2>/dev/null
```

Detecter :
- **Nouveaux MCP servers** dans le template qui ne sont pas dans le local → demander les infos necessaires et les ajouter
- **MCP servers supprimes** du template → signaler a l'utilisateur "Le server X a ete retire du framework. Tu veux le retirer de ta config aussi ?"
- **Nouveaux champs** dans un server existant → demander la valeur

### 5. Mettre a jour le .mcp.json

Si des changements sont necessaires :
1. Lire le `.mcp.json` actuel
2. Ajouter/modifier/supprimer selon les diff detectes
3. Ecrire le fichier mis a jour
4. Verifier que le JSON est valide

### 6. Rapport

Si des mises a jour ont ete appliquees :
```
Mise a jour effectuee :
- X fichiers mis a jour dans le framework
- Y nouvelles configs ajoutees au .mcp.json
- (detail des changements)
```

Si rien a faire :
```
Framework a jour. Aucune modification necessaire.
```
