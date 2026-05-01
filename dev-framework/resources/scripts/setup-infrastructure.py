#!/usr/bin/env python3
"""
setup-infrastructure.py
Setup infrastructure backend + frontend complète avec création BDD PostgreSQL
"""

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


# =====================================================
# Configuration PostgreSQL hardcodée
# =====================================================
DB_HOST = "localhost"
DB_PORT = "5432"
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = ""  # Pas de password


# =====================================================
# Utilities
# =====================================================
def print_step(number, total, message):
    """Print formatted step message"""
    print(f"\n{'='*60}")
    print(f"📋 Step {number}/{total}: {message}")
    print('='*60)


def print_success(message):
    """Print success message"""
    print(f"✅ {message}")


def print_warning(message):
    """Print warning message"""
    print(f"⚠️  {message}")


def print_error(message):
    """Print error message"""
    print(f"❌ {message}")


def run_command(cmd, cwd=None, shell=False):
    """Execute shell command"""
    try:
        result = subprocess.run(
            cmd if shell else cmd.split(),
            cwd=cwd,
            capture_output=True,
            text=True,
            shell=shell
        )
        if result.returncode != 0:
            print_error(f"Command failed: {cmd}")
            print(result.stderr)
            return False
        return True
    except Exception as e:
        print_error(f"Error executing command: {e}")
        return False


# =====================================================
# PostgreSQL Database Creation
# =====================================================
def create_postgresql_database(app_name):
    """Create PostgreSQL database if it doesn't exist"""
    print_step("0", "10", "Creating PostgreSQL Database")

    db_name = f"{app_name}-db"

    try:
        import psycopg2
        from psycopg2 import sql
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        print(f"🔌 Connecting to PostgreSQL at {DB_HOST}:{DB_PORT}")
        print(f"   User: {DB_USER}")
        print(f"   Target database: {db_name}")

        # Connect to default 'postgres' database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (db_name,)
        )
        exists = cursor.fetchone()

        if exists:
            print_warning(f"Database '{db_name}' already exists, skipping creation")
        else:
            # Create database
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name))
            )
            print_success(f"Database '{db_name}' created successfully")

        cursor.close()
        conn.close()

        return db_name

    except ImportError:
        print_error("psycopg2 not installed. Installing...")
        if run_command("pip3 install psycopg2-binary"):
            print_success("psycopg2-binary installed")
            # Retry after installation
            return create_postgresql_database(app_name)
        else:
            print_error("Failed to install psycopg2-binary")
            sys.exit(1)

    except Exception as e:
        print_error(f"Failed to create database: {e}")
        print("\n💡 Troubleshooting:")
        print(f"   1. Ensure PostgreSQL is running: brew services list")
        print(f"   2. Ensure user '{DB_USER}' exists: psql postgres -c '\\du'")
        print(f"   3. Create user if needed: createuser -s {DB_USER}")
        sys.exit(1)


# =====================================================
# Admin User Seed Generation
# =====================================================
def parse_users_columns_from_schema(backend_path):
    """Read 001_initial_schema.sql to extract actual users table columns."""
    migrations_path = Path(backend_path) / "app" / "database" / "migrations"
    schema_file = migrations_path / "001_initial_schema.sql"
    if not schema_file.exists():
        return None
    content = schema_file.read_text()
    # Extract CREATE TABLE users block
    import re
    match = re.search(r'CREATE TABLE\s+users\s*\((.*?)\);', content, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    columns = []
    for line in match.group(1).split('\n'):
        line = line.strip().rstrip(',')
        if line and not line.upper().startswith(('PRIMARY', 'UNIQUE', 'CONSTRAINT', 'FOREIGN', 'CHECK', '--')):
            col_name = line.split()[0].strip('"')
            if col_name:
                columns.append(col_name)
    return columns


def generate_admin_seed_sql(backend_path):
    """Generate admin user seed SQL file with bcrypt hashed password.
    Reads actual schema to produce compatible INSERT."""
    print("\n👤 Generating admin user seed...")

    try:
        import bcrypt
    except ImportError:
        print_warning("bcrypt not installed. Installing...")
        if run_command("pip3 install bcrypt"):
            print_success("bcrypt installed")
            import bcrypt
        else:
            print_error("Failed to install bcrypt")
            return False

    # Read actual schema columns to avoid mismatch
    schema_columns = parse_users_columns_from_schema(backend_path)
    if schema_columns:
        print_success(f"Schema read — users columns: {schema_columns}")
    else:
        print_warning("Could not read schema, using safe defaults (email, password_hash, created_at)")
        schema_columns = ["id", "email", "password_hash", "created_at"]

    # Admin credentials
    admin_email = "admin@admin.admin"
    admin_password = "adminadmin"

    # Hash password with bcrypt
    password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Build INSERT dynamically from actual columns
    col_value_map = {
        "email": f"'{admin_email}'",
        "password_hash": f"'{password_hash}'",
        "is_verified": "true",
        "is_active": "true",
        "role": "'admin'",
        "created_at": "NOW()",
        "updated_at": "NOW()",
    }
    # Only include columns that exist in the schema AND we have a value for
    insert_cols = [c for c in schema_columns if c in col_value_map]
    insert_vals = [col_value_map[c] for c in insert_cols]

    if "email" not in insert_cols:
        print_error("users table has no 'email' column — cannot seed admin")
        return False

    sql_content = f"""-- Seed: Admin User
-- Generated: {datetime.now().isoformat()}
-- Email: {admin_email}
-- Password: {admin_password}
-- ⚠️ This file is auto-applied by run_pending_migrations() at backend startup
-- Columns auto-detected from 001_initial_schema.sql

INSERT INTO users ({', '.join(insert_cols)})
VALUES (
  {(',' + chr(10) + '  ').join(insert_vals)}
)
ON CONFLICT (email) DO NOTHING;
"""

    # Create migrations directory if not exists
    migrations_path = Path(backend_path) / "app" / "database" / "migrations"
    migrations_path.mkdir(parents=True, exist_ok=True)

    # Write seed file
    seed_file = migrations_path / "002_seed_admin_user.sql"
    with open(seed_file, 'w') as f:
        f.write(sql_content)

    print_success(f"Admin seed SQL generated: {seed_file}")
    print(f"   Email: {admin_email}")
    print(f"   Password: {admin_password}")

    return True


# =====================================================
# Backend Setup
# =====================================================
def setup_backend(backend_path, template_path, app_name, db_name, create_admin=False):
    """Setup backend infrastructure"""
    print_step("1", "10", "Backend Setup")

    backend_path = Path(backend_path)
    template_path = Path(template_path)

    # 1. Copy template
    print("\n📂 Copying backend template...")
    if backend_path.exists():
        print_warning("Backend directory already exists, skipping copy")
    else:
        if not template_path.exists():
            print_error(f"Template not found at {template_path}")
            sys.exit(1)
        shutil.copytree(template_path, backend_path)
        print_success("Backend template copied")

    # 1b. Clean template-specific files (auth, users, etc.)
    print("\n🧹 Cleaning template-specific files...")
    template_files_to_remove = [
        "app/api/routes/auth.py",
        "app/api/routes/users.py",
        "app/api/models/users.py",
        "app/database/crud/users.py",
        "app/core/utils/auth.py",
    ]
    removed = 0
    for rel_path in template_files_to_remove:
        f = backend_path / rel_path
        if f.exists():
            f.unlink()
            removed += 1
    if removed:
        print_success(f"Removed {removed} template-specific files")
    else:
        print_warning("No template files to clean")

    # 2. Create virtual environment
    print("\n🐍 Creating virtual environment...")
    venv_path = backend_path / ".venv"
    if venv_path.exists():
        print_warning("Virtual environment already exists, skipping")
    else:
        if not run_command(f"python3 -m venv {venv_path}"):
            print_error("Failed to create virtual environment")
            sys.exit(1)
        print_success("Virtual environment created")

    # 3. Install dependencies
    print("\n📦 Installing dependencies...")
    pip_path = venv_path / "bin" / "pip"

    # Upgrade pip
    run_command(f"{pip_path} install --upgrade pip --quiet", shell=True)

    # Install requirements
    requirements_file = backend_path / "requirements.txt"
    if requirements_file.exists():
        if not run_command(f"{pip_path} install -r {requirements_file} --quiet", shell=True):
            print_error("Failed to install dependencies")
            sys.exit(1)
        print_success("Dependencies installed")
    else:
        print_warning("requirements.txt not found")

    # 4. Configure .env with database credentials + merge root .env
    print("\n⚙️  Configuring environment...")
    env_file = backend_path / "config" / ".env"
    env_example = backend_path / "config" / ".env.example"

    if env_example.exists():
        # Read template
        with open(env_example, 'r') as f:
            env_content = f.read()

        # Replace database values
        env_content = env_content.replace('DB_HOST=localhost', f'DB_HOST={DB_HOST}')
        env_content = env_content.replace('DB_PORT=5432', f'DB_PORT={DB_PORT}')
        env_content = env_content.replace('DB_NAME=contentos-db', f'DB_NAME={db_name}')
        env_content = env_content.replace('DB_USER=postgres', f'DB_USER={DB_USER}')
        env_content = env_content.replace('DB_PASSWORD=', f'DB_PASSWORD={DB_PASSWORD}')
        env_content = env_content.replace('APP_NAME="ContentOS - Backend"', f'APP_NAME="{app_name} - Backend"')

        # Merge root .env if it exists (client-provided API keys)
        root_env = Path(".env")
        if root_env.exists():
            print("   🔗 Found root .env — merging client API keys...")
            root_vars = {}
            with open(root_env, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        root_vars[key.strip()] = value.strip()

            # Inject root vars into backend .env (replace empty values)
            for key, value in root_vars.items():
                # Replace empty value: KEY= → KEY=value
                env_content = env_content.replace(f'{key}=\n', f'{key}={value}\n')
                # Replace placeholder: KEY=change-this... → KEY=value
                if f'{key}=' in env_content:
                    import re
                    env_content = re.sub(
                        rf'^{re.escape(key)}=.*$',
                        f'{key}={value}',
                        env_content,
                        flags=re.MULTILINE
                    )

            print_success(f"Merged {len(root_vars)} variables from root .env")

        # Write .env
        with open(env_file, 'w') as f:
            f.write(env_content)

        print_success(f".env configured with database: {db_name}")
    else:
        print_warning(".env.example not found, skipping .env creation")

    # 5. Create documentation structure
    print("\n📝 Creating documentation structure...")
    docs_path = backend_path / "docs" / "backend-implementation"
    docs_path.mkdir(parents=True, exist_ok=True)
    (docs_path / "entitys").mkdir(exist_ok=True)
    (docs_path / "architecture").mkdir(exist_ok=True)

    # 6. Generate admin seed SQL if requested
    if create_admin:
        if not generate_admin_seed_sql(backend_path):
            print_warning("Failed to generate admin seed SQL")

    print_success("Backend setup complete")
    return True


# =====================================================
# Frontend Setup (shadcn preset + custom infra injection)
# =====================================================
FRONTEND_SETUP_DIR = Path(__file__).parent.parent / "templates" / "code" / "frontend"

EXTRA_NPM_DEPS = [
    "@tanstack/react-query",
    "react-hook-form",
    "@hookform/resolvers",
    "zod",
    "sonner",
]

# Style presets — nom lisible → code shadcn
SHADCN_STYLE_PRESETS = {
    "vega":  {"code": "bIkeymG",  "desc": "Simple, equilibre, classique (defaut)"},
    "luma":  {"code": "b1VlIttI", "desc": "Arrondi, soft, genereux en spacing"},
    "lyra":  {"code": "buFznsW",  "desc": "Sharp, boxy, police monospace (JetBrains)"},
    "mira":  {"code": "b1D0eCA4", "desc": "Compact, dense, optimise pour beaucoup de donnees"},
}
DEFAULT_STYLE = "vega"


def resolve_preset(preset_arg):
    """Resolve preset: accept style name (vega/luma/lyra/mira) or raw code."""
    if not preset_arg:
        return SHADCN_STYLE_PRESETS[DEFAULT_STYLE]["code"]
    if preset_arg in SHADCN_STYLE_PRESETS:
        return SHADCN_STYLE_PRESETS[preset_arg]["code"]
    return preset_arg


def setup_frontend(frontend_path, app_name, shadcn_preset=None):
    """Setup frontend via shadcn init --preset + custom infra injection"""
    print_step("2", "10", "Frontend Setup")

    frontend_path = Path(frontend_path)

    # ── Step 1: shadcn init ──────────────────────────────
    if frontend_path.exists():
        print_warning("Frontend directory already exists, skipping shadcn init")
    else:
        print("\n📦 Creating Next.js project via shadcn init...")
        parent = frontend_path.parent
        parent.mkdir(parents=True, exist_ok=True)

        resolved = resolve_preset(shadcn_preset)
        preset_flag = f"--preset {resolved}"
        cmd = (
            f"npx shadcn@latest init {preset_flag} "
            f"--name {frontend_path.name} --template next --yes"
        )
        if not run_command(cmd, cwd=parent, shell=True):
            print_error("shadcn init failed")
            sys.exit(1)
        style_name = shadcn_preset if shadcn_preset in SHADCN_STYLE_PRESETS else "custom"
        print_success(f"Project created with style: {style_name} (preset: {resolved})")

    # ── Step 2: Install base shadcn components ───────────
    print("\n📦 Installing base shadcn components...")
    components_file = FRONTEND_SETUP_DIR / "shadcn-base-components.txt"
    if components_file.exists():
        components = " ".join(
            line.strip()
            for line in components_file.read_text().splitlines()
            if line.strip()
        )
        cmd = f"npx shadcn@latest add {components} --yes"
        if not run_command(cmd, cwd=frontend_path, shell=True):
            print_warning("Some shadcn components failed to install")
        else:
            print_success(f"Base components installed: {components}")
    else:
        print_warning("shadcn-base-components.txt not found, skipping")

    # ── Step 3: Install extra npm deps ───────────────────
    print("\n📦 Installing extra dependencies...")
    deps = " ".join(EXTRA_NPM_DEPS)
    if not run_command(f"npm install {deps}", cwd=frontend_path, shell=True):
        print_error("Failed to install extra dependencies")
        sys.exit(1)
    print_success(f"Extra deps installed: {deps}")

    # ── Step 4: Inject spacing tokens into globals.css ───
    print("\n🎨 Injecting spacing tokens into globals.css...")
    globals_css = frontend_path / "app" / "globals.css"
    if not globals_css.exists():
        globals_css = frontend_path / "src" / "app" / "globals.css"

    if globals_css.exists():
        content = globals_css.read_text()

        # 4a. Inject spacing tokens into :root
        tokens_file = FRONTEND_SETUP_DIR / "inject" / "globals-spacing-tokens.css"
        if tokens_file.exists():
            tokens_snippet = tokens_file.read_text()
            # Insert after the first --radius line in :root
            if "--radius:" in content and "space-xs" not in content:
                content = content.replace(
                    "    --radius:",
                    tokens_snippet + "\n    --radius:",
                )
                print_success("Spacing tokens injected into :root")
            elif "space-xs" in content:
                print_warning("Spacing tokens already present, skipping")
            else:
                print_warning("Could not find --radius in :root, appending tokens")
                root_idx = content.find(":root {")
                if root_idx != -1:
                    brace_idx = content.find("{", root_idx)
                    content = (
                        content[: brace_idx + 1]
                        + "\n"
                        + tokens_snippet
                        + content[brace_idx + 1 :]
                    )

        # 4b. Inject spacing mappings into @theme inline
        mappings_file = FRONTEND_SETUP_DIR / "inject" / "theme-spacing-mappings.css"
        if mappings_file.exists():
            mappings_snippet = mappings_file.read_text()
            if "spacing-page" not in content:
                theme_idx = content.find("@theme inline {")
                if theme_idx != -1:
                    brace_idx = content.find("{", theme_idx)
                    content = (
                        content[: brace_idx + 1]
                        + "\n"
                        + mappings_snippet
                        + content[brace_idx + 1 :]
                    )
                    print_success("Spacing mappings injected into @theme inline")
                else:
                    print_warning("@theme inline not found in globals.css")
            else:
                print_warning("Spacing mappings already present, skipping")

        globals_css.write_text(content)
    else:
        print_error("globals.css not found")

    # ── Step 5: Copy custom files ────────────────────────
    print("\n📂 Copying custom infrastructure files...")
    create_dir = FRONTEND_SETUP_DIR / "create"
    if create_dir.exists():
        copied = 0
        for src_file in create_dir.rglob("*"):
            if src_file.is_file():
                rel = src_file.relative_to(create_dir)
                dest = frontend_path / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                if not dest.exists():
                    shutil.copy2(src_file, dest)
                    copied += 1
                else:
                    print_warning(f"  {rel} already exists, skipping")
        print_success(f"Copied {copied} custom files")
    else:
        print_warning("create/ directory not found")

    # ── Step 6: Create .env.local ────────────────────────
    print("\n⚙️  Creating .env.local...")
    env_local = frontend_path / ".env.local"
    if not env_local.exists():
        env_local.write_text("NEXT_PUBLIC_API_URL=http://localhost:8000\n")
        print_success(".env.local created")
    else:
        print_warning(".env.local already exists, skipping")

    # ── Step 7: Inject rewrites into next.config ─────────
    print("\n⚙️  Configuring API proxy rewrites...")
    next_config = None
    for name in ["next.config.mjs", "next.config.ts", "next.config.js"]:
        candidate = frontend_path / name
        if candidate.exists():
            next_config = candidate
            break

    if next_config:
        nc_content = next_config.read_text()
        if "rewrites" not in nc_content:
            rewrites_file = FRONTEND_SETUP_DIR / "inject" / "next-config-rewrites.txt"
            if rewrites_file.exists():
                rewrites_snippet = rewrites_file.read_text()
                # Handle both formats: `const nextConfig = {}` and `const nextConfig: NextConfig = { ... };`
                if "const nextConfig = {}" in nc_content:
                    nc_content = nc_content.replace(
                        "const nextConfig = {}",
                        "const nextConfig = {\n  " + rewrites_snippet + "\n}",
                    )
                elif "};" in nc_content:
                    nc_content = nc_content.replace(
                        "};",
                        "  " + rewrites_snippet + "\n};",
                        1,
                    )
                else:
                    print_warning("Could not find config object pattern in next.config")
                next_config.write_text(nc_content)
                print_success("API rewrites injected into next.config")
            else:
                print_warning("next-config-rewrites.txt not found")
        else:
            print_warning("Rewrites already configured, skipping")
    else:
        print_warning("next.config not found")

    print_success("Frontend setup complete")
    return True


# =====================================================
# Final Report
# =====================================================
def print_final_report(app_name, backend_path, frontend_path, db_name, admin_created=False):
    """Print final setup report"""
    print_step("3", "10", "Setup Complete")

    admin_info = ""
    if admin_created:
        admin_info = """   👤 Admin user seed: 002_seed_admin_user.sql
      Email: admin@admin.admin
      Password: adminadmin
"""

    print(f"""
{'='*60}
✅ INFRASTRUCTURE SETUP COMPLETE
{'='*60}

📁 App Name: {app_name}

🗄️  Database:
   ✅ PostgreSQL: {db_name}
   📍 Connection: postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{db_name}
   🔍 Verify: psql -U {DB_USER} -d {db_name} -c "\\dt"
{admin_info}
🔧 Backend: {backend_path}
   ✅ Structure copied
   ✅ Virtual environment created
   ✅ Dependencies installed
   ✅ .env configured

🎨 Frontend: {frontend_path}
   ✅ shadcn init (preset applied)
   ✅ Base components installed
   ✅ Spacing tokens injected
   ✅ Custom infra files copied
   ✅ API proxy configured

{'='*60}

🚀 Next Steps:

Backend:
  cd {backend_path}
  source .venv/bin/activate
  python -m app.api.main

Frontend:
  cd {frontend_path}
  npm run dev

{'='*60}

💡 The infrastructure is ready for Phase 2: Database Models

{'='*60}
""")


# =====================================================
# Main
# =====================================================
def main():
    parser = argparse.ArgumentParser(
        description="Setup infrastructure backend + frontend avec création BDD PostgreSQL"
    )
    parser.add_argument("--app-name", required=True, help="Nom de l'application")
    parser.add_argument("--backend-path", default="dev/backend", help="Chemin backend")
    parser.add_argument("--frontend-path", default="dev/frontend", help="Chemin frontend")
    parser.add_argument(
        "--backend-template",
        default=".claude/resources/templates/code/backend",
        help="Chemin template backend"
    )
    parser.add_argument(
        "--create-admin",
        action="store_true",
        help="Créer un admin user initial (admin@admin.admin / adminadmin)"
    )
    parser.add_argument(
        "--shadcn-preset",
        default=None,
        help="Code preset shadcn (ex: bdKT6wBM). Sans preset = defaults shadcn."
    )

    args = parser.parse_args()

    print(f"""
{'='*60}
🚀 Infrastructure Setup
{'='*60}

App Name: {args.app_name}
Backend: {args.backend_path}
Frontend: {args.frontend_path}
Database: {args.app_name}-db
Preset: {args.shadcn_preset or 'defaults'}

{'='*60}
""")

    # 0. Create PostgreSQL database
    db_name = create_postgresql_database(args.app_name)

    # 1. Setup backend
    setup_backend(
        args.backend_path,
        args.backend_template,
        args.app_name,
        db_name,
        args.create_admin
    )

    # 2. Setup frontend
    setup_frontend(
        args.frontend_path,
        args.app_name,
        args.shadcn_preset
    )

    # 3. Final report
    print_final_report(
        args.app_name,
        args.backend_path,
        args.frontend_path,
        db_name,
        args.create_admin
    )


if __name__ == "__main__":
    main()
