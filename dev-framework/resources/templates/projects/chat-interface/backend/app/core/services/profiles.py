# profiles.py — profile management + file operations

import re
import shutil
from pathlib import Path

from config.config import settings
from app.core.services import files as file_ops

_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,62}$")


def validate_name(name: str) -> None:
    if not _NAME_RE.match(name):
        raise ValueError("Name must be lowercase alphanumeric, hyphens or underscores")


def _profile_root(name: str) -> Path:
    return Path(settings.profiles_path) / name


def _workspace_claude_dir(workspace_id: str) -> Path:
    return Path(settings.base_workspaces_path) / workspace_id / ".claude"


def create_profile_dir(name: str) -> None:
    _profile_root(name).mkdir(parents=True, exist_ok=True)


def delete_profile_dir(name: str) -> None:
    path = _profile_root(name)
    if path.exists():
        shutil.rmtree(path)


def list_profile_items(name: str, applied_at: float | None = None) -> list[dict]:
    """Scan a profile directory and return a flat list of selectable items.
    If applied_at (unix timestamp) is provided, marks items added after that date as is_new."""
    root = _profile_root(name)
    if not root.exists():
        raise FileNotFoundError(f"Profile '{name}' not found on disk")

    items = []
    for item in sorted(root.rglob("*")):
        if any(part.startswith(".") for part in item.relative_to(root).parts):
            continue
        rel = str(item.relative_to(root))
        is_new = False
        if applied_at is not None and item.is_file():
            is_new = item.stat().st_mtime > applied_at
        items.append({
            "path": rel,
            "type": "dir" if item.is_dir() else "file",
            "is_new": is_new,
        })
    return items


def apply_profile_to_workspace(
    profile_name: str,
    workspace_id: str,
    items: list[str],
) -> None:
    """Copy selected items from a profile into workspace/.claude/ (identified by UUID)."""
    profile_root = _profile_root(profile_name)
    target = _workspace_claude_dir(workspace_id)

    if target.exists():
        from datetime import datetime
        backup = target.parent / f".claude.bak.{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}"
        shutil.copytree(target, backup)
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)

    for item_path in items:
        src = profile_root / item_path
        dst = target / item_path
        if not src.exists():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)


# --- File operations (delegate to generic file_ops) ---

def list_dir(profile_name: str, subpath: str = "") -> dict:
    return file_ops.list_dir(_profile_root(profile_name), subpath)


def read_file(profile_name: str, subpath: str) -> tuple[str, str]:
    return file_ops.read_file(_profile_root(profile_name), subpath)


def write_file(profile_name: str, subpath: str, content: str) -> None:
    file_ops.write_file(_profile_root(profile_name), subpath, content)


def delete_path(profile_name: str, subpath: str) -> None:
    file_ops.delete_path(_profile_root(profile_name), subpath)


def duplicate_path(profile_name: str, subpath: str) -> str:
    return file_ops.duplicate_path(_profile_root(profile_name), subpath)


def download_path(profile_name: str, subpath: str) -> tuple:
    return file_ops.download_path(_profile_root(profile_name), subpath)


def zip_profile(profile_name: str):
    return file_ops.zip_dir(_profile_root(profile_name))


async def ensure_default_profile(pool) -> None:
    """Create 'default' profile in DB if it doesn't exist."""
    from app.database.crud.profiles import create_profile_crud, get_default_profile_crud

    existing = await get_default_profile_crud(pool)
    if not existing:
        create_profile_dir("default")
        await create_profile_crud(pool, "default")
