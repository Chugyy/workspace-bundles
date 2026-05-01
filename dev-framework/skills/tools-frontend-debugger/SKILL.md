---
name: tools-frontend-debugger
description: >
  Debug itératif frontend. Questions ouvertes → fermées → hypothèses → test 1 par 1 → rollback si échec.
allowed-tools: Read, Edit, Glob, Grep, Bash
model: sonnet
user-invocable: true
disable-model-invocation: false
---

# Frontend Debugger

## Approche

Debug méthodique : **pas de shotgun debugging**. Tester une hypothèse à la fois, rollback si échec.

## Process

### 1. Comprendre le problème
- Questions ouvertes : "Que se passe-t-il ?" "Qu'attendais-tu ?"
- Questions fermées : "Ça marchait avant ?" "Sur quel navigateur ?" "Console errors ?"

### 2. Localiser
- Glob/Grep pour trouver les fichiers concernés
- Lire le code pertinent
- Identifier les composants dans la chaîne (page → composant → hook → service → API)

### 3. Hypothèses
- Lister 2-3 hypothèses les plus probables
- Ordonner par probabilité

### 4. Tester (1 par 1)
- Appliquer UN fix
- Vérifier (`npm run build`, test visuel)
- Si OK → documenter le fix
- Si KO → **rollback immédiat**, passer à l'hypothèse suivante

### 5. Documenter
- Cause root identifiée
- Fix appliqué
- Fichiers modifiés

## Règles strictes

- JAMAIS modifier plus d'un fichier à la fois sans tester
- TOUJOURS rollback si le fix ne fonctionne pas
- TOUJOURS vérifier le build après chaque modification
- Ne pas deviner — lire le code, lire les erreurs
