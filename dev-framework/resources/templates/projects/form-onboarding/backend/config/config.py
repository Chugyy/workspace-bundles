# config/config.py
from pydantic import Field
from pydantic_settings import BaseSettings
import pathlib
from dotenv import load_dotenv

env_path = pathlib.Path(__file__).parent / ".env"
load_dotenv(env_path)

class Settings(BaseSettings):
    app_name: str = Field("Formulaire Onboarding - Backend", env="APP_NAME")
    debug: bool = Field(False, env="DEBUG")
    host: str = Field("127.0.0.1", env="HOST")
    port: int = Field(8000, env="PORT")

    # Database
    db_host: str = Field("", env="DB_HOST")
    db_port: int = Field(5432, env="DB_PORT")
    db_name: str = Field("", env="DB_NAME")
    db_user: str = Field("", env="DB_USER")
    db_password: str = Field("", env="DB_PASSWORD")

    # Admin
    admin_password: str = Field("admin", env="ADMIN_PASSWORD")
    admin_jwt_secret: str = Field("change-me-in-production", env="ADMIN_JWT_SECRET")

    # SMTP
    smtp_host: str = Field("", env="SMTP_HOST")
    smtp_port: int = Field(587, env="SMTP_PORT")
    smtp_user: str = Field("", env="SMTP_USER")
    smtp_password: str = Field("", env="SMTP_PASSWORD")
    smtp_from: str = Field("", env="SMTP_FROM")

    class Config:
        env_file = pathlib.Path(__file__).parent / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
