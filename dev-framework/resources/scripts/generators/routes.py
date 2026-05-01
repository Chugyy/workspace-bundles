"""
Generates Pydantic models + FastAPI routes + tests from routes-{entity}.json.

JSON format (routes-{entity}.json):
{
  "entity": "note",
  "entity_plural": "notes",
  "prefix": "/api/notes",
  "crud_module": "app.database.crud.note",
  "fields": [
    {"name": "title", "type": "str", "max_length": 200, "required": true},
    {"name": "content", "type": "str", "required": true}
  ],
  "response_fields": [
    {"name": "id", "type": "int"},
    {"name": "title", "type": "str"},
    {"name": "content", "type": "str"},
    {"name": "created_at", "type": "datetime"},
    {"name": "updated_at", "type": "datetime"}
  ],
  "endpoints": [
    {"method": "get", "path": "", "name": "list_notes", "crud_func": "list_notes", "status_code": 200, "paginated": true, "response_model": "NotesListResponse"},
    {"method": "post", "path": "", "name": "create_note", "crud_func": "create_note", "status_code": 201, "body_model": "NoteCreate", "response_model": "NoteResponse"},
    {"method": "patch", "path": "/{note_id}", "name": "update_note", "crud_func": "update_note", "status_code": 200, "body_model": "NoteUpdate", "response_model": "NoteResponse", "path_param": "note_id", "check_empty_body": true},
    {"method": "delete", "path": "/{note_id}", "name": "delete_note", "crud_func": "delete_note", "status_code": 204, "path_param": "note_id"}
  ]
}
"""

import json
from pathlib import Path


def generate_routes(config: dict, backend_path: Path) -> list[str]:
    """Generate Pydantic models + routes + tests for one entity. Returns list of generated file paths."""
    entity = config["entity"]
    entity_plural = config["entity_plural"]
    generated = []

    # Pydantic models
    models_dir = backend_path / "app" / "api" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    models_file = models_dir / f"{entity}.py"
    models_file.write_text(_build_models_py(entity, entity_plural, config["fields"], config["response_fields"], config["endpoints"]))
    generated.append(str(models_file))

    # Routes
    routes_dir = backend_path / "app" / "api" / "routes"
    routes_dir.mkdir(parents=True, exist_ok=True)
    routes_file = routes_dir / f"{entity}.py"
    routes_file.write_text(_build_routes_py(entity, entity_plural, config["prefix"], config["crud_module"], config["endpoints"], config["fields"]))
    generated.append(str(routes_file))

    # Tests
    test_dir = backend_path / "tests" / "test_routes"
    test_dir.mkdir(parents=True, exist_ok=True)
    (test_dir / "__init__.py").touch()
    test_file = test_dir / f"test_{entity}.py"
    test_file.write_text(_build_route_tests(entity, config["prefix"], config["fields"], config["endpoints"]))
    generated.append(str(test_file))

    return generated


def _extract_path_param(path: str) -> str:
    """Extract path param name from a path like '/{note_id}' -> 'note_id'."""
    import re
    match = re.search(r'\{(\w+)\}', path)
    return match.group(1) if match else ""


def _pydantic_field(field: dict, optional: bool = False) -> str:
    t = field["type"]
    if t == "datetime":
        t = "datetime"
    if optional:
        t = f"{t} | None"

    constraints = []
    if field.get("max_length"):
        constraints.append(f"max_length={field['max_length']}")
    if field.get("required") and not optional:
        constraints.append("min_length=1")

    if constraints:
        if optional:
            return f'    {field["name"]}: {t} = Field(None, {", ".join(constraints)})'
        return f'    {field["name"]}: {t} = Field(..., {", ".join(constraints)})'
    if optional:
        return f'    {field["name"]}: {t} = None'
    return f'    {field["name"]}: {t}'


def _build_models_py(entity: str, entity_plural: str, fields: list, response_fields: list, endpoints: list) -> str:
    cap = entity.capitalize()
    cap_plural = entity_plural.capitalize()

    needs_datetime = any(f["type"] == "datetime" for f in response_fields)
    datetime_import = "\nfrom datetime import datetime" if needs_datetime else ""
    has_update = any(e.get("check_empty_body") for e in endpoints)

    lines = [
        f'"""Pydantic models for {entity}."""',
        "",
        "from pydantic import Field" + (", model_validator" if has_update else ""),
        "from app.api.models.common import BaseSchema, PaginationInfo" + datetime_import,
        "",
        "",
        f"class {cap}Create(BaseSchema):",
    ]

    for f in fields:
        lines.append(_pydantic_field(f))

    lines.extend(["", "", f"class {cap}Update(BaseSchema):"])
    for f in fields:
        lines.append(_pydantic_field(f, optional=True))

    if has_update:
        field_checks = ", ".join(f'self.{f["name"]}' for f in fields)
        lines.extend([
            "",
            '    @model_validator(mode="after")',
            "    def check_at_least_one_field(self):",
            f"        if all(v is None for v in [{field_checks}]):",
            '            raise ValueError("At least one field must be provided")',
            "        return self",
        ])

    lines.extend(["", "", f"class {cap}Response(BaseSchema):"])
    for f in response_fields:
        t = "datetime" if f["type"] == "datetime" else f["type"]
        lines.append(f'    {f["name"]}: {t}')

    lines.extend([
        "", "",
        f"class {cap_plural}ListResponse(BaseSchema):",
        f"    data: list[{cap}Response]",
        "    pagination: PaginationInfo",
        "",
    ])

    return "\n".join(lines)


def _build_routes_py(entity: str, entity_plural: str, prefix: str, crud_module: str, endpoints: list, fields: list) -> str:
    cap = entity.capitalize()

    model_imports = set()
    crud_imports = set()
    for ep in endpoints:
        if ep.get("body_model"):
            model_imports.add(ep["body_model"])
        if ep.get("response_model"):
            model_imports.add(ep["response_model"])
        if ep.get("crud_func"):
            crud_imports.add(ep["crud_func"])

    model_imports_str = ", ".join(sorted(model_imports))
    crud_aliases = {func: f"{func}_crud" for func in sorted(crud_imports)} if crud_imports else {}
    crud_imports_str = ", ".join(f"{func} as {alias}" for func, alias in crud_aliases.items())

    has_paginated = any(e.get("paginated") for e in endpoints)

    lines = [
        f'"""Routes for {entity}."""',
        "",
        "from fastapi import APIRouter, HTTPException" + (", Query" if has_paginated else ""),
        f"from app.api.models.{entity} import {model_imports_str}",
        "from app.api.models.common import PaginationInfo",
        f"from {crud_module} import {crud_imports_str}" if crud_imports_str else f"# No direct CRUD imports for {entity} (uses jobs)",
        "from app.database.db import get_db_pool",
        "",
        f'router = APIRouter(prefix="{prefix}", tags=["{entity_plural}"])',
        "",
    ]

    for ep in endpoints:
        method = ep["method"]
        status = ep["status_code"]
        func_name = ep["name"]
        crud_func = ep.get("crud_func")
        crud_call = crud_aliases.get(crud_func, crud_func) if crud_func else None

        decorator_args = []
        if ep.get("response_model"):
            decorator_args.append(f"response_model={ep['response_model']}")
        decorator_args.append(f"status_code={status}")
        if ep.get("response_model"):
            decorator_args.append("response_model_by_alias=True")

        lines.append("")
        lines.append(f'@router.{method}("{ep["path"]}", {", ".join(decorator_args)})')

        params = []
        if ep.get("path_param"):
            params.append(f"{ep['path_param']}: int")
        if ep.get("body_model"):
            params.append(f"body: {ep['body_model']}")
        if ep.get("paginated"):
            params.append("page: int = Query(1, ge=1)")
            params.append("limit: int = Query(20, ge=1, le=100)")

        lines.append(f"async def {func_name}({', '.join(params)}):")
        lines.append("    pool = await get_db_pool()")

        if not crud_call:
            # Job-based or special endpoint — generate skeleton
            job_func = ep.get("job_func", func_name)
            lines.extend([
                f"    # TODO: implement {func_name} (calls job: {job_func})",
                "    raise HTTPException(status_code=501, detail=\"Not implemented\")",
            ])
        elif method == "get" and ep.get("paginated"):
            lines.extend([
                f"    all_items = await {crud_call}(pool)",
                "    total = len(all_items)",
                "    start = (page - 1) * limit",
                "    items = all_items[start:start + limit]",
                "    total_pages = (total + limit - 1) // limit if total > 0 else 0",
                f"    return {ep['response_model']}(",
                f"        data=[{cap}Response(**item) for item in items],",
                "        pagination=PaginationInfo(total=total, page=page, limit=limit, total_pages=total_pages),",
                "    )",
            ])
        elif method == "post":
            crud_params = ", ".join(f"body.{f['name']}" for f in fields)
            lines.extend([
                f"    result = await {crud_call}(pool, {crud_params})",
                f"    return {ep['response_model']}(**result)",
            ])
        elif method == "patch":
            path_param = ep.get('path_param', _extract_path_param(ep.get('path', '')))
            crud_kwargs = ", ".join(f"{f['name']}=body.{f['name']}" for f in fields)
            if path_param:
                lines.extend([
                    f"    result = await {crud_call}(pool, {path_param}, {crud_kwargs})",
                ])
            else:
                lines.extend([
                    f"    result = await {crud_call}(pool, {crud_kwargs})",
                ])
            lines.extend([
                "    if result is None:",
                f'        raise HTTPException(status_code=404, detail="{cap} not found")',
                f"    return {ep['response_model']}(**result)",
            ])
        elif method == "delete":
            path_param = ep.get('path_param', _extract_path_param(ep.get('path', '')))
            lines.extend([
                f"    deleted = await {crud_call}(pool, {path_param or 'item_id'})",
                "    if not deleted:",
                f'        raise HTTPException(status_code=404, detail="{cap} not found")',
                "    return None",
            ])

    lines.append("")
    return "\n".join(lines)


def _build_route_tests(entity: str, prefix: str, fields: list, endpoints: list) -> str:
    table = prefix.split("/")[-1]
    create_payload = {f["name"]: f"Test {f['name']}" for f in fields}

    lines = [
        "import pytest",
        "import asyncpg",
        "from httpx import AsyncClient, ASGITransport",
        "from config.config import settings",
        "from app.api.main import app",
        "import app.database.db as db_module",
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
        "    db_module._db_pool = p",
        "    yield p",
        "    async with p.acquire() as conn:",
        f'        await conn.execute("DELETE FROM {table}")',
        "    db_module._db_pool = None",
        "    await p.close()",
        "",
        "",
        "@pytest.fixture",
        "async def client(pool):",
        '    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:',
        "        yield c",
        "",
        "",
    ]

    for ep in endpoints:
        method = ep["method"]

        if method == "post":
            lines.extend([
                f"async def test_{ep['name']}(client: AsyncClient):",
                f"    response = await client.post(\"{prefix}\", json={json.dumps(create_payload)})",
                f"    assert response.status_code == {ep['status_code']}",
                '    assert "id" in response.json()',
                "", "",
                f"async def test_{ep['name']}_validation_empty(client: AsyncClient):",
                f'    response = await client.post("{prefix}", json={{}})',
                "    assert response.status_code == 422",
                "", "",
            ])
        elif method == "get" and ep.get("paginated"):
            lines.extend([
                f"async def test_{ep['name']}_empty(client: AsyncClient):",
                f'    response = await client.get("{prefix}")',
                f"    assert response.status_code == {ep['status_code']}",
                '    assert response.json()["data"] == []',
                "", "",
                f"async def test_{ep['name']}_returns_data(client: AsyncClient):",
                f"    await client.post(\"{prefix}\", json={json.dumps(create_payload)})",
                f'    response = await client.get("{prefix}")',
                '    assert len(response.json()["data"]) >= 1',
                "", "",
            ])
        elif method == "patch":
            first_field = fields[0]
            lines.extend([
                f"async def test_{ep['name']}(client: AsyncClient):",
                f"    created = (await client.post(\"{prefix}\", json={json.dumps(create_payload)})).json()",
                f'    response = await client.{method}(f"{prefix}/{{created[\'id\']}}", json={{"{first_field["name"]}": "Updated"}})',
                f"    assert response.status_code == {ep['status_code']}",
                f'    assert response.json()["{first_field["name"]}"] == "Updated"',
                "", "",
                f"async def test_{ep['name']}_not_found(client: AsyncClient):",
                f'    response = await client.{method}("{prefix}/999999", json={{"{first_field["name"]}": "X"}})',
                "    assert response.status_code == 404",
                "", "",
            ])
        elif method == "delete":
            lines.extend([
                f"async def test_{ep['name']}(client: AsyncClient):",
                f"    created = (await client.post(\"{prefix}\", json={json.dumps(create_payload)})).json()",
                f'    response = await client.{method}(f"{prefix}/{{created[\'id\']}}")',
                f"    assert response.status_code == {ep['status_code']}",
                "", "",
                f"async def test_{ep['name']}_not_found(client: AsyncClient):",
                f'    response = await client.{method}("{prefix}/999999")',
                "    assert response.status_code == 404",
                "", "",
            ])

    return "\n".join(lines)
