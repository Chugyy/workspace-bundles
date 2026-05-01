# Infrastructure

## Services Cloud

### VPS Hostinger
- **IP** : YOUR_VPS_IP
- **User** : root
- **Connexion SSH** : `~/.ssh/id_ed25519`
- **Passphrase** : your-passphrase

## Repos Git

*(À documenter au fur et à mesure)*

## Backup & Versioning

### Système de Versioning Local
- **Dossier** : `versions/` (à la racine de `personal-claude-code-agent`)
- **Scripts** :
  - `sync-push.sh` : Mac → VPS
  - `sync-pull.sh` : VPS → Mac

### Exclusions de Sync
- `.venv`
- `node_modules`
- `__pycache__`
- `*.pyc`
- `.DS_Store`
- `*.log`

### Format Backup
```
versions/
└── backup-YYYY-MM-DD-HH-MM-SS/
    └── .claude/
```

---

**Dernière mise à jour** : 2026-02-15
