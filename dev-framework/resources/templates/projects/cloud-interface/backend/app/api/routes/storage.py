#!/usr/bin/env python3
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import Optional

from app.database import crud
from app.database.models import User
from app.core.utils.auth import get_current_user
from app.core.utils.id_generator import encode_id, decode_id, validate_id
from app.api.models import FolderCreate, FileUploadInit, FileUploadChunk, RenameRequest
from app.core.storage import (
    init_storage, create_upload_id, save_chunk,
    finalize_upload, delete_file_on_disk
)

router = APIRouter(prefix="/storage", tags=["storage"])

init_storage()


@router.post("/folders")
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user)
):
    """Crée un nouveau dossier."""
    # Décoder parent_id si fourni
    parent_id_numeric = None
    if folder_data.parent_id:
        if not validate_id(folder_data.parent_id, "folder"):
            raise HTTPException(status_code=400, detail="Invalid parent folder ID format")

        parent_id_numeric, _ = decode_id(folder_data.parent_id)

        # Vérifier ownership du parent
        parent = await crud.get_folder(parent_id_numeric)
        if not parent or parent["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to parent folder")

    folder_id = await crud.create_folder(
        user_id=current_user.id,
        name=folder_data.name,
        parent_id=parent_id_numeric
    )

    return {
        "id": encode_id(folder_id, "folder"),
        "name": folder_data.name,
        "parent_id": folder_data.parent_id
    }


@router.get("/folders")
async def list_folders(
    parent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Liste les dossiers (racine si parent_id=None)."""
    # Décoder parent_id si fourni
    parent_id_numeric = None
    if parent_id:
        if not validate_id(parent_id, "folder"):
            raise HTTPException(status_code=400, detail="Invalid parent folder ID format")

        parent_id_numeric, _ = decode_id(parent_id)

        # Vérifier ownership
        parent = await crud.get_folder(parent_id_numeric)
        if not parent or parent["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    folders = await crud.list_folders(current_user.id, parent_id_numeric)

    # Encoder les IDs pour l'API
    folders_api = [
        {
            **folder,
            "id": encode_id(folder["id"], "folder"),
            "parent_id": encode_id(folder["parent_id"], "folder") if folder.get("parent_id") else None
        }
        for folder in folders
    ]

    return {"folders": folders_api}


@router.delete("/folders/{folder_id}")
async def delete_folder_endpoint(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Supprime un dossier (soft delete vers corbeille)."""
    # Valider et décoder l'ID
    if not validate_id(folder_id, "folder"):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")

    numeric_id, _ = decode_id(folder_id)

    # Vérifier ownership
    folder = await crud.get_folder(numeric_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Soft delete
    success = await crud.delete_folder(numeric_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete folder")

    return {"message": "Folder moved to trash", "id": folder_id}


@router.post("/files/upload/init")
async def init_upload(
    upload_data: FileUploadInit,
    current_user: User = Depends(get_current_user)
):
    """Initialise un upload et retourne un upload_id."""
    folder_id_numeric = None

    # Valider et décoder folder_id si fourni
    if upload_data.folder_id:
        if not validate_id(str(upload_data.folder_id), "folder"):
            raise HTTPException(status_code=400, detail="Invalid folder ID format")

        folder_id_numeric, _ = decode_id(str(upload_data.folder_id))

        # Vérifier ownership du folder
        folder = await crud.get_folder(folder_id_numeric)
        if not folder or folder["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to folder")

    upload_id = create_upload_id()
    return {
        "upload_id": upload_id,
        "folder_id": upload_data.folder_id,
        "filename": upload_data.filename
    }


@router.post("/files/upload/chunk")
async def upload_chunk(
    chunk_data: FileUploadChunk,
    current_user: User = Depends(get_current_user)
):
    """Reçoit un chunk et le sauvegarde."""
    save_chunk(chunk_data.upload_id, chunk_data.chunk_index, chunk_data.data)
    return {"message": "Chunk uploaded successfully", "chunk_index": chunk_data.chunk_index}


@router.post("/files/upload/finalize")
async def finalize_upload_endpoint(
    upload_id: str,
    folder_id: Optional[str] = None,
    filename: str = "",
    total_size: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Finalise l'upload (concat chunks + enregistre en DB)."""
    # Vérifier quota de stockage
    storage_used = await crud.get_user_storage_used(current_user.id)
    storage_limit = await crud.get_user_storage_limit(current_user.id)

    if storage_limit and (storage_used + total_size) > storage_limit:
        raise HTTPException(
            status_code=507,
            detail=f"Insufficient storage. Used: {storage_used} bytes, Limit: {storage_limit} bytes"
        )

    folder_id_numeric = None

    # Valider et décoder folder_id si fourni
    if folder_id:
        if not validate_id(folder_id, "folder"):
            raise HTTPException(status_code=400, detail="Invalid folder ID format")

        folder_id_numeric, _ = decode_id(folder_id)

        # Vérifier ownership
        folder = await crud.get_folder(folder_id_numeric)
        if not folder or folder["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to folder")

    # Créer l'entrée DB d'abord pour avoir l'ID
    file_id = await crud.create_file(
        user_id=current_user.id,
        folder_id=folder_id_numeric,
        name=filename,
        size=total_size,
        path="temp"  # Temporaire, sera mis à jour
    )

    # Finaliser l'upload avec le file_id
    final_path = finalize_upload(upload_id, file_id, filename)

    # Mettre à jour le path en DB
    # TODO: Ajouter une fonction update_file_path dans CRUD
    # Pour l'instant on va créer une nouvelle connexion
    from app.database.db import get_async_db_connection
    conn = await get_async_db_connection()
    try:
        await conn.execute(
            "UPDATE files SET path = $1 WHERE id = $2",
            final_path, file_id
        )
    finally:
        await conn.close()

    return {
        "message": "Upload finalized successfully",
        "file_id": encode_id(file_id, "file"),
        "folder_id": folder_id
    }


@router.get("/files/{folder_id}")
async def list_files_endpoint(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Liste les fichiers d'un dossier. folder_id='root' pour lister les fichiers à la racine."""
    folder_id_numeric = None

    # Si "root", on liste les fichiers sans dossier (folder_id=NULL)
    if folder_id != "root":
        # Valider et décoder folder_id
        if not validate_id(folder_id, "folder"):
            raise HTTPException(status_code=400, detail="Invalid folder ID format")

        folder_id_numeric, _ = decode_id(folder_id)

        # Vérifier ownership
        folder = await crud.get_folder(folder_id_numeric)
        if not folder or folder["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to folder")

    files = await crud.list_files(folder_id_numeric)

    # Encoder les IDs pour l'API
    files_api = [
        {
            **file,
            "id": encode_id(file["id"], "file"),
            "folder_id": encode_id(file["folder_id"], "folder") if file["folder_id"] else None
        }
        for file in files
    ]

    return {"files": files_api}


@router.get("/files/download/{file_id}")
async def download_file(
    file_id: str,
    preview: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Télécharge un fichier. Si preview=true, utilise le MIME type approprié."""
    # Valider et décoder file_id
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    file_id_numeric, _ = decode_id(file_id)

    file_data = await crud.get_file(file_id_numeric)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")

    # Vérifier ownership via folder
    folder = await crud.get_folder(file_data["folder_id"])
    if not folder or folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Déterminer le MIME type si preview
    media_type = "application/octet-stream"
    if preview:
        import mimetypes
        guessed_type, _ = mimetypes.guess_type(file_data["name"])
        if guessed_type:
            media_type = guessed_type

    return FileResponse(
        path=file_data["path"],
        filename=file_data["name"],
        media_type=media_type
    )


@router.delete("/files/{file_id}")
async def delete_file_endpoint(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Supprime un fichier (soft delete vers corbeille)."""
    # Valider et décoder file_id
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    file_id_numeric, _ = decode_id(file_id)

    file_data = await crud.get_file(file_id_numeric)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")

    # Vérifier ownership directement via user_id
    if file_data.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Soft delete (le fichier physique reste, sera supprimé lors du hard delete)
    await crud.delete_file(file_id_numeric)

    return {"message": "File moved to trash", "id": file_id}


@router.post("/files/{file_id}/duplicate")
async def duplicate_file_endpoint(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Duplique un fichier."""
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    file_id_numeric, _ = decode_id(file_id)

    # Vérifier ownership
    file = await crud.get_file(file_id_numeric)
    if not file or file["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    new_file_id = await crud.duplicate_file(file_id_numeric, current_user.id)
    if not new_file_id:
        raise HTTPException(status_code=500, detail="Failed to duplicate file")

    return {"message": "File duplicated", "id": encode_id(new_file_id, "file")}


@router.post("/folders/{folder_id}/duplicate")
async def duplicate_folder_endpoint(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Duplique un dossier et son contenu."""
    if not validate_id(folder_id, "folder"):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")

    folder_id_numeric, _ = decode_id(folder_id)

    # Vérifier ownership
    folder = await crud.get_folder(folder_id_numeric)
    if not folder or folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    new_folder_id = await crud.duplicate_folder(folder_id_numeric, current_user.id)
    if not new_folder_id:
        raise HTTPException(status_code=500, detail="Failed to duplicate folder")

    return {"message": "Folder duplicated", "id": encode_id(new_folder_id, "folder")}


@router.put("/files/{file_id}/favorite")
async def toggle_file_favorite_endpoint(
    file_id: str,
    is_favorite: bool,
    current_user: User = Depends(get_current_user)
):
    """Bascule le statut favori d'un fichier."""
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    file_id_numeric, _ = decode_id(file_id)

    # Vérifier ownership
    file = await crud.get_file(file_id_numeric)
    if not file or file["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    success = await crud.toggle_file_favorite(file_id_numeric, is_favorite)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update favorite status")

    return {"message": "Favorite status updated", "is_favorite": is_favorite}


@router.put("/folders/{folder_id}/favorite")
async def toggle_folder_favorite_endpoint(
    folder_id: str,
    is_favorite: bool,
    current_user: User = Depends(get_current_user)
):
    """Bascule le statut favori d'un dossier."""
    if not validate_id(folder_id, "folder"):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")

    folder_id_numeric, _ = decode_id(folder_id)

    # Vérifier ownership
    folder = await crud.get_folder(folder_id_numeric)
    if not folder or folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    success = await crud.toggle_folder_favorite(folder_id_numeric, is_favorite)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update favorite status")

    return {"message": "Favorite status updated", "is_favorite": is_favorite}


@router.get("/favorites")
async def list_favorites_endpoint(
    current_user: User = Depends(get_current_user)
):
    """Liste tous les favoris (fichiers + dossiers)."""
    favorites = await crud.list_favorites(current_user.id)

    # Encoder les IDs
    files_api = [
        {
            **file,
            "id": encode_id(file["id"], "file"),
            "folder_id": encode_id(file["folder_id"], "folder") if file.get("folder_id") else None
        }
        for file in favorites["files"]
    ]

    folders_api = [
        {
            **folder,
            "id": encode_id(folder["id"], "folder"),
            "parent_id": encode_id(folder["parent_id"], "folder") if folder.get("parent_id") else None
        }
        for folder in favorites["folders"]
    ]

    return {"files": files_api, "folders": folders_api}


@router.put("/files/{file_id}/rename")
async def rename_file_endpoint(
    file_id: str,
    rename_data: RenameRequest,
    current_user: User = Depends(get_current_user)
):
    """Renomme un fichier."""
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    file_id_numeric, _ = decode_id(file_id)

    # Vérifier ownership
    file = await crud.get_file(file_id_numeric)
    if not file or file["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Validation du nouveau nom
    if not rename_data.new_name or not rename_data.new_name.strip():
        raise HTTPException(status_code=400, detail="Invalid name")

    success = await crud.rename_file(file_id_numeric, rename_data.new_name.strip())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to rename file")

    return {"message": "File renamed", "new_name": rename_data.new_name.strip()}


@router.put("/folders/{folder_id}/rename")
async def rename_folder_endpoint(
    folder_id: str,
    rename_data: RenameRequest,
    current_user: User = Depends(get_current_user)
):
    """Renomme un dossier."""
    if not validate_id(folder_id, "folder"):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")

    folder_id_numeric, _ = decode_id(folder_id)

    # Vérifier ownership
    folder = await crud.get_folder(folder_id_numeric)
    if not folder or folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Validation du nouveau nom
    if not rename_data.new_name or not rename_data.new_name.strip():
        raise HTTPException(status_code=400, detail="Invalid name")

    success = await crud.rename_folder(folder_id_numeric, rename_data.new_name.strip())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to rename folder")

    return {"message": "Folder renamed", "new_name": rename_data.new_name.strip()}


@router.post("/files/{file_id}/share")
async def create_share_link(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Crée un lien de partage public pour un fichier."""
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    file_id_numeric, _ = decode_id(file_id)

    file = await crud.get_file(file_id_numeric)
    if not file or file["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    token = await crud.create_shared_link(file_id_numeric)

    from config.config import settings
    share_url = f"{settings.backend_url}/share/{token}"

    return {"share_url": share_url}


@router.get("/stats")
async def get_storage_stats(
    current_user: User = Depends(get_current_user)
):
    """Retourne les statistiques de stockage de l'utilisateur."""
    storage_used = await crud.get_user_storage_used(current_user.id)
    storage_limit = await crud.get_user_storage_limit(current_user.id)

    return {
        "used": storage_used,
        "limit": storage_limit,
        "available": storage_limit - storage_used if storage_limit else None,
        "usage_percent": round((storage_used / storage_limit) * 100, 2) if storage_limit else 0
    }
