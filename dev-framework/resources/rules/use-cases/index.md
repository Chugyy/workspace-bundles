# Use Cases — Infrastructure Event-Driven

## Vue d'ensemble

L'infrastructure repose sur 3 composants qui tournent en permanence :

- **Aggregator** — service public (Dokploy, VPS Hostinger) qui recoit les events via `POST /events`, les stocke en PostgreSQL, et les push au handler
- **Handler** — service prive (Dedibox, pm2) qui recoit les events depuis l'aggregator, matche les rules des PIDs, et execute les actions
- **AI Manager Backend** — gere les conversations (humain <-> agent, agent <-> agent), expose l'API REST

Tout ce qui est construit dans cette infrastructure passe par des **events**. Un event arrive a l'aggregator, est stocke et pousse au handler, le handler matche une rule et execute l'action correspondante.

```
Source externe -> POST /events -> Aggregator (Dokploy) -> push HTTP -> Handler (Dedibox) -> execute action
                                       |                                    |
                                PostgreSQL (events)              PIDs meta.yaml (rules)
                                retry si handler down            actions/ (.sh + .py)
```

**Prerequis** : lire [infrastructure-live.md](infrastructure-live.md) pour connaitre les services qui tournent, leurs URLs, ports, auth, et les CLIs disponibles.

### Separation des responsabilites

| Composant | Ou | Role | Ne fait PAS |
|-----------|-----|------|-------------|
| **Aggregator** | VPS Hostinger (Dokploy) | Ingestion, stockage, push | Execution d actions, matching de rules |
| **Handler** | Dedibox (pm2) | Matching rules, execution actions | Stockage persistant, auth publique |

---

## Les 4 types de choses qu on construit

### 1. Connecteur (Aggregator)

Capturer des events depuis une source externe (webhook, polling, scraping) et les envoyer a l aggregator.

-> [aggregator-connector.md](aggregator-connector.md)

### 2. Action (Handler)

Traiter un event avec de la logique : script Python, appel LLM, appel a des outils lib/, chaining d events.

-> [handler-action.md](handler-action.md)

### 3. Agent IA autonome

Un PID avec un `.claude/CLAUDE.md`, des outils, un espace de travail. Invoque via agent-invoke depuis une action ou un autre agent.

-> [agent-ia.md](agent-ia.md)

### 4. App / Service

Application full-stack (backend + frontend) ou service standalone. Ne passe PAS par le handler — c est un serveur deploye independamment.

-> Chaine classique : `/prd -> /jobs -> /schema -> /api -> /frontend -> /build -> /deploy`

---

## Comment choisir

| Besoin | Type | Exemple |
|--------|------|---------|
| Recevoir des webhooks / poll une API | Connecteur | Ecouter Cal.com, scraper un site |
| Reagir a un event avec de la logique | Action | Envoyer un email, classifier un message |
| Tache complexe avec raisonnement | Agent IA | Analyser des feedbacks, proposer des fixes |
| Serveur qui tourne en permanence (public) | App/Service 4a | Dashboard, API publique |
| Outil interne sur la Dedibox (agents) | Service interne 4b | mp4-transcriber, TTS local |

## Principe fondamental

**Input -> Output.** Tout ce qui passe par le handler est ephemere : un event arrive, une action s execute, elle retourne un resultat (succes ou erreur), elle sort. Pas de serveur, pas de process bloquant, pas de boucle infinie.

Si tu as besoin d un process permanent, c est un service — deploye separement, hors du handler.

---

## Table des matieres

0. [Infrastructure live — services en production](infrastructure-live.md)
1. [Connecteur Aggregator](aggregator-connector.md)
2. [Action Handler](handler-action.md)
3. [Agent IA autonome](agent-ia.md)
4. [Service interne (PM2, sans Docker)](service-interne.md)
5. [Gestion des erreurs](error-handling.md)

***
