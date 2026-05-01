"""
Generates job skeleton files from jobs-{entity}.json.

JSON format (jobs-{entity}.json):
{
  "entity": "booking",
  "jobs": [
    {
      "name": "create_booking",
      "description": "Validates availability, creates booking, sends confirmation",
      "params": [
        {"name": "pool", "type": "asyncpg.Pool"},
        {"name": "property_id", "type": "int"}
      ],
      "returns": "dict",
      "steps": ["1. Validate dates", "2. Check availability", "3. Create booking"],
      "imports_crud": ["create_booking_crud"],
      "imports_services": ["email_service"],
      "imports_utils": ["validate_booking_dates"]
    }
  ]
}
"""

from pathlib import Path


def generate_job_skeletons(config: dict, backend_path: Path) -> list[str]:
    """Generate job skeletons + test stubs. Returns list of generated file paths."""
    entity = config["entity"]
    jobs = config.get("jobs", [])
    if not jobs:
        return []

    generated = []

    # Jobs file
    jobs_dir = backend_path / "app" / "core" / "jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    (jobs_dir / "__init__.py").touch()
    jobs_file = jobs_dir / f"{entity}.py"
    jobs_file.write_text(_build_jobs_py(entity, jobs))
    generated.append(str(jobs_file))

    # Tests
    test_dir = backend_path / "tests" / "test_jobs"
    test_dir.mkdir(parents=True, exist_ok=True)
    (test_dir / "__init__.py").touch()
    test_file = test_dir / f"test_{entity}.py"
    test_file.write_text(_build_job_tests(entity, jobs))
    generated.append(str(test_file))

    return generated


def _build_jobs_py(entity: str, jobs: list) -> str:
    all_crud = set()
    all_services = set()
    all_utils = set()

    for job in jobs:
        all_crud.update(job.get("imports_crud", []))
        all_services.update(job.get("imports_services", []))
        all_utils.update(job.get("imports_utils", []))

    lines = [f'"""Jobs (business orchestration) for {entity}."""', "", "import asyncpg"]

    if all_crud:
        lines.append(f"from app.database.crud.{entity} import {', '.join(sorted(all_crud))}")
    if all_services:
        for svc in sorted(all_services):
            lines.append(f"from app.core.services.{svc} import {svc}")
    if all_utils:
        lines.append(f"from app.core.utils.{entity} import {', '.join(sorted(all_utils))}")

    lines.extend(["", ""])

    for job in jobs:
        params = ", ".join(f'{p["name"]}: {p["type"]}' for p in job["params"])
        lines.extend([
            f'async def {job["name"]}({params}) -> {job["returns"]}:',
            f'    """',
            f'    {job["description"]}',
            "",
            "    Steps:",
        ])
        for step in job.get("steps", []):
            lines.append(f"    {step}")
        lines.extend([
            '    """',
            "    # TODO: Implement job logic",
            "    raise NotImplementedError",
            "", "",
        ])

    return "\n".join(lines)


def _build_job_tests(entity: str, jobs: list) -> str:
    func_names = [j["name"] for j in jobs]

    lines = [
        "import pytest",
        "import asyncpg",
        "from config.config import settings",
        f"from app.core.jobs.{entity} import {', '.join(func_names)}",
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
        "    await p.close()",
        "",
        "",
    ]

    for job in jobs:
        lines.extend([
            f"async def test_{job['name']}(pool):",
            f'    """Test {job["description"]}"""',
            "    # TODO: Implement test with real CRUD + services",
            "    pytest.skip('Not implemented yet')",
            "", "",
        ])

    return "\n".join(lines)
