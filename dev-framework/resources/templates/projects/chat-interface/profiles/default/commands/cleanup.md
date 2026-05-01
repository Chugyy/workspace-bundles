---
description: Nettoyer les dossiers downloads/ des skills (audio, vidéo, fichiers temporaires)
---

# Cleanup Manager

Gère les fichiers téléchargés et temporaires accumulés dans les dossiers `downloads/` des skills.

## Ton rôle

1. **Scanner** les dossiers downloads/ de tous les skills
2. **Présenter** les stats à l'utilisateur (nb fichiers, taille, ancienneté)
3. **Proposer** des actions via AskUserQuestion
4. **Exécuter** le choix confirmé

## Étape 1 : Scanner les downloads

```bash
# Scanner tous les skills
python3 .claude/skills/tools-divers/utils/transcribe.py cleanup --list

# Stats globales via find
find .claude/skills/*/downloads -type f 2>/dev/null | head -100
```

Ou directement avec Python :
```python
from pathlib import Path

skills_dir = Path(".claude/skills")
results = {}
total_files = 0
total_mb = 0

for skill_dir in skills_dir.iterdir():
    dl_dir = skill_dir / "downloads"
    if dl_dir.exists():
        files = [f for f in dl_dir.iterdir() if f.is_file()]
        size_mb = sum(f.stat().st_size for f in files) / (1024*1024)
        results[skill_dir.name] = {"files": len(files), "size_mb": round(size_mb, 2)}
        total_files += len(files)
        total_mb += size_mb
```

## Étape 2 : Présenter les stats

Format de présentation :
```
📁 Downloads — État actuel

  tools-divers/downloads/    12 fichiers   45.3 MB
  whatsapp-manager/downloads/ 3 fichiers    2.1 MB
  ─────────────────────────────────────────────
  Total                       15 fichiers   47.4 MB
```

## Étape 3 : Proposer des actions (AskUserQuestion)

```python
AskUserQuestion(questions=[{
    "question": "Que veux-tu faire avec les fichiers téléchargés (47.4 MB) ?",
    "header": "Cleanup",
    "multiSelect": False,
    "options": [
        {"label": "Voir le détail", "description": "Lister tous les fichiers avec taille et date"},
        {"label": "Supprimer > 7 jours", "description": "Garder les récents, supprimer les anciens"},
        {"label": "Tout supprimer", "description": "Vider tous les dossiers downloads/"},
        {"label": "Choisir par skill", "description": "Sélectionner quel skill nettoyer"}
    ]
}])
```

## Étape 4 : Exécuter le choix

### Option "Voir le détail"
```bash
python3 .claude/skills/tools-divers/utils/transcribe.py cleanup --list
```
Puis re-proposer les actions.

### Option "Supprimer > N jours"
Demander confirmation avec le nombre de jours, puis :
```bash
python3 .claude/skills/tools-divers/utils/transcribe.py cleanup --older-than 7
```
Pour d'autres skills, utiliser directement `find` + `rm` ou Python `Path.unlink()`.

### Option "Tout supprimer"
Demander une confirmation explicite : "Es-tu sûr ? Cela supprimera X fichiers (Y MB)."
```bash
python3 .claude/skills/tools-divers/utils/transcribe.py cleanup --all
# + supprimer downloads/ des autres skills si nécessaire
```

### Option "Choisir par skill"
```python
AskUserQuestion(questions=[{
    "question": "Quel skill nettoyer ?",
    "header": "Skill",
    "multiSelect": True,
    "options": [
        {"label": "tools-divers", "description": "12 fichiers, 45.3 MB"},
        {"label": "whatsapp-manager", "description": "3 fichiers, 2.1 MB"},
    ]
}])
```
Puis cleanup du/des skill(s) sélectionné(s).

## Règles importantes

- **JAMAIS** supprimer sans confirmation explicite de l'utilisateur
- **TOUJOURS** afficher ce qui sera supprimé avant de le faire
- **PROPOSER** --dry-run mentalement : montrer la liste avant action
- **RESPECTER** le choix : si l'utilisateur dit "annuler", ne pas insister

## Format de réponse

```
🧹 Cleanup terminé
  Supprimés : 12 fichiers
  Libéré : 45.3 MB
  Conservés : 3 fichiers (récents)
```
