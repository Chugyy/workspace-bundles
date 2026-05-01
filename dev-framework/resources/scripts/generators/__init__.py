"""
Backend code generators — orchestrates all generation from JSON configs.

Usage:
    from generators import build_backend_from_configs
    build_backend_from_configs(configs_path, backend_path)

Or individual generators:
    from generators.database import generate_db
    from generators.crud import generate_crud
    from generators.routes import generate_routes
    from generators.jobs import generate_job_skeletons
    from generators.services import generate_service_skeletons
    from generators.assembly import generate_assembly
    from generators.config import generate_config
"""

import json
from pathlib import Path

from .config import generate_config
from .database import generate_db
from .crud import generate_crud
from .routes import generate_routes
from .jobs import generate_job_skeletons
from .services import generate_service_skeletons
from .assembly import generate_assembly


def build_backend_from_configs(configs_path: Path, backend_path: Path) -> dict:
    """
    Run all generators from JSON configs in order.
    Returns a summary of what was generated.
    """
    configs_path = Path(configs_path)
    backend_path = Path(backend_path)
    summary = {"generated": [], "skipped": []}

    def _load(filename: str) -> dict | None:
        f = configs_path / filename
        if f.exists():
            with open(f) as fh:
                return json.load(fh)
        return None

    # 1. Config (.env + config.py)
    assembly_config = _load("assembly.json")
    if assembly_config:
        files = generate_config(assembly_config, backend_path)
        summary["generated"].extend(files)
        print(f"[config] Generated {len(files)} files")
    else:
        summary["skipped"].append("config (no assembly.json)")

    # 2. Database (models.py + migration)
    db_config = _load("db.json")
    if db_config:
        files = generate_db(db_config, backend_path)
        summary["generated"].extend(files)
        print(f"[database] Generated {len(files)} files")
    else:
        summary["skipped"].append("database (no db.json)")

    # 3. CRUD (per entity)
    for crud_file in sorted(configs_path.glob("crud-*.json")):
        with open(crud_file) as f:
            config = json.load(f)
        files = generate_crud(config, backend_path)
        summary["generated"].extend(files)
        print(f"[crud:{config['entity']}] Generated {len(files)} files")

    # 4. Routes (per entity)
    for routes_file in sorted(configs_path.glob("routes-*.json")):
        with open(routes_file) as f:
            config = json.load(f)
        files = generate_routes(config, backend_path)
        summary["generated"].extend(files)
        print(f"[routes:{config['entity']}] Generated {len(files)} files")

    # 5. Job skeletons (per entity, optional)
    for jobs_file in sorted(configs_path.glob("jobs-*.json")):
        with open(jobs_file) as f:
            config = json.load(f)
        files = generate_job_skeletons(config, backend_path)
        summary["generated"].extend(files)
        print(f"[jobs:{config['entity']}] Generated {len(files)} files")

    # 6. Service skeletons (optional)
    services_config = _load("services.json")
    if services_config:
        files = generate_service_skeletons(services_config, backend_path)
        summary["generated"].extend(files)
        print(f"[services] Generated {len(files)} files")

    # 7. Assembly (main.py, __init__.py, conftest, pyproject)
    if assembly_config:
        files = generate_assembly(assembly_config, backend_path)
        summary["generated"].extend(files)
        print(f"[assembly] Generated {len(files)} files")

    print(f"\nTotal: {len(summary['generated'])} files generated")
    if summary["skipped"]:
        print(f"Skipped: {', '.join(summary['skipped'])}")

    return summary
