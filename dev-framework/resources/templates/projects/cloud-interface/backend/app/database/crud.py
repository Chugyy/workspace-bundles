# crud.py - CRUD unifié asynchrone minimaliste

import asyncpg
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from config.config import settings

# ============================
# CONNEXION ASYNCHRONE
# ============================

async def get_async_db_connection():
    """Retourne une connexion PostgreSQL asynchrone."""
    return await asyncpg.connect(
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        user=settings.db_user,
        password=settings.db_password
    )

# ============================
# USERS
# ============================

async def create_user(username: str, email: str, password_hash: str = '', 
                     first_name: str = '', last_name: str = '', status: str = 'active') -> int:
    """Crée un nouvel utilisateur et retourne son ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow(
            """INSERT INTO users (username, email, password_hash, first_name, last_name, status) 
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id""",
            username, email, password_hash, first_name, last_name, status
        )
        return result['id'] if result else None
    finally:
        await conn.close()

async def get_user_by_username(username: str) -> Optional[Dict]:
    """Récupère un utilisateur par nom d'utilisateur."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow("SELECT * FROM users WHERE username = $1", username)
        return dict(result) if result else None
    finally:
        await conn.close()

async def get_user(user_id: int) -> Optional[Dict]:
    """Récupère un utilisateur par ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return dict(result) if result else None
    finally:
        await conn.close()

async def get_user_storage_limit(user_id: int) -> Optional[int]:
    """Récupère la limite de stockage d'un utilisateur."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchval("SELECT storage_limit FROM users WHERE id = $1", user_id)
        return result
    finally:
        await conn.close()

async def get_user_by_email(email: str) -> Optional[Dict]:
    """Récupère un utilisateur par email."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
        return dict(result) if result else None
    finally:
        await conn.close()

async def list_users() -> List[Dict]:
    """Renvoie la liste de tous les utilisateurs."""
    conn = await get_async_db_connection()
    try:
        rows = await conn.fetch("SELECT * FROM users")
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def update_user_password(user_id: int, password_hash: str) -> bool:
    """Met à jour uniquement le mot de passe d'un utilisateur."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
            password_hash, user_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def update_user_profile(user_id: int, username: str, first_name: str, last_name: str) -> bool:
    """Met à jour le profil d'un utilisateur."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE users SET username = $1, first_name = $2, last_name = $3, updated_at = NOW() WHERE id = $4",
            username, first_name, last_name, user_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def activate_user_by_email(email: str) -> bool:
    """Active un utilisateur par son email."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE users SET status = 'active', updated_at = NOW() WHERE email = $1 AND status = 'pending_payment'",
            email
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def delete_user(user_id: int) -> bool:
    """Supprime un utilisateur par ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

# ============================
# PASSWORD RESET TOKENS
# ============================

async def create_reset_token(user_id: int, token: str, expires_at: str) -> int:
    """Crée un token de réinitialisation et retourne son ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow(
            "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id",
            user_id, token, expires_at
        )
        return result['id'] if result else None
    finally:
        await conn.close()

async def get_reset_token(token: str) -> Optional[Dict]:
    """Récupère un token de réinitialisation valide."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow(
            "SELECT * FROM password_reset_tokens WHERE token = $1 AND is_used = FALSE",
            token
        )
        return dict(result) if result else None
    finally:
        await conn.close()

async def mark_token_used(token: str) -> bool:
    """Marque un token comme utilisé."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE password_reset_tokens SET is_used = TRUE WHERE token = $1",
            token
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

# ============================
# FOLDERS
# ============================

async def create_folder(user_id: int, name: str, parent_id: Optional[int] = None) -> int:
    """Crée un dossier et retourne son ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow(
            "INSERT INTO folders (user_id, name, parent_id) VALUES ($1, $2, $3) RETURNING id",
            user_id, name, parent_id
        )
        return result['id'] if result else None
    finally:
        await conn.close()

async def list_folders(user_id: int, parent_id: Optional[int] = None) -> List[Dict]:
    """Liste les dossiers actifs d'un user (exclut trash)."""
    conn = await get_async_db_connection()
    try:
        if parent_id is None:
            rows = await conn.fetch(
                "SELECT id, user_id, name, parent_id, created_at, COALESCE(is_favorite, FALSE) as is_favorite FROM folders WHERE user_id = $1 AND parent_id IS NULL AND deleted_at IS NULL",
                user_id
            )
        else:
            rows = await conn.fetch(
                "SELECT id, user_id, name, parent_id, created_at, COALESCE(is_favorite, FALSE) as is_favorite FROM folders WHERE user_id = $1 AND parent_id = $2 AND deleted_at IS NULL",
                user_id, parent_id
            )
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def get_folder(folder_id: int) -> Optional[Dict]:
    """Récupère un dossier par ID (inclut trash)."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow("SELECT * FROM folders WHERE id = $1", folder_id)
        return dict(result) if result else None
    finally:
        await conn.close()

async def delete_folder(folder_id: int) -> bool:
    """Soft delete: déplace le dossier vers la corbeille."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE folders SET deleted_at = NOW() WHERE id = $1",
            folder_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def hard_delete_folder(folder_id: int) -> bool:
    """Hard delete: supprime définitivement le dossier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute("DELETE FROM folders WHERE id = $1", folder_id)
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def restore_folder(folder_id: int) -> bool:
    """Restaure un dossier depuis la corbeille."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE folders SET deleted_at = NULL WHERE id = $1",
            folder_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

# ============================
# FILES
# ============================

async def create_file(user_id: int, folder_id: Optional[int], name: str, size: int, path: str) -> int:
    """Crée un fichier et retourne son ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow(
            "INSERT INTO files (user_id, folder_id, name, size, path) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            user_id, folder_id, name, size, path
        )
        return result['id'] if result else None
    finally:
        await conn.close()

async def list_files(folder_id: Optional[int]) -> List[Dict]:
    """Liste les fichiers actifs d'un dossier (exclut trash). Si folder_id=None, liste les fichiers à la racine."""
    conn = await get_async_db_connection()
    try:
        if folder_id is None:
            rows = await conn.fetch(
                "SELECT id, folder_id, name, size, path, created_at, COALESCE(is_favorite, FALSE) as is_favorite FROM files WHERE folder_id IS NULL AND deleted_at IS NULL"
            )
        else:
            rows = await conn.fetch(
                "SELECT id, folder_id, name, size, path, created_at, COALESCE(is_favorite, FALSE) as is_favorite FROM files WHERE folder_id = $1 AND deleted_at IS NULL",
                folder_id
            )
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def get_file(file_id: int) -> Optional[Dict]:
    """Récupère un fichier par ID."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow("SELECT * FROM files WHERE id = $1", file_id)
        return dict(result) if result else None
    finally:
        await conn.close()

async def delete_file(file_id: int) -> bool:
    """Soft delete: déplace le fichier vers la corbeille."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE files SET deleted_at = NOW() WHERE id = $1",
            file_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def hard_delete_file(file_id: int) -> bool:
    """Hard delete: supprime définitivement le fichier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute("DELETE FROM files WHERE id = $1", file_id)
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def restore_file(file_id: int) -> bool:
    """Restaure un fichier depuis la corbeille."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE files SET deleted_at = NULL WHERE id = $1",
            file_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

# ============================
# TRASH
# ============================

async def list_trash_folders(user_id: int) -> List[Dict]:
    """Liste les dossiers en corbeille."""
    conn = await get_async_db_connection()
    try:
        rows = await conn.fetch(
            "SELECT * FROM folders WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
            user_id
        )
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def list_trash_files(user_id: int) -> List[Dict]:
    """Liste les fichiers en corbeille."""
    conn = await get_async_db_connection()
    try:
        rows = await conn.fetch(
            """SELECT * FROM files
               WHERE user_id = $1 AND deleted_at IS NOT NULL
               ORDER BY deleted_at DESC""",
            user_id
        )
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def cleanup_old_trash(days: int = 30) -> tuple[int, int]:
    """Supprime définitivement les items en corbeille depuis > X jours."""
    conn = await get_async_db_connection()
    try:
        # Récupérer les fichiers à supprimer (pour cleanup physique)
        files = await conn.fetch(
            "SELECT id, path FROM files WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'",
            days
        )

        # Hard delete files
        result_files = await conn.execute(
            "DELETE FROM files WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'",
            days
        )

        # Hard delete folders (cascade delete handled by FK)
        result_folders = await conn.execute(
            "DELETE FROM folders WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'",
            days
        )

        files_deleted = int(result_files.split()[1]) if result_files.split()[0] == "DELETE" else 0
        folders_deleted = int(result_folders.split()[1]) if result_folders.split()[0] == "DELETE" else 0

        return files_deleted, folders_deleted
    finally:
        await conn.close()

# ============================
# DUPLICATE
# ============================

async def duplicate_file(file_id: int, user_id: int) -> Optional[int]:
    """Duplique un fichier et retourne le nouvel ID."""
    conn = await get_async_db_connection()
    try:
        # Récupérer le fichier source
        source = await conn.fetchrow("SELECT * FROM files WHERE id = $1", file_id)
        if not source:
            return None

        # Créer un nouveau nom avec suffix
        import os
        import shutil
        from pathlib import Path
        name_parts = os.path.splitext(source['name'])
        new_name = f"{name_parts[0]} (copy){name_parts[1]}"

        # Copier le fichier physiquement
        src_full_path = Path(source['path'])
        if not src_full_path.exists():
            return None

        # Créer une nouvelle entrée en BDD d'abord pour obtenir le nouvel ID
        result = await conn.fetchrow(
            """INSERT INTO files (user_id, folder_id, name, size, path, is_favorite)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id""",
            user_id, source['folder_id'], new_name, source['size'], "temp", False
        )
        new_file_id = result['id'] if result else None
        if not new_file_id:
            return None

        # Créer le nouveau path basé sur le nouvel ID (même structure que finalize_upload)
        import hashlib
        file_content = src_full_path.read_bytes()
        file_hash = hashlib.sha256(file_content).hexdigest()[:2]

        final_dir = Path("uploads/files") / file_hash
        final_dir.mkdir(parents=True, exist_ok=True)
        dst_full_path = final_dir / str(new_file_id)

        # Copier le fichier
        shutil.copy2(src_full_path, dst_full_path)

        # Mettre à jour le path en BDD
        await conn.execute(
            "UPDATE files SET path = $1 WHERE id = $2",
            str(dst_full_path), new_file_id
        )

        return new_file_id
    finally:
        await conn.close()

async def duplicate_folder(folder_id: int, user_id: int) -> Optional[int]:
    """Duplique un dossier (récursivement) et retourne le nouvel ID."""
    conn = await get_async_db_connection()
    try:
        # Récupérer le dossier source
        source = await conn.fetchrow("SELECT * FROM folders WHERE id = $1", folder_id)
        if not source:
            return None

        # Créer un nouveau nom avec suffix
        new_name = f"{source['name']} (copy)"

        # Insérer le nouveau dossier
        result = await conn.fetchrow(
            """INSERT INTO folders (user_id, name, parent_id, is_favorite)
               VALUES ($1, $2, $3, $4) RETURNING id""",
            user_id, new_name, source['parent_id'], False
        )
        new_folder_id = result['id'] if result else None
        if not new_folder_id:
            return None

        # Copier tous les fichiers du dossier source
        files = await conn.fetch(
            "SELECT * FROM files WHERE folder_id = $1 AND deleted_at IS NULL",
            folder_id
        )
        for file in files:
            import os
            import shutil
            import hashlib
            from pathlib import Path

            # Copier le fichier physiquement
            src_full_path = Path(file['path'])
            if not src_full_path.exists():
                continue

            # Créer une nouvelle entrée en BDD pour obtenir le nouvel ID
            file_result = await conn.fetchrow(
                """INSERT INTO files (user_id, folder_id, name, size, path, is_favorite)
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING id""",
                user_id, new_folder_id, file['name'], file['size'], "temp", False
            )
            new_file_id = file_result['id'] if file_result else None
            if not new_file_id:
                continue

            # Créer le nouveau path basé sur le nouvel ID
            file_content = src_full_path.read_bytes()
            file_hash = hashlib.sha256(file_content).hexdigest()[:2]

            final_dir = Path("uploads/files") / file_hash
            final_dir.mkdir(parents=True, exist_ok=True)
            dst_full_path = final_dir / str(new_file_id)

            # Copier le fichier
            shutil.copy2(src_full_path, dst_full_path)

            # Mettre à jour le path en BDD
            await conn.execute(
                "UPDATE files SET path = $1 WHERE id = $2",
                str(dst_full_path), new_file_id
            )

        # Copier récursivement les sous-dossiers
        subfolders = await conn.fetch(
            "SELECT * FROM folders WHERE parent_id = $1 AND deleted_at IS NULL",
            folder_id
        )
        for subfolder in subfolders:
            # Récursion via re-connexion
            await duplicate_folder(subfolder['id'], user_id)

        return new_folder_id
    finally:
        await conn.close()

# ============================
# FAVORITES
# ============================

async def toggle_file_favorite(file_id: int, is_favorite: bool) -> bool:
    """Bascule le statut favori d'un fichier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE files SET is_favorite = $1 WHERE id = $2",
            is_favorite, file_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def toggle_folder_favorite(folder_id: int, is_favorite: bool) -> bool:
    """Bascule le statut favori d'un dossier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE folders SET is_favorite = $1 WHERE id = $2",
            is_favorite, folder_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def rename_file(file_id: int, new_name: str) -> bool:
    """Renomme un fichier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE files SET name = $1 WHERE id = $2",
            new_name, file_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def rename_folder(folder_id: int, new_name: str) -> bool:
    """Renomme un dossier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.execute(
            "UPDATE folders SET name = $1 WHERE id = $2",
            new_name, folder_id
        )
        return int(result.split()[1]) > 0
    finally:
        await conn.close()

async def list_favorites(user_id: int) -> Dict[str, List[Dict]]:
    """Liste tous les favoris (fichiers + dossiers) d'un utilisateur."""
    conn = await get_async_db_connection()
    try:
        files = await conn.fetch(
            """SELECT f.* FROM files f
               WHERE f.user_id = $1 AND f.is_favorite = TRUE AND f.deleted_at IS NULL
               ORDER BY f.created_at DESC""",
            user_id
        )
        folders = await conn.fetch(
            """SELECT * FROM folders
               WHERE user_id = $1 AND is_favorite = TRUE AND deleted_at IS NULL
               ORDER BY created_at DESC""",
            user_id
        )
        return {
            "files": [dict(row) for row in files],
            "folders": [dict(row) for row in folders]
        }
    finally:
        await conn.close()

# ============================
# STORAGE
# ============================

async def get_user_storage_used(user_id: int) -> int:
    """Calcule l'espace de stockage utilisé par un utilisateur (fichiers non supprimés)."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchval(
            "SELECT COALESCE(SUM(size), 0) FROM files WHERE user_id = $1 AND deleted_at IS NULL",
            user_id
        )
        return result
    finally:
        await conn.close()

# ============================
# SHARED LINKS
# ============================

async def create_shared_link(file_id: int) -> str:
    """Crée un lien de partage et retourne le token."""
    conn = await get_async_db_connection()
    try:
        token = uuid.uuid4().hex
        await conn.execute(
            "INSERT INTO shared_links (file_id, token) VALUES ($1, $2)",
            file_id, token
        )
        return token
    finally:
        await conn.close()

async def get_shared_link(token: str) -> Optional[Dict]:
    """Récupère un lien de partage avec les infos du fichier."""
    conn = await get_async_db_connection()
    try:
        result = await conn.fetchrow(
            """SELECT sl.*, f.path, f.name, f.user_id
               FROM shared_links sl
               JOIN files f ON sl.file_id = f.id
               WHERE sl.token = $1""",
            token
        )
        return dict(result) if result else None
    finally:
        await conn.close()