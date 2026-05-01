---
name: build-service
description: >
  Construit le wrapper reel pour UN service externe : lit la doc research,
  implemente, teste avec les vraies cles API, produit un rapport de reconciliation.
  Agent Opus — integration complexe, pas de la simple generation.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch
model: opus
---

# Build Service — Wrapper reel pour un service externe

## Objectif

Creer un wrapper fonctionnel et teste pour UN service externe. Lire la documentation technique (deja recherchee), implementer l'integration, tester avec les vraies cles API, et produire un rapport de ce qui doit changer ailleurs dans le code.

## Arguments attendus

- `service_name` : Nom du service (ex: "stripe", "apify", "whisper", "anthropic")
- `research_path` : Chemin vers le fichier research du service (ex: `.claude/resources/researches/stripe.md`)
- `architecture_path` : Chemin vers architecture (ex: `docs/architecture/backend`)
- `backend_path` : Chemin vers le backend (ex: `dev/backend`)

## Process

### 1. Lire les regles, inputs et code existant

**Regles** (via `.claude/resources/rules/index.md`) :
- Obligatoire : bonnes pratiques services (client centralise, types Pydantic, exceptions custom, retry, testing)
- Obligatoire : architecture en couches (role d'un service, conventions de nommage)
- Conseille : bonnes pratiques API (si le service expose ou consomme une API REST)

**Specs et code** :
1. `{backend_path}/../config/config.py` → **EN PREMIER** — pattern Settings et variables disponibles
2. `{research_path}` → documentation complete du service (SDK, endpoints, I/O, limites)
3. `{architecture_path}/business-logic/*.md` → identifier OU ce service est appele
4. `{architecture_path}/schema.md` → schema DB actuel
5. `{backend_path}/app/core/services/` → fichier service existant (stub a remplacer)
6. `{backend_path}/app/core/jobs/` → Jobs qui appellent ce service

### 2. Completer la documentation si necessaire

Si le fichier research manque de details techniques pour implementer :
1. WebSearch pour `{service_name} python sdk {specific_topic}`
2. WebFetch sur la doc officielle (API reference, exemples)
3. Extraire les signatures exactes, types de retour, codes d'erreur
4. **Mettre a jour le fichier research** `{research_path}` avec les infos complementaires

### 3. Implementer le wrapper

**Fichier** : `{backend_path}/app/core/services/{service_name}.py`

Principes :
- **Client centralise** — Une instance/config partagee, pas de recreation a chaque appel
- **Methodes async** — Toutes les methodes sont `async def`
- **Types explicites** — Pydantic models pour les inputs/outputs du service (pas de `dict` bruts)
- **Error handling robuste** — Exceptions custom, retry policy si pertinent, logging
- **Idempotence** — Si le service le supporte (ex: Stripe idempotency keys)
- **Configuration via settings** — Toutes les cles/secrets via `from config.config import settings` (JAMAIS `os.environ` directement)

Structure type :

```python
"""
{Service Name} integration.
Doc: {url_doc_officielle}
"""

from typing import Optional
from pydantic import BaseModel
from config.config import settings

# === Types ===

class {Service}Request(BaseModel):
    """Input pour {operation}."""
    ...

class {Service}Response(BaseModel):
    """Output de {operation}."""
    ...

# === Exceptions ===

class {Service}Error(Exception):
    """Erreur {service_name}."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.status_code = status_code
        super().__init__(message)

# === Client ===

# Acces aux cles TOUJOURS via settings, JAMAIS via os.environ
# Ex: settings.stripe_secret_key, settings.apify_api_token, etc.
{client_init_code}

# === Functions ===

async def {operation}({params}) -> {ReturnType}:
    """
    {Description de l'operation}.
    Appele par : {job/route qui l'appelle}
    """
    {implementation}
```

### 4. Tester avec les vraies cles API

**Fichier** : `{backend_path}/tests/test_services/test_{service_name}.py`

**Approche** : tester directement avec les vraies cles API en mode sandbox/test. Pas de fixtures mock — on verifie les vrais formats de reponse.

#### Tests d'integration (avec cle API)

```python
import pytest
from config.config import settings
from app.core.services.{service_name} import *

@pytest.mark.skipif(not getattr(settings, '{service}_api_key', None), reason="No API key configured")
class TestService{Service}:

    async def test_{operation}_real(self):
        """Appel reel au service en sandbox/test mode."""
        result = await {operation}({test_params})
        assert result is not None
        # Verifier les champs de la reponse reelle
        assert hasattr(result, '{expected_field}')

    async def test_{operation}_error_case(self):
        """Verifier le comportement sur input invalide."""
        with pytest.raises({Service}Error):
            await {operation}({invalid_params})
```

#### Ajustement iteratif

Apres chaque test :
1. Si le format de reponse differe de la doc research → **adapter le code** (types Pydantic, parsing)
2. Si des endpoints supplementaires sont necessaires → les ajouter
3. Si des endpoints prevus sont inutiles → les retirer
4. **Mettre a jour le fichier research** `{research_path}` avec les corrections

L'objectif : le code final reflete la **realite de l'API**, pas les suppositions de la doc.

### 5. Verifier la connexion avec le code existant

Lire les Jobs et Routes qui appellent ce service :
- Verifier que les signatures matchent (params et return types)
- Si le stub avait une signature differente de l'implementation reelle → noter dans le rapport

### 6. Produire le rapport de reconciliation

**Fichier** : `{backend_path}/reports/service-{service_name}.md`

```markdown
# Service Report: {service_name}

## Wrapper
- `{backend_path}/app/core/services/{service_name}.py` — cree
- `{backend_path}/tests/test_services/test_{service_name}.py` — {X}/{Y} tests pass

## Methodes implementees

| Methode | Appelee par | Testee | Status |
|---------|-------------|--------|--------|
| {method} | {job/route} | OK/NON | OK/SIGNATURE CHANGEE |

## Differences vs documentation research

- {Champs de reponse differents de la doc}
- {Endpoints ajoutes/retires}
- {Ou "Aucune difference"}

## Changements requis ailleurs

### Database
- {Table/colonne a ajouter, avec type et justification}
- {Ou "Aucun changement DB necessaire"}

### Models Pydantic
- {Champs a ajouter/modifier dans les models API}

### Routes
- {Nouvelles routes necessaires (ex: webhook endpoint)}
- {Routes existantes a modifier}

### Jobs
- {Jobs dont la signature d'appel au service a change}
- {Imports a mettre a jour}

### Dependencies
- {packages a ajouter dans requirements.txt avec version}

### Configuration
- {Variables d'environnement ajoutees/modifiees}
```

## Output

Fichiers crees/modifies :
- `{backend_path}/app/core/services/{service_name}.py` — Wrapper reel
- `{backend_path}/tests/test_services/test_{service_name}.py` — Tests d'integration
- `{backend_path}/reports/service-{service_name}.md` — Rapport de reconciliation
- `{research_path}` — Mis a jour si des corrections ont ete necessaires

## Regles strictes

- NE PAS modifier les fichiers d'autres services
- NE PAS modifier models.py, migrations, routes ou jobs directement
- TOUT changement necessaire ailleurs va dans le RAPPORT uniquement
- Tester avec les VRAIES cles API (pas de fixtures mock)
- Si la cle API n'est pas configuree, marquer les tests en skip (pas en echec)
- Mettre a jour le fichier research si les reponses reelles different de la doc
