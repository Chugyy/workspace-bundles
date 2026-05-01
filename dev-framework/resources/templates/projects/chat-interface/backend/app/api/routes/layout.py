# app/api/routes/layout.py

import asyncpg
from fastapi import APIRouter, Depends
from app.api.models.common import BaseSchema

from app.core.utils.auth import require_auth
from app.database.crud.layout import get_layout_crud, save_layout_crud
from app.database.crud.workspaces import list_workspaces_crud
from app.database.db import get_db_pool

router = APIRouter(prefix="/workspace-layout", tags=["workspace-layout"])


async def get_pool() -> asyncpg.Pool:
    return await get_db_pool()


class LayoutResponse(BaseSchema):
    tree: list
    unsorted_workspace_ids: list[str]


class LayoutSaveRequest(BaseSchema):
    tree: list


def _collect_workspace_ids(tree: list) -> set[str]:
    """Recursively collect all workspace IDs referenced in the layout tree."""
    ids = set()
    for node in tree:
        if node.get("type") == "workspace":
            ids.add(node["id"])
        elif node.get("type") == "folder":
            ids.update(_collect_workspace_ids(node.get("children", [])))
    return ids


@router.get("", response_model=LayoutResponse)
async def get_layout(pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    tree = await get_layout_crud(pool)
    workspaces = await list_workspaces_crud(pool)
    all_ids = {str(w["id"]) for w in workspaces}
    in_tree = _collect_workspace_ids(tree)
    unsorted = sorted(all_ids - in_tree)
    return LayoutResponse(tree=tree, unsorted_workspace_ids=unsorted)


@router.put("")
async def save_layout(body: LayoutSaveRequest, pool: asyncpg.Pool = Depends(get_pool), _: str = Depends(require_auth)):
    await save_layout_crud(pool, body.tree)
    return {"saved": True}
