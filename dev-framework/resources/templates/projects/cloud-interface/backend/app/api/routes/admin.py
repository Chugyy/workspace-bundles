"""
Routes admin protégées par clé API.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.core.utils.api_key import verify_api_key
from app.core.utils.auth import hash_password
from app.core.utils.id_generator import encode_id, decode_id, validate_id
from app.database import crud
from app.api.models import UserCreate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users")
async def create_user(
    user: UserCreate,
    _: bool = Depends(verify_api_key)
):
    """
    Créer un utilisateur (admin only).

    Requiert header: X-API-Key
    """
    # Vérifier si l'email existe déjà
    existing_user = await crud.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash du mot de passe
    password_hash = hash_password(user.password)

    # Créer l'utilisateur
    user_id = await crud.create_user(
        username=user.email.split("@")[0],  # Username par défaut depuis email
        email=user.email,
        password_hash=password_hash,
        first_name=user.first_name or "",
        last_name=user.last_name or "",
        status="active"
    )

    if not user_id:
        raise HTTPException(status_code=500, detail="Failed to create user")

    return {
        "message": "User created successfully",
        "user_id": encode_id(user_id, "user"),
        "email": user.email
    }


@router.get("/users")
async def list_users(_: bool = Depends(verify_api_key)):
    """
    Liste tous les utilisateurs (admin only).

    Requiert header: X-API-Key
    """
    users = await crud.list_users()

    # Encoder les IDs et masquer les passwords
    users_api = [
        {
            "id": encode_id(user["id"], "user"),
            "email": user["email"],
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "created_at": str(user.get("created_at", "")),
            "updated_at": str(user.get("updated_at", ""))
        }
        for user in users
    ]

    return {"users": users_api, "count": len(users_api)}


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    _: bool = Depends(verify_api_key)
):
    """
    Récupère un utilisateur spécifique (admin only).

    Requiert header: X-API-Key
    """
    # Valider et décoder l'ID
    if not validate_id(user_id, "user"):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    numeric_id, _ = decode_id(user_id)

    user = await crud.get_user(numeric_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": encode_id(user["id"], "user"),
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "created_at": str(user.get("created_at", "")),
        "updated_at": str(user.get("updated_at", ""))
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    _: bool = Depends(verify_api_key)
):
    """
    Supprime un utilisateur (admin only).

    Requiert header: X-API-Key
    Cascade delete sur folders et files via FK.
    """
    # Valider et décoder l'ID
    if not validate_id(user_id, "user"):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    numeric_id, _ = decode_id(user_id)

    # Vérifier que l'utilisateur existe
    user = await crud.get_user(numeric_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Supprimer l'utilisateur (cascade sur folders/files)
    success = await crud.delete_user(numeric_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user")

    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "email": user["email"]
    }


@router.get("/stats")
async def get_stats(_: bool = Depends(verify_api_key)):
    """
    Statistiques globales de la plateforme (admin only).

    Requiert header: X-API-Key
    """
    users = await crud.list_users()

    # TODO: Ajouter stats sur storage, files, etc.
    return {
        "total_users": len(users),
        "platform": "Personal Cloud",
        "version": "1.0.0"
    }
