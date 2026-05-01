# models.py

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class User:
    id: int
    first_name: str
    last_name: str
    email: str
    password_hash: str
    created_at: str
    updated_at: str
    storage_limit: int = 53687091200  # 50 GB

    @classmethod
    def from_row(cls, row: tuple) -> "User":
        return cls(*row)

    def to_dict(self, include_password=False) -> Dict[str, Any]:
        user_dict = {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "storage_limit": self.storage_limit
        }
        if include_password:
            user_dict["password_hash"] = self.password_hash
        return user_dict

@dataclass
class PasswordResetToken:
    id: int
    user_id: int
    token: str
    expires_at: str
    is_used: bool
    created_at: str

    @classmethod
    def from_row(cls, row: tuple) -> "PasswordResetToken":
        return cls(*row)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "token": self.token,
            "expires_at": self.expires_at,
            "is_used": self.is_used,
            "created_at": self.created_at
        }

@dataclass
class Folder:
    id: int
    user_id: int
    name: str
    parent_id: int | None
    created_at: str
    is_favorite: bool = False

    @classmethod
    def from_row(cls, row: tuple) -> "Folder":
        return cls(*row)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "parent_id": self.parent_id,
            "created_at": self.created_at,
            "is_favorite": self.is_favorite
        }

@dataclass
class File:
    id: int
    folder_id: int
    name: str
    size: int
    path: str
    created_at: str
    is_favorite: bool = False

    @classmethod
    def from_row(cls, row: tuple) -> "File":
        return cls(*row)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "folder_id": self.folder_id,
            "name": self.name,
            "size": self.size,
            "path": self.path,
            "created_at": self.created_at,
            "is_favorite": self.is_favorite
        }
