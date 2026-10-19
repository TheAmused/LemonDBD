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
        "tzbfxn8fcg2pccx-bbsj2fxcyn4dwabgusiutmvlx4y=",
        "changeme",
        "change-me",
        "change_me",
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
    two_factor_key = str(config.get("TWO_FACTOR_ENCRYPTION_KEY") or "").strip().lower()
    if two_factor_key and any(
        part.strip() in KNOWN_PLACEHOLDER_SECRETS for part in two_factor_key.split(",")
    ):
        warnings.append("TWO_FACTOR_ENCRYPTION_KEY is a publicly known placeholder value")
    if config.get("BAN_LIST_ENABLED"):
        warnings.extend(ban_list_pepper_problems(str(config.get("BAN_LIST_PEPPERS") or "")))
    return warnings


def fatal_secret_problems(config: Mapping[str, Any]) -> list[str]:
    """The signing-key problems the app refuses to start with (empty for tests and development).

    An empty or publicly known `SECRET_KEY` / `JWT_SECRET_KEY` lets anyone forge a session for
    any account, admins included, so production fails closed instead of only logging a warning.
    A merely short key stays a warning (`weak_secret_warnings`).
    """
    if config.get("TESTING") or demo_accounts_enabled():
        return []
    problems: list[str] = []
    for name in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = str(config.get(name) or "").strip()
        if not value:
            problems.append(f"{name} is not set")
        elif value.lower() in KNOWN_PLACEHOLDER_SECRETS:
            problems.append(f"{name} is a publicly known placeholder value")
    return problems


BAN_LIST_PEPPER_MIN_BYTES = 32


def parse_ban_list_peppers(raw: str) -> tuple[list[tuple[int, bytes]], list[str]]:
    """Parse `v2:<hex>,v1:<hex>` (newest first) into [(version, key bytes)] plus the problems found.

    A usable entry is `v<number>:<hex>` with at least 32 random bytes. Anything else is reported and
    skipped, never guessed at. Pure (no app imports) so config validation and the service share it.
    """
    peppers: list[tuple[int, bytes]] = []
    problems: list[str] = []
    seen: set[int] = set()
    for part in (raw or "").split(","):
        entry = part.strip()
        if not entry:
            continue
        label, sep, value = entry.partition(":")
        label = label.strip().lower()
        if not sep or not label.startswith("v") or not label[1:].isdigit() or int(label[1:]) > 32000:
            problems.append("an entry is not of the form v<number>:<hex>")
            continue
        version = int(label[1:])
        try:
            key = bytes.fromhex(value.strip())
        except ValueError:
            problems.append(f"the entry for {label} is not hexadecimal")
            continue
        if len(key) < BAN_LIST_PEPPER_MIN_BYTES:
            problems.append(f"the entry for {label} is shorter than {BAN_LIST_PEPPER_MIN_BYTES} bytes")
            continue
        if len(set(key)) < 8:
            problems.append(f"the entry for {label} is not random")
            continue
        if version in seen:
            problems.append(f"{label} appears twice")
            continue
        seen.add(version)
        peppers.append((version, key))
    return peppers, problems


def ban_list_pepper_problems(raw: str) -> list[str]:
    """Reasons the ban-evasion list cannot work with this BAN_LIST_PEPPERS value."""
    peppers, problems = parse_ban_list_peppers(raw)
    found = [f"BAN_LIST_PEPPERS: {problem}" for problem in problems]
    if not peppers and not found:
        found.append("BAN_LIST_PEPPERS is empty, so the ban-evasion e-mail list is switched off")
    return found


class Config:
    HOST: str = os.getenv("FLASK_RUN_HOST", os.getenv("HOST", "0.0.0.0"))
    PORT: int = int(os.getenv("FLASK_RUN_PORT", os.getenv("PORT", "5000")))
    DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    ENV: str = os.getenv("FLASK_ENV", "production")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dbd-lemon-secret-key-2026")
    # Matches nginx's `client_max_body_size 20M`, so a direct hit on the backend
    # (or a dev run without nginx) has the same ceiling instead of none.
    MAX_CONTENT_LENGTH: int = int(os.getenv("MAX_CONTENT_LENGTH", str(20 * 1024 * 1024)))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    # "auto" marks the session cookie Secure whenever the request arrived over HTTPS.
    SESSION_COOKIE_SECURE_MODE: str = os.getenv("SESSION_COOKIE_SECURE", "auto")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=int(os.getenv("JWT_EXPIRATION_HOURS", "24")))

    # Optional two-factor sign-in. TOTP secrets are stored encrypted with this Fernet key (a
    # comma-separated list: first encrypts, all decrypt). Defaults to the dev key (flagged by
    # weak_secret_warnings in production if not replaced).
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    TWO_FACTOR_ENCRYPTION_KEY: str = (
        os.getenv("TWO_FACTOR_ENCRYPTION_KEY") or "TZbfxN8fCG2Pccx-bBsj2fxcyN4dwABgUsIutMVLx4Y="
    )
    # Ban-evasion e-mail list: a permanent ban stores a keyed hash (HMAC-SHA256) of the account's
    # canonical e-mail, and sign-up refuses a matching address. Off until the Privacy Policy that
    # describes it is live; while off nothing is hashed, stored or checked. The key is separate from
    # SECRET_KEY on purpose (rotating or leaking one must not touch the other) and is never logged.
    # Format "v2:<hex>,v1:<hex>": newest first, at least 32 random bytes each. Generate one with
    #   python -c "import secrets; print('v1:' + secrets.token_hex(32))"
    BAN_LIST_ENABLED: bool = os.getenv("BAN_LIST_ENABLED", "false").lower() in ("true", "1", "yes")
    BAN_LIST_PEPPERS: str = os.getenv("BAN_LIST_PEPPERS", "")
    # Name shown in the authenticator app next to the account.
    TWO_FACTOR_ISSUER: str = os.getenv("TWO_FACTOR_ISSUER", "LemonDBD")

    # Webhook of the channel where published "What's New" entries are announced (an empty value turns it off).
    DISCORD_CHANGELOG_WEBHOOK_URL: str = os.getenv("DISCORD_CHANGELOG_WEBHOOK_URL", "")

    # Rate Limiting Configuration
    RATELIMIT_ENABLED: bool = os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    RATELIMIT_STORAGE_URI: str = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_STRATEGY: str = os.getenv("RATELIMIT_STRATEGY", "fixed-window")
    RATELIMIT_DEFAULT: str = os.getenv("RATELIMIT_DEFAULT", "200 per minute")
    # Sign-up / sign-in / password reset / guest bug reports must carry a solved ALTCHA challenge.
    ALTCHA_ENFORCED: bool = os.getenv("ALTCHA_ENFORCED", "true").lower() in ("true", "1", "yes")

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
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "5")),
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
    # Moderation emails: try to send right after the decision commits, in a background thread (the
    # scheduler job retries whatever failed). Off in tests, where delivery is inline and deterministic.
    SANCTION_EMAIL_ASYNC: bool = os.getenv("SANCTION_EMAIL_ASYNC", "true").lower() in ("true", "1", "yes")
    # Public address shown on the Privacy Policy page; falls back to the mail account.
    PRIVACY_CONTACT_EMAIL: str = os.getenv("PRIVACY_CONTACT_EMAIL") or MAIL_USERNAME
    REQUIRE_EMAIL_VERIFICATION: bool = os.getenv(
        "REQUIRE_EMAIL_VERIFICATION", "true"
    ).lower() in ("true", "1", "yes")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://localhost")

    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()

    # Public links. The admin Settings tab overrides each of them without a redeploy; these are the starting values.
    DISCORD_INVITE_URL: str = os.getenv("DISCORD_INVITE_URL", "https://discord.gg/Veygfp6XfT").strip()
    DONATION_BMC_URL: str = os.getenv("DONATION_BMC_URL", "https://buymeacoffee.com/lemondbd").strip()
    DONATION_KOFI_URL: str = os.getenv("DONATION_KOFI_URL", "https://ko-fi.com/lemondbd").strip()
    DONATION_PATREON_URL: str = os.getenv("DONATION_PATREON_URL", "https://patreon.com/lemondbd").strip()
    # Admin settings are cached per process for this many seconds (0 = read the database every time).
    SITE_SETTINGS_CACHE_SECONDS: int = int(os.getenv("SITE_SETTINGS_CACHE_SECONDS", "5"))


class TestingConfig(Config):
    TESTING: bool = True
    # A throwaway key that exists only for the test suite.
    TWO_FACTOR_ENCRYPTION_KEY: str = "TZbfxN8fCG2Pccx-bBsj2fxcyN4dwABgUsIutMVLx4Y="
    # Throwaway peppers that exist only for the test suite (v2 is the newest, v1 the retired one).
    BAN_LIST_ENABLED: bool = True
    BAN_LIST_PEPPERS: str = "v2:" + "a1b2c3d4e5f60718" * 4 + ",v1:" + "0f1e2d3c4b5a6978" * 4
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS: dict[str, Any] = {}
    RATELIMIT_ENABLED: bool = False
    ALTCHA_ENFORCED: bool = False
    SCHEDULER_ENABLED: bool = False
    SANCTION_EMAIL_ASYNC: bool = False
    SITE_SETTINGS_CACHE_SECONDS: int = 0