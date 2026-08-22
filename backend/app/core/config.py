# backend/app/core/config.py
import os
import tempfile
from datetime import timedelta
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent

# Automatically load environment variables from .env files if present
try:
    from dotenv import load_dotenv

    # Try loading from backend/.env first, then root/.env
    backend_env = BASE_DIR / ".env"
    root_env = ROOT_DIR / ".env"
    if backend_env.exists():
        load_dotenv(backend_env, override=False)
    elif root_env.exists():
        load_dotenv(root_env, override=False)
    else:
        load_dotenv()
except ImportError:
    pass


class Config:
    # Server / Runtime Settings
    HOST = os.getenv("FLASK_RUN_HOST", os.getenv("HOST", "0.0.0.0"))
    PORT = int(os.getenv("FLASK_RUN_PORT", os.getenv("PORT", "5000")))
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    ENV = os.getenv("FLASK_ENV", "production")

    # Security & Tokens
    SECRET_KEY = os.getenv("SECRET_KEY", "dbd-lemon-secret-key-2026")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # JWT Settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRATION_HOURS", "24")))

    # Database Configuration (PostgreSQL with psycopg3 driver)
    raw_db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://dbd_user:dbd_pass@localhost:5432/dbd_db",
    )
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    SQLALCHEMY_DATABASE_URI = raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }

    # Background Tasks & Initial Scrape
    INITIAL_SCRAPE_ENABLED = os.getenv("INITIAL_SCRAPE_ENABLED", "true").lower() in ("true", "1", "yes")
    SCRAPE_LOCK_FILE = os.getenv(
        "SCRAPE_LOCK_FILE",
        str(Path(tempfile.gettempdir()) / "dbd_initial_scrape.lock"),
    )

    # Streak Challenge Pool Cleanup
    STREAK_INACTIVITY_PRUNE_DAYS = int(os.getenv("STREAK_INACTIVITY_PRUNE_DAYS", "90"))


class TestingConfig(Config):
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    INITIAL_SCRAPE_ENABLED = False