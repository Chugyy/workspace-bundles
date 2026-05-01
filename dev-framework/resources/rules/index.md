# Index des Regles et Bonnes Pratiques

## Architecture Backend

- [Architecture en couches](backend-architecture-context.md) — Couches (CRUD/Jobs/Services/Utils), regles de decision, conventions de nommage, structure fichiers

## Business Logic

- [Jobs](best-practises-business-logic/jobs.md) — Orchestration metier, jobs primaires/secondaires, separation des couches, extraction de code duplique
- [CRUD](best-practises-business-logic/crud.md) — Operations DB atomiques, parameterized queries, asyncpg patterns
- [Services](best-practises-business-logic/services.md) — Wrappers API externes, client centralise, types Pydantic, retry, testing

## API REST

- [Index API](best-practises-build-api/index.md) — Principes REST, methodes HTTP, URLs, pagination, erreurs, securite, Pydantic models

## Base de Donnees

- [Index Database](best-practises-build-databases/index.md) — Schema, normalisation, indexation, CRUD SQL, securite, performance

## Frontend

- [Index Frontend](best-practises-build-frontend/index.md) — Design system Tailwind, theming, typographie, drag-and-drop, erreurs courantes

## Streaming et Temps Reel

- [Index Streaming](best-practises-streaming-realtime/index.md) — SSE vs WebSocket, architecture, heartbeats, tool calling, HTTP/2

## Use Cases — Infrastructure Event-Driven

- [Index Use Cases](use-cases/index.md) — Vue d'ensemble des 4 types de choses qu'on construit
- [Connecteur Aggregator](use-cases/aggregator-connector.md) — Capturer des events depuis une source externe
- [Action Proxy](use-cases/proxy-action.md) — Traiter un event (structure .sh/.py, acces outils, chaining)
- [Agent IA autonome](use-cases/agent-ia.md) — PID avec CLAUDE.md, invoque via agent-invoke
- [Gestion des erreurs](use-cases/error-handling.md) — Erreurs → events → tickets dashboard
