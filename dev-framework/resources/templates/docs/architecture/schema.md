# Database Schema — PostgreSQL

Date: {YYYY-MM-DD}

## Overview

- Tables : {N}
- Foreign Keys : {N}
- Indexes : {N}

---

## Tables

### {table_name}

**Entity:** {EntityName}
**Description:** {1-2 phrases}

```sql
CREATE TABLE {table_name} (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    {column}   {TYPE} {CONSTRAINTS},
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Relations:**
- `{fk_column}` → `{ref_table}.{ref_column}` ({ON DELETE action})

**Indexes:**
```sql
CREATE INDEX {index_name} ON {table_name}({columns});
```

---

## Relations Diagram (ASCII)

```
{parent}
  ├─── {child1}  (1:N)
  └─── {child2}  (1:1)
```

---

## Indexes Summary

| Table | Column(s) | Type | Purpose |
|-------|-----------|------|---------|
| {table} | {column} | {UNIQUE/INDEX} | {purpose} |

## Foreign Keys Summary

| From | Column | To | ON DELETE |
|------|--------|----|-----------|
| {child} | {fk} | {parent}.{col} | {CASCADE} |

## Migration Order

1. {table_1}
2. {table_2} (FK → table_1)

## Auto-verification

- Tables : {N}
- CRUD verifiees : {X}/{X}
- Erreurs bloquantes : {N}
