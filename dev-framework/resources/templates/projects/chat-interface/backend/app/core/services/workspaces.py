# core/services/workspaces.py
# Workspace-specific operations. File ops delegated to files.py.

import shutil
from pathlib import Path

from config.config import settings
from app.core.services import files as file_ops


def _root(workspace_id: str) -> Path:
    return Path(settings.base_workspaces_path) / workspace_id


def create_workspace_dir(workspace_id: str) -> None:
    _root(workspace_id).mkdir(parents=True, exist_ok=True)


def delete_workspace_dir(workspace_id: str) -> None:
    path = _root(workspace_id)
    if path.exists():
        shutil.rmtree(path)


def list_dir(workspace_id: str, subpath: str = "") -> dict:
    return file_ops.list_dir(_root(workspace_id), subpath)


def read_file(workspace_id: str, subpath: str) -> tuple[str, str]:
    return file_ops.read_file(_root(workspace_id), subpath)


def write_file(workspace_id: str, subpath: str, content: str) -> None:
    file_ops.write_file(_root(workspace_id), subpath, content)


def delete_path(workspace_id: str, subpath: str) -> None:
    file_ops.delete_path(_root(workspace_id), subpath)


def duplicate_path(workspace_id: str, subpath: str) -> str:
    return file_ops.duplicate_path(_root(workspace_id), subpath)


def download_path(workspace_id: str, subpath: str) -> tuple:
    return file_ops.download_path(_root(workspace_id), subpath)


def copy_path(src_ws_id: str, src_subpath: str, dst_ws_id: str, dst_subpath: str) -> str:
    return file_ops.copy_path(_root(src_ws_id), src_subpath, _root(dst_ws_id), dst_subpath)


def move_path(src_ws_id: str, src_subpath: str, dst_ws_id: str, dst_subpath: str) -> str:
    return file_ops.move_path(_root(src_ws_id), src_subpath, _root(dst_ws_id), dst_subpath)


def zip_workspace(workspace_id: str):
    return file_ops.zip_dir(_root(workspace_id))


async def ensure_default_workspace(pool) -> None:
    from app.database.crud.workspaces import create_workspace_crud, get_default_workspace_crud, update_workspace_profile_crud
    from app.database.crud.profiles import get_default_profile_crud
    from app.core.services.profiles import apply_profile_to_workspace, list_profile_items

    existing = await get_default_workspace_crud(pool)
    if not existing:
        ws = await create_workspace_crud(pool, "default")
        create_workspace_dir(str(ws["id"]))
        # Apply default profile automatically on first creation
        profile = await get_default_profile_crud(pool)
        if profile:
            items = [i["path"] for i in list_profile_items(profile["name"])]
            apply_profile_to_workspace(profile["name"], str(ws["id"]), items)
            await update_workspace_profile_crud(pool, str(ws["id"]), str(profile["id"]), items)
    else:
        create_workspace_dir(str(existing["id"]))
        # Ensure .claude/ exists even if workspace was created before profile logic
        claude_dir = _root(str(existing["id"])) / ".claude"
        if not claude_dir.exists():
            profile = await get_default_profile_crud(pool)
            if profile:
                items = [i["path"] for i in list_profile_items(profile["name"])]
                apply_profile_to_workspace(profile["name"], str(existing["id"]), items)
                await update_workspace_profile_crud(pool, str(existing["id"]), str(profile["id"]), items)
