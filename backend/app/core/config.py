# backend/app/core/config.py
import os
from collections.abc import Mapping
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
        target_env = os.getenv("ENV_FILE", ".env.dev")
        target_path = ROOT_DIR / target_env
        if target_path.exists():
            load_dotenv(target_path, override=False)
    else:
        dev_env = ROOT_DIR / ".env.dev"
        if dev_env.exists():
            load_dotenv(dev_env, override=False)
        else:
            load_dotenv()
except ImportError:
    pass


def demo_accounts_enabled() -> bool:
    """True only when the app runs with FLASK_ENV=development.

    The demo accounts (lemon / user), their seed files and the sign-in quick-fill
    buttons all hang off this one switch. Anything else, including an unset
    variable, counts as production. Read at call time so a test can flip it.
    """
    return os.getenv("FLASK_ENV", "production").strip().lower() == "development"


# Values that ship in the repo, the compose file or .env.example: anyone can read them, so a
# production deployment that still signs sessions with one of them can be impersonated.
KNOWN_PLACEHOLDER_SECRETS = frozenset(
    {
        "dbd-lemon-secret-key-2026",
        "dev-secret-key-dbd-lemon-2026",
        "changeme",
        "change-me",
        "secret",
        "secret-key",
    }
)
MIN_SECRET_KEY_LENGTH = 32


def weak_secret_warnings(config: Mapping[str, Any]) -> list[str]:
    """Human-readable problems with the signing keys, empty when they look fine.

    Skipped (empty) for tests and for FLASK_ENV=development, where the placeholder keys are expected.
    """
    if config.get("TESTING") or demo_accounts_enabled():
        return []
    warnings: list[str] = []
    for name in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = str(config.get(name) or "")
        if value.strip().lower() in KNOWN_PLACEHOLDER_SECRETS:
            warnings.append(f"{name} is a publicly known placeholder value")
        elif len(value) < MIN_SECRET_KEY_LENGTH:
            warnings.append(f"{name} is shorter than {MIN_SECRET_KEY_LENGTH} characters")
    return warnings


class Config:
    HOST: str = os.getenv("FLASK_RUN_HOST", os.getenv("HOST", "0.0.0.0"))
    PORT: int = int(os.getenv("FLASK_RUN_PORT", os.getenv("PORT", "5000")))
    DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    ENV: str = os.getenv("FLASK_ENV", "production")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dbd-lemon-secret-key-2026")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    # "auto" marks the session cookie Secure whenever the request arrived over HTTPS.
    SESSION_COOKIE_SECURE_MODE: str = os.getenv("SESSION_COOKIE_SECURE", "auto")
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

    SCHEDULER_ENABLED: bool = os.getenv("SCHEDULER_ENABLED", "true").lower() in ("true", "1", "yes")
    STREAK_INACTIVITY_PRUNE_DAYS: int = int(os.getenv("STREAK_INACTIVITY_PRUNE_DAYS", "90"))

    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS: bool = os.getenv("MAIL_USE_TLS", "true").lower() in ("true", "1", "yes")
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER: str = os.getenv("MAIL_DEFAULT_SENDER") or MAIL_USERNAME
    # Public address shown on the Privacy Policy page; falls back to the mail account.
    PRIVACY_CONTACT_EMAIL: str = os.getenv("PRIVACY_CONTACT_EMAIL") or MAIL_USERNAME
    REQUIRE_EMAIL_VERIFICATION: bool = os.getenv(
        "REQUIRE_EMAIL_VERIFICATION", "true"
    ).lower() in ("true", "1", "yes")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://localhost")


class TestingConfig(Config):
    TESTING: bool = True
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS: dict[str, Any] = {}
    RATELIMIT_ENABLED: bool = False
    SCHEDULER_ENABLED: bool = False