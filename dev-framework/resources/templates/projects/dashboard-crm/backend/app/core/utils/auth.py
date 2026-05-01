# auth.py

from datetime import datetime, timedelta
from typing import Optional, Union, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
from requests_oauthlib import OAuth2Session

from config.config import settings
from app.database.crud.users import get_user_by_email_db, get_user_by_id_db, create_user_db
from app.database.models import User
from app.database.db import get_db_pool

# Configuration du hachage de mot de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuration JWT
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hache un mot de passe."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crée un token JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    """Vérifie un token JWT et retourne le username."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None

async def authenticate_user(email: str, password: str) -> Union[Dict[str, Any], bool]:
    """Authentifie un utilisateur par email."""
    pool = await get_db_pool()
    user = await get_user_by_email_db(pool, email)

    if not user:
        return False

    if not verify_password(password, user["hashed_password"]):
        return False

    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Récupère l'utilisateur actuel depuis le token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    username = verify_token(credentials.credentials)
    if username is None:
        raise credentials_exception

    pool = await get_db_pool()
    user_data = await get_user_by_email_db(pool, username)
    if user_data is None:
        raise credentials_exception

    # Convert dict to User model
    user = User(
        id=user_data["id"],
        email=user_data["email"],
        password_hash=user_data["hashed_password"],
        name=user_data.get("name"),
        created_at=user_data["created_at"],
        updated_at=user_data["updated_at"]
    )

    return user