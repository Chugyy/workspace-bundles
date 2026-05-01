"""
Generates glue files from assembly.json: main.py, models/__init__.py, conftest.py, pyproject.toml.

JSON format (assembly.json):
{
  "app_name": "tests-note",
  "entities": ["note", "booking"],
  "has_auth": false,
  "models_per_entity": {
    "note": ["NoteCreate", "NoteUpdate", "NoteResponse", "NotesListResponse"]
  }
}
"""

from pathlib import Path


def generate_assembly(config: dict, backend_path: Path) -> list[str]:
    """Generate main.py, models/__init__.py, conftest.py, pyproject.toml. Returns list of generated file paths."""
    generated = []

    # main.py
    main_file = backend_path / "app" / "api" / "main.py"
    main_file.write_text(_build_main_py(config["entities"], config.get("has_auth", False)))
    generated.append(str(main_file))

    # models/__init__.py
    init_file = backend_path / "app" / "api" / "models" / "__init__.py"
    init_file.write_text(_build_models_init(config["entities"], config.get("models_per_entity", {})))
    generated.append(str(init_file))

    # conftest.py
    conftest_file = backend_path / "tests" / "conftest.py"
    conftest_file.write_text(_build_conftest())
    generated.append(str(conftest_file))

    # pyproject.toml
    pyproject_file = backend_path / "pyproject.toml"
    pyproject_file.write_text(_build_pyproject())
    generated.append(str(pyproject_file))

    return generated


def _build_main_py(entities: list, has_auth: bool) -> str:
    route_imports = ["health"]
    if has_auth:
        route_imports.extend(["auth", "users"])
    route_imports.extend(entities)

    lines = [
        "#!/usr/bin/env python3",
        "",
        "import uvicorn",
        "from contextlib import asynccontextmanager",
        "from fastapi import FastAPI",
        "from fastapi.middleware.cors import CORSMiddleware",
        "from config.config import settings",
        "from config.logger import logger",
        f"from app.api.routes import {', '.join(route_imports)}",
        "from app.database.db import init_db, close_db_pool",
        "",
        "",
        "@asynccontextmanager",
        "async def lifespan(app: FastAPI):",
        '    logger.info("Starting application")',
        "    await init_db()",
        "    yield",
        "    await close_db_pool()",
        '    logger.info("Stopping application")',
        "",
        "",
        "app = FastAPI(",
        "    title=settings.app_name,",
        "    debug=settings.debug,",
        "    lifespan=lifespan,",
        "    redirect_slashes=False,",
        ")",
        "",
        "app.add_middleware(",
        "    CORSMiddleware,",
        '    allow_origins=["*"],',
        "    allow_credentials=True,",
        '    allow_methods=["*"],',
        '    allow_headers=["*"],',
        ")",
        "",
    ]

    for route in route_imports:
        lines.append(f"app.include_router({route}.router)")

    lines.extend([
        "",
        "",
        'if __name__ == "__main__":',
        '    uvicorn.run("app.api.main:app", host=settings.host, port=settings.port, reload=settings.debug)',
        "",
    ])

    return "\n".join(lines)


def _build_models_init(entities: list, models_per_entity: dict) -> str:
    lines = [
        "# app/api/models/__init__.py",
        "",
        "from app.api.models.common import (",
        "    BaseSchema,",
        "    PaginationInfo,",
        "    ErrorResponse,",
        "    MessageResponse,",
        "    IdResponse,",
        ")",
        "",
    ]

    for entity in entities:
        models = models_per_entity.get(entity, [])
        if models:
            lines.append(f"from app.api.models.{entity} import {', '.join(models)}")

    lines.extend([
        "",
        "__all__ = [",
        '    "BaseSchema",',
        '    "PaginationInfo",',
        '    "ErrorResponse",',
        '    "MessageResponse",',
        '    "IdResponse",',
    ])

    for entity in entities:
        for model in models_per_entity.get(entity, []):
            lines.append(f'    "{model}",')

    lines.extend(["]", ""])
    return "\n".join(lines)


def _build_conftest() -> str:
    return '"""Global pytest configuration."""\n\nimport pytest\n\n\ndef pytest_configure(config):\n    config.addinivalue_line("markers", "asyncio: mark test as requiring asyncio")\n    config.addinivalue_line("markers", "integration: mark test as integration test")\n'


def _build_pyproject() -> str:
    return '[tool.pytest.ini_options]\nasyncio_mode = "auto"\n'
