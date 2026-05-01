"""
Generates CRUD functions + tests from crud-{entity}.json.

JSON format (crud-{entity}.json):
{
  "entity": "note",
  "table": "notes",
  "functions": [
    {
      "name": "list_notes",
      "type": "list",
      "sql": "SELECT * FROM notes ORDER BY created_at DESC",
      "params": [],
      "returns": "list[dict]"
    },
    {
      "name": "create_note",
      "type": "create",
      "sql": "INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *",
      "params": [
        {"name": "title", "type": "str"},
        {"name": "content", "type": "str"}
      ],
      "returns": "dict"
    },
    {
      "name": "update_note",
      "type": "update",
      "sql": "UPDATE notes SET title = COALESCE($2, title), content = COALESCE($3, content), updated_at = NOW() WHERE id = $1 RETURNING *",
      "params": [
        {"name": "note_id", "type": "int"},
        {"name": "title", "type": "str | None", "default": "None"},
        {"name": "content", "type": "str | None", "default": "None"}
      ],
      "returns": "dict | None",
      "id_param": "note_id"
    },
    {
      "name": "delete_note",
      "type": "delete",
      "sql": "DELETE FROM notes WHERE id = $1 RETURNING id",
      "params": [
        {"name": "note_id", "type": "int"}
      ],
      "returns": "bool",
      "id_param": "note_id"
    }
  ]
}
"""

from pathlib import Path


def generate_crud(config: dict, backend_path: Path) -> list[str]:
    """Generate CRUD file + tests for one entity. Returns list of generated file paths."""
    entity = config["entity"]
    table = config.get("table") or config.get("tables", [entity + "s"])[0] if isinstance(config.get("tables"), list) else config.get("table", entity + "s")
    functions = config["functions"]
    generated = []

    # CRUD file
    crud_dir = backend_path / "app" / "database" / "crud"
    crud_dir.mkdir(parents=True, exist_ok=True)
    crud_file = crud_dir / f"{entity}.py"
    crud_file.write_text(_build_crud_py(entity, functions))
    generated.append(str(crud_file))

    # Test file
    test_dir = backend_path / "tests" / "test_crud"
    test_dir.mkdir(parents=True, exist_ok=True)
    (test_dir / "__init__.py").touch()
    test_file = test_dir / f"test_{entity}.py"
    test_file.write_text(_build_crud_tests(entity, table, functions))
    generated.append(str(test_file))

    return generated


def _build_crud_py(entity: str, functions: list) -> str:
    lines = [f'"""CRUD operations for {entity}."""', "", "import asyncpg", "", ""]

    for func in functions:
        params = ["pool: asyncpg.Pool"]
        for p in func["params"]:
            if p.get("default") is not None:
                params.append(f'{p["name"]}: {p["type"]} = {p["default"]}')
            else:
                params.append(f'{p["name"]}: {p["type"]}')

        lines.append(f'async def {func["name"]}({", ".join(params)}) -> {func["returns"]}:')
        lines.append("    async with pool.acquire() as conn:")

        param_names = [p["name"] for p in func["params"]]

        if func["type"] == "list":
            lines.append(f'        rows = await conn.fetch("{func["sql"]}")')
            lines.append("        return [dict(r) for r in rows]")

        elif func["type"] == "create":
            lines.append(f'        row = await conn.fetchrow(')
            lines.append(f'            "{func["sql"]}",')
            for name in param_names:
                lines.append(f"            {name},")
            lines.append("        )")
            lines.append("        return dict(row)")

        elif func["type"] == "update":
            lines.append(f'        row = await conn.fetchrow(')
            lines.append(f'            "{func["sql"]}",')
            for name in param_names:
                lines.append(f"            {name},")
            lines.append("        )")
            lines.append("        return dict(row) if row else None")

        elif func["type"] == "delete":
            lines.append(f'        row = await conn.fetchrow(')
            lines.append(f'            "{func["sql"]}",')
            for name in param_names:
                lines.append(f"            {name},")
            lines.append("        )")
            lines.append("        return row is not None")

        lines.extend(["", ""])

    return "\n".join(lines)


def _build_crud_tests(entity: str, table: str, functions: list) -> str:
    func_names = [f["name"] for f in functions]
    create_func = next((f for f in functions if f["type"] == "create"), None)
    create_params = ""
    if create_func:
        create_params = ", ".join(f'{p["name"]}="{p["name"].title()} test"' for p in create_func["params"])

    lines = [
        "import pytest",
        "import asyncpg",
        "from config.config import settings",
        f"from app.database.crud.{entity} import {', '.join(func_names)}",
        "",
        "",
        "@pytest.fixture",
        "async def pool():",
        "    p = await asyncpg.create_pool(",
        "        host=settings.db_host,",
        "        port=settings.db_port,",
        "        database=settings.db_name,",
        "        user=settings.db_user,",
        '        password=settings.db_password or "",',
        "        min_size=1,",
        "        max_size=3,",
        "    )",
        "    yield p",
        "    async with p.acquire() as conn:",
        f'        await conn.execute("DELETE FROM {table}")',
        "    await p.close()",
        "",
        "",
    ]

    for func in functions:
        if func["type"] == "list":
            lines.extend([
                f"async def test_{func['name']}_empty(pool):",
                f"    results = await {func['name']}(pool)",
                "    assert results == []",
                "", "",
            ])
            if create_func:
                lines.extend([
                    f"async def test_{func['name']}_returns_all(pool):",
                    f"    await {create_func['name']}(pool, {create_params})",
                    f"    results = await {func['name']}(pool)",
                    "    assert len(results) >= 1",
                    "", "",
                ])

        elif func["type"] == "create":
            param_str = ", ".join(f'{p["name"]}="{p["name"].title()} value"' for p in func["params"])
            lines.extend([
                f"async def test_{func['name']}(pool):",
                f"    result = await {func['name']}(pool, {param_str})",
                '    assert result["id"] is not None',
            ])
            for p in func["params"]:
                lines.append(f'    assert result["{p["name"]}"] == "{p["name"].title()} value"')
            lines.extend(["", ""])

        elif func["type"] == "update":
            if create_func:
                updatable = [p for p in func["params"] if p.get("default") is not None]
                if updatable:
                    p = updatable[0]
                    lines.extend([
                        f"async def test_{func['name']}(pool):",
                        f"    created = await {create_func['name']}(pool, {create_params})",
                        f'    updated = await {func["name"]}(pool, created["id"], {p["name"]}="Updated")',
                        "    assert updated is not None",
                        f'    assert updated["{p["name"]}"] == "Updated"',
                        "", "",
                    ])
                lines.extend([
                    f"async def test_{func['name']}_not_found(pool):",
                    f'    result = await {func["name"]}(pool, {func.get("id_param", "id")}=999999, {updatable[0]["name"]}="X")' if updatable else f'    result = await {func["name"]}(pool, 999999)',
                    "    assert result is None",
                    "", "",
                ])

        elif func["type"] == "delete":
            if create_func:
                lines.extend([
                    f"async def test_{func['name']}(pool):",
                    f"    created = await {create_func['name']}(pool, {create_params})",
                    f'    deleted = await {func["name"]}(pool, created["id"])',
                    "    assert deleted is True",
                    "", "",
                    f"async def test_{func['name']}_not_found(pool):",
                    f'    result = await {func["name"]}(pool, {func.get("id_param", "id")}=999999)',
                    "    assert result is False",
                    "", "",
                ])

    return "\n".join(lines)
