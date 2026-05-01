"""
Routes pour la gestion de la corbeille (trash).
"""

from fastapi import APIRouter, Depends, HTTPException
from app.database import crud
from app.database.models import User
from app.core.utils.auth import get_current_user
from app.core.utils.id_generator import encode_id, decode_id, validate_id
from app.core.storage import delete_file_on_disk

router = APIRouter(prefix="/storage/trash", tags=["trash"])


@router.get("")
async def list_trash(current_user: User = Depends(get_current_user)):
    """Liste tous les items en corbeille (fichiers + dossiers)."""
    user_id = current_user.id

    folders = await crud.list_trash_folders(user_id)
    files = await crud.list_trash_files(user_id)

    # Encoder les IDs pour l'API
    folders_api = [
        {
            **folder,
            "id": encode_id(folder["id"], "folder"),
            "parent_id": encode_id(folder["parent_id"], "folder") if folder.get("parent_id") else None,
        }
        for folder in folders
    ]

    files_api = [
        {
            **file,
            "id": encode_id(file["id"], "file"),
            "folder_id": encode_id(file["folder_id"], "folder") if file.get("folder_id") else None,
        }
        for file in files
    ]

    return {
        "folders": folders_api,
        "files": files_api
    }


@router.get("/files")
async def list_trash_files(current_user: User = Depends(get_current_user)):
    """Liste uniquement les fichiers en corbeille."""
    user_id = current_user.id
    files = await crud.list_trash_files(user_id)

    files_api = [
        {
            **file,
            "id": encode_id(file["id"], "file"),
            "folder_id": encode_id(file["folder_id"], "folder") if file.get("folder_id") else None,
        }
        for file in files
    ]

    return {"files": files_api}


@router.get("/folders")
async def list_trash_folders(current_user: User = Depends(get_current_user)):
    """Liste uniquement les dossiers en corbeille."""
    user_id = current_user.id
    folders = await crud.list_trash_folders(user_id)

    folders_api = [
        {
            **folder,
            "id": encode_id(folder["id"], "folder"),
            "parent_id": encode_id(folder["parent_id"], "folder") if folder.get("parent_id") else None,
        }
        for folder in folders
    ]

    return {"folders": folders_api}


@router.post("/restore/file/{file_id}")
async def restore_file(file_id: str, current_user: User = Depends(get_current_user)):
    """Restaure un fichier depuis la corbeille."""
    # Valider et décoder l'ID
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    numeric_id, _ = decode_id(file_id)

    # Vérifier que le fichier existe et appartient à l'utilisateur
    file = await crud.get_file(numeric_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Vérifier ownership
    if file.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Restaurer
    success = await crud.restore_file(numeric_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to restore file")

    return {"message": "File restored successfully", "id": file_id}


@router.post("/restore/folder/{folder_id}")
async def restore_folder(folder_id: str, current_user: User = Depends(get_current_user)):
    """Restaure un dossier depuis la corbeille."""
    # Valider et décoder l'ID
    if not validate_id(folder_id, "folder"):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")

    numeric_id, _ = decode_id(folder_id)

    # Vérifier que le dossier existe et appartient à l'utilisateur
    folder = await crud.get_folder(numeric_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Restaurer
    success = await crud.restore_folder(numeric_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to restore folder")

    return {"message": "Folder restored successfully", "id": folder_id}


@router.delete("/file/{file_id}")
async def delete_file_permanently(file_id: str, current_user: User = Depends(get_current_user)):
    """Supprime définitivement un fichier (hard delete)."""
    # Valider et décoder l'ID
    if not validate_id(file_id, "file"):
        raise HTTPException(status_code=400, detail="Invalid file ID format")

    numeric_id, _ = decode_id(file_id)

    # Vérifier que le fichier existe et appartient à l'utilisateur
    file = await crud.get_file(numeric_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Vérifier ownership directement via user_id
    if file.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Supprimer fichier physique
    delete_file_on_disk(file["path"])

    # Hard delete en DB
    success = await crud.hard_delete_file(numeric_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete file")

    return {"message": "File permanently deleted", "id": file_id}


@router.delete("/folder/{folder_id}")
async def delete_folder_permanently(folder_id: str, current_user: User = Depends(get_current_user)):
    """Supprime définitivement un dossier (hard delete, cascade sur fichiers)."""
    # Valider et décoder l'ID
    if not validate_id(folder_id, "folder"):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")

    numeric_id, _ = decode_id(folder_id)

    # Vérifier que le dossier existe et appartient à l'utilisateur
    folder = await crud.get_folder(numeric_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Récupérer tous les fichiers du dossier pour cleanup physique
    files = await crud.list_files(numeric_id)
    for file in files:
        delete_file_on_disk(file["path"])

    # Hard delete (cascade sur files via FK)
    success = await crud.hard_delete_folder(numeric_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete folder")

    return {"message": "Folder permanently deleted", "id": folder_id}


@router.delete("/empty")
async def empty_trash(current_user: User = Depends(get_current_user)):
    """Vide complètement la corbeille de l'utilisateur."""
    user_id = current_user.id

    # Récupérer tous les items en trash
    files = await crud.list_trash_files(user_id)
    folders = await crud.list_trash_folders(user_id)

    # Supprimer les fichiers physiques
    for file in files:
        delete_file_on_disk(file["path"])

    # Hard delete tous les fichiers
    files_deleted = 0
    for file in files:
        success = await crud.hard_delete_file(file["id"])
        if success:
            files_deleted += 1

    # Hard delete tous les dossiers (cascade sur fichiers restants)
    folders_deleted = 0
    for folder in folders:
        success = await crud.hard_delete_folder(folder["id"])
        if success:
            folders_deleted += 1

    return {
        "message": "Trash emptied successfully",
        "files_deleted": files_deleted,
        "folders_deleted": folders_deleted
    }
