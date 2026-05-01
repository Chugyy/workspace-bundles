# app/core/services/storage.py
#
# Handles saving/reading uploaded files on disk.
# Files are stored as: {UPLOADS_DIR}/{file_id}
# The original extension is preserved in the filename stored in DB.

from pathlib import Path

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "database" / "uploads"


def ensure_uploads_dir() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def save_file(file_id: str, data: bytes) -> None:
    ensure_uploads_dir()
    (UPLOADS_DIR / file_id).write_bytes(data)


def get_file_path(file_id: str) -> Path:
    return UPLOADS_DIR / file_id


def file_exists(file_id: str) -> bool:
    return (UPLOADS_DIR / file_id).exists()
