---
name: vps-monitor
description: >
  Monitoring et nettoyage du VPS personnel.
  Collecte les metriques (RAM, CPU, containers Docker, processes),
  nettoie les containers morts, images inutilisees, build cache,
  et kill les processes zombies. Genere un rapport avant/apres.
allowed-tools: mcp__ssh-mcp-personal-vps__execute-command
model: sonnet
user-invocable: true
disable-model-invocation: false
---

# VPS Monitor & Clean

## Objectif

Monitoring complet + nettoyage automatique du VPS personnel via MCP SSH (`mcp__ssh-mcp-personal-vps__execute-command`).

## Etapes

### 1. Snapshot AVANT

Collecter l'etat actuel en une seule commande :

```
echo "=== RAM ===" && free -h && echo "=== LOAD ===" && uptime && echo "=== TOP CPU ===" && ps aux --sort=-%cpu | head -15 && echo "=== TOP MEM ===" && ps aux --sort=-%mem | head -15 && echo "=== DOCKER CONTAINERS ===" && docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" && echo "=== DOCKER STATS ===" && docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}" && echo "=== DOCKER SYSTEM ===" && docker system df
```

Noter les valeurs cles : RAM used, load average, nb containers, espace Docker.

### 2. Detecter les anomalies

Analyser les resultats et signaler :
- Load average > 50% du nombre de vCPUs (verifier avec `nproc`)
- Processes qui consomment > 10% CPU de maniere anormale
- Containers en status "Exited" ou "Created" (zombies)
- Instances `claude` CLI qui tournent depuis plus de 24h
- Tout process inattendu qui consomme des ressources

### 3. Clean containers Docker

```
docker container prune -f
```

### 4. Clean images et build cache

```
docker system prune -a -f
```

**ATTENTION** : Ne PAS utiliser `--volumes` pour eviter de supprimer des donnees persistantes (uploads, DB). Les volumes sont preserves.

### 5. Kill processes zombies

Detecter et tuer les instances claude CLI qui tournent depuis plus de 24h :

```
ps aux | grep claude | grep -v grep
```

Si des instances sont trouvees, les kill avec `kill <PID>`. Si elles resistent, utiliser `kill -9 <PID>`.

**IMPORTANT** : Avant de kill un process, verifier qu'il n'est pas un build ou un job en cours. En cas de doute, demander a l'utilisateur.

### 6. Snapshot APRES

Relancer la meme commande qu'a l'etape 1 pour collecter l'etat apres nettoyage.

### 7. Rapport

Presenter un tableau comparatif clair :

```
| Metrique | Avant | Apres |
|----------|-------|-------|
| RAM utilisee | X Go | Y Go |
| RAM disponible | X Go | Y Go |
| Load average | X | Y |
| Containers total | X | Y |
| Containers actifs | X | Y |
| Espace Docker | X Go | Y Go |
| Espace recupere | - | Z Go |
```

Suivi de :
- Liste des anomalies detectees (si applicable)
- Actions effectuees (containers supprimes, processes tues, etc.)
- Recommandations (si un service consomme trop, si un container crash-loop, etc.)

## Notes

- Timeout des commandes Docker prune : utiliser `timeout: 120000` (2 min)
- Ne jamais supprimer les volumes Docker (`--volumes` interdit)
- Ne jamais stopper les services Dokploy sans demander a l'utilisateur
- Si un container est en crash-loop, le signaler mais ne pas le stopper automatiquement — demander a l'utilisateur
