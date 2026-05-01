# Introduction : Streaming et Communication Temps Réel

## Contexte

La communication temps réel est devenue essentielle pour les applications modernes, particulièrement avec l'émergence des LLMs (Large Language Models) qui génèrent des réponses progressivement. Cette section couvre les bonnes pratiques pour implémenter des systèmes de streaming robustes et scalables.

## Cas d'usage principaux

### 1. Streaming LLM
- Génération progressive de texte par IA
- Retour utilisateur instantané (feedback immédiat)
- Support du tool calling (function calling)
- Gestion des interruptions utilisateur

### 2. Notifications temps réel
- Mises à jour de statut
- Notifications système
- Feeds d'activité

### 3. Dashboards et monitoring
- Métriques en temps réel
- Logs streaming
- Alertes instantanées

## Technologies disponibles

| Technologie | Direction | Complexité | Use case principal |
|-------------|-----------|------------|-------------------|
| **Server-Sent Events (SSE)** | Unidirectionnel (S→C) | Faible | Push serveur, LLM streaming |
| **WebSockets** | Bidirectionnel | Moyenne | Chat, gaming, collaboration |
| **Long Polling** | Request/Response | Très faible | Fallback, systèmes legacy |
| **WebRTC** | Peer-to-peer | Haute | Audio/vidéo, gaming P2P |
| **WebTransport** | Bidirectionnel | Haute | Futur (2025+, support limité) |

## Évolution du paysage (2024-2025)

### Renouveau de SSE
SSE connaît un renouveau significatif en 2024-2025 grâce à :
- **HTTP/2 et HTTP/3** : Multiplexing élimine la limite de 6 connexions
- **Performance** : Quasi-identique aux WebSockets pour la plupart des use cases
- **Simplicité** : Moins de code, plus facile à maintenir
- **Adoption LLM** : OpenAI, Anthropic, Google utilisent SSE pour le streaming

### Model Context Protocol (MCP)
Anthropic a introduit MCP en novembre 2024 pour standardiser l'interface entre tools et LLMs. Initialement basé sur SSE, le protocole évolue vers Streamable HTTP.

## Principes fondamentaux

### 1. Choisir selon les besoins fonctionnels
Ne pas choisir selon les performances (quasi-identiques), mais selon :
- Unidirectionnel vs bidirectionnel
- Simplicité vs fonctionnalités avancées
- Compatibilité navigateurs vs features modernes

### 2. Sécurité par défaut
- Utiliser HTTPS/WSS (TLS) en production
- Authentifier via cookies HttpOnly ou tokens
- Valider les origines (CORS pour SSE, Origin check pour WS)

### 3. Résilience
- Gérer les reconnexions automatiques
- Implémenter des timeouts adaptatifs
- Buffer les événements côté client si nécessaire

### 4. Observabilité
- Logger les événements de connexion/déconnexion
- Monitorer le nombre de connexions actives
- Tracer les erreurs de streaming

## Règle d'or

> **"Start simple, scale smart"**
>
> Commencer avec SSE pour tout use case unidirectionnel. Migrer vers WebSockets uniquement si le besoin bidirectionnel devient critique.

## Scope de cette documentation

Cette section se concentre principalement sur **SSE et le streaming LLM**, car c'est le standard de facto pour les applications IA en 2024-2025. Les patterns présentés sont basés sur :
- Analyse d'architectures production (OpenAI, Anthropic)
- Standards W3C (Server-Sent Events specification)
- Retour d'expérience terrain (scaling, debugging)

---

**Prochaine section** : [Choix du Protocole : SSE vs WebSocket](choix-protocole.md)
