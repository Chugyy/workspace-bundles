# Backend API - Template

Backend FastAPI avec architecture en couches et PostgreSQL.

## 🚀 Quick Start

```bash
# 1. Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 2. Installer dépendances
pip install -r requirements.txt

# 3. Configurer .env
cp config/.env.example config/.env
# Éditer config/.env avec vos valeurs

# 4. Lancer le serveur
python -m app.api.main
```

## 📖 Documentation

Pour l'architecture complète, voir **[ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🔗 Endpoints

- **API** : http://localhost:8000
- **Swagger** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

## ✅ Tests

```bash
pytest tests/ -v
```

---

*Généré avec Claude Code*
