# {Project Name} — Entites metier

## Vue d'ensemble

{N} entites, organisees en {M} domaines fonctionnels.

```
DOMAIN: {Domaine 1}
  {Entity1} ─────┬── {Entity2} (1:N)
                  ├── {Entity3} (1:1)
                  └── {Entity4} (1:1)

DOMAIN: {Domaine 2}
  {Entity5} (N par {Entity1})
```

## Entites

### {EntityName}
{Description en 1-2 phrases. Role dans le systeme.}
- Relations : {liste des relations avec cardinalite}
