# backend/tests/unit/test_compose_process_env.py
"""The scheduler runs create_app() like the backend, so compose must hand it the same keys."""
from pathlib import Path

import pytest
import yaml

COMPOSE = Path(__file__).resolve().parents[3] / "docker-compose.base.yml"

# Read by create_app()'s production checks or by the scheduled jobs themselves.
SHARED_KEYS = (
    "FLASK_ENV",
    "SECRET_KEY",
    "JWT_SECRET_KEY",
    "TWO_FACTOR_ENCRYPTION_KEY",
    "CORS_ORIGINS",
    "BAN_LIST_ENABLED",
    "BAN_LIST_PEPPERS",
    "DATABASE_URL",
    "MAIL_SERVER",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "FRONTEND_URL",
)


def _env_names(service: dict) -> set[str]:
    env = service.get("environment") or []
    if isinstance(env, dict):
        return set(env)
    return {str(item).split("=", 1)[0] for item in env}


@pytest.mark.unit
@pytest.mark.skipif(not COMPOSE.exists(), reason="compose file not shipped with the backend image")
def test_scheduler_gets_the_keys_create_app_needs() -> None:
    services = yaml.safe_load(COMPOSE.read_text(encoding="utf-8"))["services"]
    backend, scheduler = _env_names(services["backend"]), _env_names(services["scheduler"])
    for key in SHARED_KEYS:
        assert key in backend, f"backend is missing {key}"
        assert key in scheduler, f"scheduler is missing {key}"


@pytest.mark.unit
def test_empty_jwt_secret_falls_back_to_secret_key(monkeypatch) -> None:
    import importlib

    import app.core.config as config_module

    monkeypatch.setenv("SECRET_KEY", "s" * 48)
    monkeypatch.setenv("JWT_SECRET_KEY", "")
    try:
        assert importlib.reload(config_module).Config.JWT_SECRET_KEY == "s" * 48
    finally:
        monkeypatch.undo()
        importlib.reload(config_module)
