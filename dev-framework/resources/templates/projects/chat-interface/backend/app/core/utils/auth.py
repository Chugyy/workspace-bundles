# auth.py

from datetime import datetime, timedelta
from typing import Optional, Union, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
from requests_oauthlib import OAuth2Session

from config.config import settings
from app.database.crud.users import get_user_by_email, get_user_by_id as get_user, create_user
from app.database.models import User

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

def authenticate_user(email: str, password: str) -> Union[User, bool]:
    """Authentifie un utilisateur par email."""
    user = get_user_by_email(email)
    
    if not user:
        return False
        
    if not verify_password(password, user.password_hash):
        return False
        
    return user

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Validates JWT token (no DB lookup). Returns sub claim. Use on all protected routes."""
    sub = verify_token(credentials.credentials)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return sub


async def require_auth_query(token: str = Query(..., description="JWT token (for SSE)")) -> str:
    """Query-param JWT auth for EventSource/SSE endpoints that can't send headers."""
    sub = verify_token(token)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return sub


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
    
    user = get_user_by_email(username)
    if user is None:
        raise credentials_exception
    
    return user