# backend/app/core/config.py
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dbd-lemon-secret-key-2026")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    
    # JWT Settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRATION_HOURS", "24")))
    
    # Database Configuration
    raw_db_url = os.getenv("DATABASE_URL")
    if raw_db_url:
        if raw_db_url.startswith("postgres://"):
            raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
        elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
            raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        SQLALCHEMY_DATABASE_URI = raw_db_url
    else:
        db_path = BASE_DIR / "data" / "lemon_dbd.db"
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"