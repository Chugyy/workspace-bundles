"""
Generates service wrapper skeletons from services.json.

JSON format (services.json):
{
  "services": [
    {
      "name": "email_service",
      "description": "Email transactional service via Resend",
      "config_vars": ["RESEND_API_KEY"],
      "methods": [
        {
          "name": "send_email",
          "description": "Send a transactional email",
          "params": [{"name": "to", "type": "str"}, {"name": "subject", "type": "str"}],
          "returns": "dict",
          "is_async": true
        }
      ],
      "pip_packages": ["resend"]
    }
  ]
}
"""

from pathlib import Path


def generate_service_skeletons(config: dict, backend_path: Path) -> list[str]:
    """Generate service skeletons + test stubs. Returns list of generated file paths."""
    services = config.get("services", [])
    if not services:
        return []

    generated = []

    for service in services:
        name = service["name"]

        # Service file
        svc_dir = backend_path / "app" / "core" / "services"
        svc_dir.mkdir(parents=True, exist_ok=True)
        (svc_dir / "__init__.py").touch()
        svc_file = svc_dir / f"{name}.py"
        svc_file.write_text(_build_service_py(service))
        generated.append(str(svc_file))

        # Test file
        test_dir = backend_path / "tests" / "test_services"
        test_dir.mkdir(parents=True, exist_ok=True)
        (test_dir / "__init__.py").touch()
        test_file = test_dir / f"test_{name}.py"
        test_file.write_text(_build_service_test(service))
        generated.append(str(test_file))

    # Update requirements.txt
    all_packages = set()
    for service in services:
        all_packages.update(service.get("pip_packages", []))

    if all_packages:
        req_file = backend_path / "requirements.txt"
        if req_file.exists():
            existing = req_file.read_text()
            new_packages = [p for p in all_packages if p not in existing]
            if new_packages:
                with open(req_file, "a") as f:
                    for pkg in new_packages:
                        f.write(f"\n{pkg}")

    return generated


def _build_service_py(service: dict) -> str:
    lines = [
        f'"""{service["description"]}."""',
        "",
        "from config.config import settings",
        "from config.logger import logger",
        "",
    ]

    for var in service.get("config_vars", []):
        lines.extend([
            f"# Set in config/.env: {var}=your-key-here",
            f"_{var.lower()} = getattr(settings, '{var.lower()}', None)",
            "",
        ])

    lines.append("")

    for method in service["methods"]:
        if isinstance(method, str):
            method = {"name": method, "params": [], "returns": "dict", "description": f"{method}", "is_async": True}
        is_async = method.get("is_async", True)
        params = ", ".join(f'{p["name"]}: {p["type"]}' for p in method.get("params", []))
        prefix = "async " if is_async else ""

        lines.extend([
            f'{prefix}def {method["name"]}({params}) -> {method.get("returns", "dict")}:',
            f'    """{method.get("description", method["name"])}."""',
            "    # TODO: Implement actual API call",
            "    raise NotImplementedError",
            "", "",
        ])

    return "\n".join(lines)


def _build_service_test(service: dict) -> str:
    func_names = [m["name"] if isinstance(m, dict) else m for m in service["methods"]]

    lines = [
        "import pytest",
        f"from app.core.services.{service['name']} import {', '.join(func_names)}",
        "",
        "",
    ]

    for method in service["methods"]:
        if isinstance(method, str):
            method = {"name": method, "is_async": True, "description": method}
        is_async = method.get("is_async", True)
        lines.extend([
            f"{'async ' if is_async else ''}def test_{method['name']}():",
            f'    """Test {method.get("description", method["name"])}."""',
            "    # TODO: Implement test",
            "    pytest.skip('Not implemented yet')",
            "", "",
        ])

    return "\n".join(lines)
