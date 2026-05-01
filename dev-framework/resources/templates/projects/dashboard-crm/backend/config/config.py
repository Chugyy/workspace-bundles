# app/config.py
from pydantic import Field
from pydantic_settings import BaseSettings
import pathlib
from dotenv import load_dotenv

# Charger explicitement le fichier .env
env_path = pathlib.Path(__file__).parent / ".env"
load_dotenv(env_path)

class Settings(BaseSettings):
    app_name: str = Field("APP - Backend", env="APP_NAME")
    debug: bool = Field(False, env="DEBUG")
    host: str = Field("127.0.0.1", env="HOST")
    port: int = Field(8000, env="PORT")
    jwt_secret_key: str = Field(env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_expiration_hours: int = Field(24, env="JWT_EXPIRATION_HOURS")
    
    # Token d'administration pour les endpoints sensibles
    admin_token: str = Field(env="ADMIN_TOKEN")

    # Database
    db_host: str = Field("", env="DB_HOST")
    db_port: int = Field(5432, env="DB_PORT")
    db_name: str = Field("", env="DB_NAME")
    db_user: str = Field("", env="DB_USER")
    db_password: str = Field("", env="DB_PASSWORD")
    
    # Frontend URL pour les liens dans les emails
    frontend_url: str = Field("", env="FRONTEND_URL")

    class Config:
        env_file = pathlib.Path(__file__).parent / "config/.env"
        env_file_encoding = "utf-8"

settings = Settings()