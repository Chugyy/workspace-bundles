import os
import uuid
import base64
import hashlib
from pathlib import Path
from typing import Optional

UPLOAD_DIR = Path("uploads")
TEMP_DIR = UPLOAD_DIR / "temp"
FILES_DIR = UPLOAD_DIR / "files"

def init_storage():
    """Crée les dossiers de stockage si inexistants."""
    UPLOAD_DIR.mkdir(exist_ok=True)
    TEMP_DIR.mkdir(exist_ok=True)
    FILES_DIR.mkdir(exist_ok=True)

def create_upload_id() -> str:
    """Génère un ID unique pour un upload."""
    return str(uuid.uuid4())

def save_chunk(upload_id: str, chunk_index: int, data: str):
    """Sauvegarde un chunk base64 dans temp."""
    upload_path = TEMP_DIR / upload_id
    upload_path.mkdir(exist_ok=True)

    chunk_file = upload_path / f"chunk_{chunk_index}"
    chunk_data = base64.b64decode(data)
    chunk_file.write_bytes(chunk_data)

def finalize_upload(upload_id: str, file_id: int, filename: str) -> str:
    """
    Concat chunks et déplace vers destination finale.

    Nouvelle structure: uploads/files/{hash_prefix}/{file_id}

    Args:
        upload_id: ID de session upload
        file_id: ID numérique du fichier en DB
        filename: Nom original (pour extension)

    Returns:
        Chemin final du fichier
    """
    upload_path = TEMP_DIR / upload_id
    chunks = sorted(upload_path.glob("chunk_*"), key=lambda x: int(x.name.split("_")[1]))

    # Calculer hash pour créer le préfixe
    hasher = hashlib.sha256()
    temp_content = b""
    for chunk in chunks:
        chunk_data = chunk.read_bytes()
        hasher.update(chunk_data)
        temp_content += chunk_data

    file_hash = hasher.hexdigest()[:2]  # 2 premiers caractères

    # Structure: uploads/files/{hash_prefix}/{file_id}
    final_dir = FILES_DIR / file_hash
    final_dir.mkdir(parents=True, exist_ok=True)
    final_path = final_dir / str(file_id)

    # Écrire le fichier final
    final_path.write_bytes(temp_content)

    # Cleanup temp
    for chunk in chunks:
        chunk.unlink()
    upload_path.rmdir()

    return str(final_path)

def delete_file_on_disk(path: str) -> bool:
    """Supprime un fichier physique."""
    try:
        Path(path).unlink(missing_ok=True)
        return True
    except Exception:
        return False

def get_file_size(path: str) -> Optional[int]:
    """Retourne la taille d'un fichier."""
    try:
        return Path(path).stat().st_size
    except Exception:
        return None
