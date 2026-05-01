# Agent IA Autonome — Bonnes Pratiques

## Definition

Un agent IA autonome = un PID avec un `.claude/CLAUDE.md`, des outils CLI, et un espace de travail. Il est invoque via `agent-invoke` — soit depuis une action handler, soit depuis un autre agent, soit par un humain. Il utilise le meme pipeline que les conversations humaines dans le dashboard (API backend AI Manager).

---

## Architecture d'un agent

### Structure du PID

```
lib/{agent-name}/               # Ou pids/{profile}/{agent-name}/
├── meta.yaml                   # Identite de l'agent (type: agent)
├── .claude/
│   ├── CLAUDE.md               # Prompt systeme, role, regles, outils disponibles
│   └── settings.json           # Permissions, outils autorises
├── workspace/                  # Dossier de travail (optionnel)
│   └── ...                     # Fichiers que l'agent peut creer/modifier
└── tools/                      # Outils CLI specifiques a l'agent (optionnel)
    ├── analyze.sh
    └── report.sh
```

### meta.yaml

```yaml
id: mon-agent
type: agent
description: "Analyse les feedbacks et genere des rapports"
model: sonnet
max_turns: 15
```

- `type: agent` — obligatoire pour etre reconnu par agent-invoke
- `model` — modele par defaut (haiku pour rapide/simple, sonnet pour complexe, opus pour critique)
- `max_turns` — limite de tours agentic (securite contre les boucles)

### CLAUDE.md

C'est le coeur de l'agent. Il definit qui il est, ce qu'il sait faire, et ses contraintes.

```markdown
# Agent Analyse Feedbacks

## Role
Tu es un agent specialise dans l'analyse des feedbacks business.
Tu recois des feedbacks enrichis et tu generes des rapports
avec des propositions d'automatisation.

## Outils disponibles
- `tools/analyze.sh` — analyse un batch de feedbacks
- `lib/email/run.sh` — envoyer des emails
- `agent-invoke` — deleguer a d'autres agents

## Contexte
- Context store : `context/store/` (clients, contacts, strategies)
- Lib partagee : `lib/` (outils CLI)

## Contraintes
- Toujours citer les feedbacks sources dans tes propositions
- Ne pas modifier le context store directement — proposer des changements
- Repondre en francais
```

---

## Regles

### 1. Un agent = un PID avec .claude/CLAUDE.md

Pas de code custom pour le "runtime" de l'agent. Claude Code EST le runtime. Le CLAUDE.md definit le comportement, les outils sont en CLI, et agent-invoke gere l'invocation.

### 2. Invocation via agent-invoke

Agent-invoke est un client CLI de l'API backend AI Manager. Toutes les conversations sont visibles dans le dashboard.

```bash
# One-shot (pas de session persistante)
agent-invoke ask mon-agent "Analyse ces feedbacks: ..."

# Conversation persistante (session)
agent-invoke chat mon-agent "Commence l'analyse du batch de feedbacks"

# Reprendre une conversation
agent-invoke resume <session-id> "Et les feedbacks du canal Discord ?"
```

**Depuis une action handler (Python) :**

```python
import subprocess
import json

result = subprocess.run(
    ["agent-invoke", "chat", "mon-agent",
     f"Voici un event erreur a analyser: {json.dumps(event)}",
     "--json"],
    capture_output=True, text=True,
    timeout=300
)
response = json.loads(result.stdout)
print(f"Agent response: {response['result']}")
```

**Depuis un autre agent** (dans un CLAUDE.md, section outils) :

```markdown
## Outils
- `agent-invoke ask context-search "query"` — deleguer une recherche au context-search
```

### 3. Trois modes de conversation

| Mode | Commande | Quand l'utiliser |
|------|----------|------------------|
| `ask` | `agent-invoke ask <agent> "prompt"` | Tache ponctuelle, pas besoin de suivi |
| `chat` | `agent-invoke chat <agent> "prompt"` | Debut de conversation, session persistante |
| `resume` | `agent-invoke resume <session-id> "prompt"` | Continuer une conversation existante |

### 4. Types de conversation dans le dashboard

Les conversations agent sont differenciees dans le dashboard :

- `type: "human"` — humain qui parle a un agent (via le frontend)
- `type: "agent"` — agent qui parle a un agent (via agent-invoke)

Le frontend filtre par defaut sur `type: "human"`. Les conversations agent sont visibles mais dans une section separee.

### 5. Outils de l'agent = CLI

L'agent accede a ses outils via des commandes CLI, pas via MCP :

```bash
# Outils locaux (dans le PID de l'agent)
tools/analyze.sh <args>

# Outils partages (lib/)
lib/email/run.sh send --to "x@y.com" --subject "Rapport"
lib/telegram/run.sh send --message "Alerte"

# Context store
grep -ri "terme" context/store/

# Autres agents
agent-invoke ask context-search "Trouve le client HTR"
```

### 6. Espace de travail

L'agent travaille dans le `cwd` de son PID. Il peut creer des fichiers, des dossiers, lire le context store, etc. Son CLAUDE.md definit les limites.

```python
# Le cwd est automatiquement resolu par agent-invoke
cwd = f"{workspace_path}/pids/{pid}"
# ou pour les agents lib/
cwd = f"{workspace_path}/lib/{agent_name}"
```

### 7. Timeout obligatoire

Toute invocation d'agent a un timeout. Par defaut 300 secondes (5 min). Configurable.

```bash
agent-invoke ask mon-agent "prompt" --timeout 600  # 10 min max
```

---

## Quand utiliser un agent vs une completion LLM

| Besoin | Solution |
|--------|----------|
| Classifier un texte | Completion LLM (lib/claude-api ou SDK direct) |
| Extraire des infos d'un payload | Completion LLM |
| Generer un email template | Completion LLM |
| Analyser un batch de feedbacks et proposer des actions | Agent IA |
| Debugger une erreur et proposer un fix | Agent IA |
| Rechercher dans le context store et synthetiser | Agent IA |
| Orchestrer plusieurs outils pour accomplir une tache | Agent IA |

**Regle simple :** si ca prend un seul appel LLM (question → reponse), c'est une completion. Si ca necessite du raisonnement, des outils, ou plusieurs etapes, c'est un agent.

---

## A ne PAS faire

- **Ne pas creer d'agent sans CLAUDE.md** — le CLAUDE.md EST l'agent
- **Ne pas utiliser MCP dans les agents** — CLI seulement, c'est plus simple et plus robuste
- **Ne pas laisser un agent sans timeout** — risque de boucle infinie, consommation API
- **Ne pas hardcoder le modele dans le code** — le definir dans meta.yaml, overridable en CLI
- **Ne pas dupliquer la logique entre agents** — extraire en outils CLI partages dans lib/

***
