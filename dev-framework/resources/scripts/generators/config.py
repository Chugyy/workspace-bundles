"""
Generates .env and config.py from assembly.json.

Reads assembly.json to determine:
- App name, DB credentials
- Whether auth is needed (JWT vars)
- Which service config vars are needed

JSON format — uses assembly.json:
{
  "app_name": "tests-note",
  "has_auth": false,
  "db_user": "postgres",
  "db_password": "",
  "service_config_vars": ["RESEND_API_KEY"]   // optional
}
"""

from pathlib import Path


def generate_config(config: dict, backend_path: Path) -> list[str]:
    """Generate .env and config.py. Returns list of generated file paths."""
    generated = []

    app_name = config["app_name"]
    db_name = f"{app_name}-db"
    db_user = config.get("db_user", "postgres")
    db_password = config.get("db_password", "")
    has_auth = config.get("has_auth", False)
    service_vars = config.get("service_config_vars", [])

    # .env
    env_file = backend_path / "config" / ".env"
    env_file.parent.mkdir(parents=True, exist_ok=True)
    env_file.write_text(_build_env(app_name, db_name, db_user, db_password, has_auth, service_vars))
    generated.append(str(env_file))

    # config.py
    config_file = backend_path / "config" / "config.py"
    config_file.write_text(_build_config_py(app_name, db_name, db_user, has_auth, service_vars))
    generated.append(str(config_file))

    return generated


def _build_env(app_name: str, db_name: str, db_user: str, db_password: str, has_auth: bool, service_vars: list) -> str:
    lines = [
        f'APP_NAME="{app_name}"',
        "DEBUG=true",
        "HOST=0.0.0.0",
        "PORT=8000",
        "PRODUCTION=false",
        "",
        f"DB_HOST=localhost",
        f"DB_PORT=5432",
        f"DB_NAME={db_name}",
        f"DB_USER={db_user}",
        f"DB_PASSWORD={db_password}",
        "",
        "FRONTEND_URL=http://localhost:3000",
    ]

    if has_auth:
        lines.extend([
            "",
            "JWT_SECRET_KEY=change-this-in-production",
            "JWT_ALGORITHM=HS256",
            "JWT_EXPIRATION_HOURS=24",
        ])

    if service_vars:
        lines.append("")
        for var in service_vars:
            lines.append(f"{var}=")

    lines.append("")
    return "\n".join(lines)


def _build_config_py(app_name: str, db_name: str, db_user: str, has_auth: bool, service_vars: list) -> str:
    lines = [
        "from pydantic import Field",
        "from pydantic_settings import BaseSettings",
        "import pathlib",
        "from dotenv import load_dotenv",
        "",
        'env_path = pathlib.Path(__file__).parent / ".env"',
        "load_dotenv(env_path)",
        "",
        "",
        "class Settings(BaseSettings):",
        f'    app_name: str = Field("{app_name}", env="APP_NAME")',
        '    debug: bool = Field(True, env="DEBUG")',
        '    host: str = Field("0.0.0.0", env="HOST")',
        '    port: int = Field(8000, env="PORT")',
        '    production: bool = Field(False, env="PRODUCTION")',
        "",
        '    db_host: str = Field("localhost", env="DB_HOST")',
        '    db_port: int = Field(5432, env="DB_PORT")',
        f'    db_name: str = Field("{db_name}", env="DB_NAME")',
        f'    db_user: str = Field("{db_user}", env="DB_USER")',
        '    db_password: str = Field("", env="DB_PASSWORD")',
        "",
        '    frontend_url: str = Field("http://localhost:3000", env="FRONTEND_URL")',
    ]

    if has_auth:
        lines.extend([
            "",
            '    jwt_secret_key: str = Field("change-this", env="JWT_SECRET_KEY")',
            '    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")',
            '    jwt_expiration_hours: int = Field(24, env="JWT_EXPIRATION_HOURS")',
        ])

    if service_vars:
        lines.append("")
        for var in service_vars:
            attr = var.lower()
            lines.append(f'    {attr}: str = Field("", env="{var}")')

    lines.extend([
        "",
        "    class Config:",
        '        env_file_encoding = "utf-8"',
        "",
        "settings = Settings()",
        "",
    ])

    return "\n".join(lines)
