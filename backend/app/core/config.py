# backend/app/core/config.py
import os
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent

try:
    from dotenv import load_dotenv

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
    HOST: str = os.getenv("FLASK_RUN_HOST", os.getenv("HOST", "0.0.0.0"))
    PORT: int = int(os.getenv("FLASK_RUN_PORT", os.getenv("PORT", "5000")))
    DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    ENV: str = os.getenv("FLASK_ENV", "production")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dbd-lemon-secret-key-2026")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=int(os.getenv("JWT_EXPIRATION_HOURS", "24")))

    # Rate Limiting Configuration
    RATELIMIT_ENABLED: bool = os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    RATELIMIT_STORAGE_URI: str = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_STRATEGY: str = os.getenv("RATELIMIT_STRATEGY", "fixed-window")
    RATELIMIT_DEFAULT: str = os.getenv("RATELIMIT_DEFAULT", "200 per minute")

    raw_db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://dbd_user:dbd_pass@localhost:5432/dbd_db",
    )
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    SQLALCHEMY_DATABASE_URI: str = raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict[str, Any] = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "20")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "30")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
    }

    INITIAL_SCRAPE_ENABLED: bool = os.getenv("INITIAL_SCRAPE_ENABLED", "true").lower() in ("true", "1", "yes")
    SCRAPE_LOCK_FILE: str = os.getenv(
        "SCRAPE_LOCK_FILE",
        str(Path(tempfile.gettempdir()) / "dbd_initial_scrape.lock"),
    )

    SCHEDULER_ENABLED: bool = os.getenv("SCHEDULER_ENABLED", "true").lower() in ("true", "1", "yes")
    STREAK_INACTIVITY_PRUNE_DAYS: int = int(os.getenv("STREAK_INACTIVITY_PRUNE_DAYS", "90"))

    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS: bool = os.getenv("MAIL_USE_TLS", "true").lower() in ("true", "1", "yes")
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER: str = os.getenv("MAIL_DEFAULT_SENDER") or MAIL_USERNAME

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://localhost")


class TestingConfig(Config):
    TESTING: bool = True
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS: dict[str, Any] = {}
    INITIAL_SCRAPE_ENABLED: bool = False
    RATELIMIT_ENABLED: bool = False
    SCHEDULER_ENABLED: bool = False