"""
Generates models.py (SQLAlchemy) + 001_initial_schema.sql from db.json.

JSON format (db.json):
{
  "tables": [
    {
      "name": "notes",
      "columns": [
        {"name": "id", "sql_type": "BIGSERIAL", "sa_type": "BigInteger", "primary_key": true},
        {"name": "title", "sql_type": "VARCHAR(255)", "sa_type": "String(255)", "nullable": false},
        {"name": "content", "sql_type": "TEXT", "sa_type": "Text", "nullable": false},
        {"name": "created_at", "sql_type": "TIMESTAMPTZ", "sa_type": "DateTime(timezone=True)", "nullable": false, "default_sql": "NOW()", "default_sa": "func.now()"},
        {"name": "updated_at", "sql_type": "TIMESTAMPTZ", "sa_type": "DateTime(timezone=True)", "nullable": false, "default_sql": "NOW()", "default_sa": "func.now()", "onupdate_sa": "func.now()"}
      ],
      "checks": [
        {"name": "ck_notes_title_not_empty", "sql": "TRIM(title) != ''"}
      ],
      "unique_constraints": [
        {"name": "uq_users_email", "columns": "email"},
        {"name": "uq_tags_name_lower", "columns": "LOWER(name)", "type": "unique_index"}
      ],
      "foreign_keys": [
        {"column": "user_id", "references": "users(id)", "on_delete": "CASCADE"}
      ],
      "composite_pk": ["note_id", "tag_id"],
      "indexes": [
        {"name": "idx_notes_created_at", "columns": "created_at DESC"}
      ]
    }
  ]
}
"""

from pathlib import Path
from datetime import datetime


def generate_db(config: dict, backend_path: Path) -> list[str]:
    """Generate models.py + migration SQL. Returns list of generated file paths."""
    tables = config["tables"]
    generated = []

    # Migration SQL
    migration_dir = backend_path / "app" / "database" / "migrations"
    migration_dir.mkdir(parents=True, exist_ok=True)
    migration_file = migration_dir / "001_initial_schema.sql"
    migration_file.write_text(_build_migration_sql(tables))
    generated.append(str(migration_file))

    # Models.py
    models_file = backend_path / "app" / "database" / "models.py"
    models_file.write_text(_build_models_py(tables))
    generated.append(str(models_file))

    return generated


def _build_migration_sql(tables: list) -> str:
    parts = [f"-- Migration 001: Initial Schema\n-- Generated: {datetime.now().isoformat()}\n"]

    for table in tables:
        cols = []
        has_composite_pk = bool(table.get("composite_pk"))

        for col in table["columns"]:
            line = f'    {col["name"]} {col["sql_type"]}'
            if col.get("primary_key") and not has_composite_pk:
                line += " PRIMARY KEY"
            if not col.get("nullable", True) and not col.get("primary_key"):
                line += " NOT NULL"
            # Foreign keys inline
            if col.get("references"):
                line += f' REFERENCES {col["references"]}'
                if col.get("on_delete"):
                    line += f' ON DELETE {col["on_delete"]}'
            if col.get("default_sql"):
                line += f' DEFAULT {col["default_sql"]}'
            cols.append(line)

        # Foreign keys (separate section)
        for fk in table.get("foreign_keys", []):
            col_name = fk["column"]
            # Find the column and add REFERENCES inline — skip if already handled
            for i, c in enumerate(cols):
                if c.strip().startswith(f'{col_name} ') and "REFERENCES" not in c:
                    cols[i] += f' REFERENCES {fk["references"]}'
                    if fk.get("on_delete"):
                        cols[i] += f' ON DELETE {fk["on_delete"]}'
                    break

        # Composite primary key
        if has_composite_pk:
            pk_cols = ", ".join(table["composite_pk"])
            cols.append(f"    PRIMARY KEY ({pk_cols})")

        # Unique constraints (inline in table)
        for uc in table.get("unique_constraints", []):
            if uc.get("type") == "unique_index":
                pass  # handled as index below
            else:
                cols.append(f'    CONSTRAINT {uc["name"]} UNIQUE ({uc["columns"]})')

        # Check constraints
        for check in table.get("checks", []):
            cols.append(f'    CONSTRAINT {check["name"]} CHECK ({check["sql"]})')

        parts.append(f'CREATE TABLE IF NOT EXISTS {table["name"]} (\n')
        parts.append(",\n".join(cols))
        parts.append("\n);\n")

        # Unique indexes (functional like LOWER())
        for uc in table.get("unique_constraints", []):
            if uc.get("type") == "unique_index":
                parts.append(f'CREATE UNIQUE INDEX IF NOT EXISTS {uc["name"]} ON {table["name"]}({uc["columns"]});\n')

        # Regular indexes
        for idx in table.get("indexes", []):
            idx_type = f' USING {idx["type"]}' if idx.get("type") else ""
            parts.append(f'CREATE INDEX IF NOT EXISTS {idx["name"]} ON {table["name"]}{idx_type}({idx["columns"]});\n')

        parts.append("")

    return "\n".join(parts)


def _build_models_py(tables: list) -> str:
    sa_imports = {"Column", "Index"}

    for table in tables:
        for col in table["columns"]:
            base = col["sa_type"].split("(")[0]
            sa_imports.add(base)
            if col.get("default_sa") and "func" in col["default_sa"]:
                sa_imports.add("func")
        if table.get("checks"):
            sa_imports.add("CheckConstraint")

    lines = [
        '"""SQLAlchemy models (documentation + migration reference)."""',
        "",
        f"from sqlalchemy import {', '.join(sorted(sa_imports))}",
        "from sqlalchemy.orm import DeclarativeBase",
        "",
        "",
        "class Base(DeclarativeBase):",
        "    pass",
    ]

    for table in tables:
        class_name = "".join(word.capitalize() for word in table["name"].rstrip("s").split("_"))
        lines.extend(["", "", f"class {class_name}(Base):", f'    __tablename__ = "{table["name"]}"', ""])

        for col in table["columns"]:
            args = [col["sa_type"]]
            kwargs = []
            if col.get("primary_key"):
                kwargs.append("primary_key=True")
            if not col.get("nullable", True) and not col.get("primary_key"):
                kwargs.append("nullable=False")
            if col.get("default_sa"):
                kwargs.append(f"default={col['default_sa']}")
            if col.get("onupdate_sa"):
                kwargs.append(f"onupdate={col['onupdate_sa']}")
            lines.append(f"    {col['name']} = Column({', '.join(args + kwargs)})")

        table_args = []
        for check in table.get("checks", []):
            table_args.append(f'        CheckConstraint("{check["sql"]}", name="{check["name"]}")')
        # Indexes are created in the migration SQL, not in SQLAlchemy models
        # (SQLAlchemy Index doesn't support DESC/ASC in column names)

        if table_args:
            lines.extend(["", "    __table_args__ = ("])
            for item in table_args:
                lines.append(f"{item},")
            lines.append("    )")

    lines.append("")
    return "\n".join(lines)
