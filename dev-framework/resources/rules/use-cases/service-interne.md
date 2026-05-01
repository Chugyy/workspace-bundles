# Service Interne — Deploiement sur la Dedibox (sans Docker)

## Quand utiliser ce pattern

Un **service interne** est un processus permanent qui tourne sur la Dedibox, expose une API sur un port,
et est utilisable par les autres PIDs et agents via un CLI lib/. Il ne passe PAS par Dokploy.

Criteres :
- Besoin d'un process permanent (≠ action handler ephemere)
- Usage interne uniquement (≠ app publique)
- Stockage simple (SQLite ou fichiers) suffisant (≠ app publique avec PostgreSQL)

Exemples : mp4-transcriber (transcription/derush video), futur service TTS, outil de traitement de fichiers...

---

## Structure du projet

Tout vit dans le dossier workspace du projet. Pas de dossier separe dans /data/.

```
pids/dev/mon-service/
├── app.py              # point d'entree FastAPI (ou autre)
├── start.sh            # script de demarrage (cree lors du deploiement)
├── requirements.txt
├── venv/               # venv Python — gitignore
├── bin/                # binaires statiques si necessaire — gitignore
├── data/               # SQLite DB + uploads + resultats — gitignore
└── .gitignore
```

### .gitignore minimal

```
venv/
bin/
data/
__pycache__/
*.pyc
```

---

## Etapes de deploiement

### 1. Creer le venv

```bash
cd /data/workspace/pids/dev/mon-service
uv venv venv --python python3.12
VIRTUAL_ENV=./venv uv pip install -r requirements.txt
```

### 2. Binaires systeme (sans sudo)

Pour les outils comme ffmpeg, utiliser une version statique :

```bash
mkdir -p bin && cd bin
wget "https://github.com/BtbN/ffmpeg-builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz" -O ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz --strip-components=2 --wildcards "*/bin/ffmpeg" "*/bin/ffprobe"
rm ffmpeg.tar.xz
```

### 3. Creer start.sh

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DATA_DIR="$SCRIPT_DIR/data"
export PATH="$SCRIPT_DIR/bin:$PATH"
mkdir -p "$DATA_DIR"
cd "$SCRIPT_DIR"
source venv/bin/activate
exec uvicorn app:app --host 0.0.0.0 --port <PORT>
```

```bash
chmod +x start.sh
```

### 4. Ajouter a l'ecosystem.config.js

Editer `/data/ai-manager/ecosystem.config.js` — ajouter dans la section `Services: standalone tools` :

```javascript
{
  name: 'mon-service',
  script: '/data/workspace/pids/dev/mon-service/start.sh',
  interpreter: '/bin/bash',
  cwd: '/data/workspace/pids/dev/mon-service',
  env: {
    PATH: PATH,
    HOME: '/home/hugo',
    PM_CATEGORY: 'service',   // apparait dans la page process de l'ai-manager
    PM_PORT: '<PORT>',
    PM_HEALTH: '/health',     // endpoint de health check (ou laisser vide)
  },
  watch: false,
  autorestart: true,
  max_restarts: 10,
  restart_delay: 5000,
},
```

### 5. Demarrer et sauvegarder

```bash
pm2 start /data/ai-manager/ecosystem.config.js --only mon-service
pm2 save
```

### 6. Verifier

```bash
pm2 list
curl http://localhost:<PORT>/health
pm2 logs mon-service --lines 20
```

---

## Creer le CLI lib/ pour les agents

Si le service doit etre utilisable par des agents, creer un CLI dans `lib/mon-service/`.

```
lib/mon-service/
├── meta.yaml       # type: tool
├── SKILL.md        # documentation pour les agents
├── setup.sh        # cree bin/mon-service en reutilisant le venv du service
└── src/
    └── cli.py      # CLI Typer qui appelle l'API locale
```

### meta.yaml

```yaml
id: mon-service
type: tool
description: "Description courte pour les agents"
entry: SKILL.md
```

### setup.sh — reutiliser le venv du service (pas de doublon)

```bash
#!/bin/bash
SERVICE_VENV="/data/workspace/pids/dev/mon-service/venv"

VIRTUAL_ENV="$SERVICE_VENV" uv pip install httpx typer rich -q 2>/dev/null || \
    "$SERVICE_VENV/bin/python3" -m pip install httpx typer rich -q

mkdir -p "$(dirname "${BASH_SOURCE[0]}")/bin"
ENTRY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bin/mon-service"
CLI_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src/cli.py"

cat > "$ENTRY" << SCRIPT
#!/bin/bash
exec "$SERVICE_VENV/bin/python3" "$CLI_SRC" "\$@"
SCRIPT
chmod +x "$ENTRY"
echo "OK"
```

### Apres setup

```bash
cd /data/workspace/lib/mon-service && ./setup.sh
cd /data/workspace && python3 registry.py build   # indexer dans le registry
```

---

## Categories PM2 et visibilite dans le dashboard

Tout process dans PM2 apparait dans la page "Processus" de l'AI Manager (via `pm2 jlist`).
La metadonnee `PM_CATEGORY` dans l'ecosystem.config.js determine le groupe d'affichage.

| PM_CATEGORY | Usage |
|-------------|-------|
| `core` | Infra AI Manager — ne pas utiliser |
| `connector` | Bot/connecteur sans port expose (discord-htr...) |
| `service` | Outil interne avec API sur un port |

---

## Convention de ports

Plage reservee aux services internes : **8750–8850**

| Service | Port |
|---------|------|
| mp4-transcriber | 8765 |
| suivants | 8766, 8767... |

---

## Exemple de reference : mp4-transcriber

- Code : `/data/workspace/pids/dev/mp4-transcriber/`
- Start : `/data/workspace/pids/dev/mp4-transcriber/start.sh`
- Data : `/data/workspace/pids/dev/mp4-transcriber/data/` (gitignore)
- Binaires : `/data/workspace/pids/dev/mp4-transcriber/bin/` (ffmpeg statique, gitignore)
- CLI : `/data/workspace/lib/mp4-transcriber/`
- Port : 8765, categorie `service`, health `/api/jobs?limit=1`

***
