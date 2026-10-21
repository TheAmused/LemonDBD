# backend/tests/unit/test_env_example.py
"""`.env.example` documents every variable the stack reads, `.env.prod.example` has the same keys
with production values, and a documented backend setting actually reaches the container."""
import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = ROOT / ".env.example"
PROD_EXAMPLE = ROOT / ".env.prod.example"
COMPOSE_BASE = ROOT / "docker-compose.base.yml"

pytestmark = [
    pytest.mark.unit,
    pytest.mark.skipif(not EXAMPLE.exists(), reason="repository root not available (backend image)"),
]

#: Set by the OS, the test runner or Node itself, never by an operator.
NOT_CONFIGURATION = {"PATH", "HOME", "HOSTNAME", "TESTING", "NODE_ENV", "NEXT_RUNTIME", "CI", "PYTHONPATH"}
#: Read by the backend but only for a bare `python run.py` / the env-file loader, never in a container.
HOST_ONLY = {"ENV_FILE", "FLASK_RUN_HOST", "FLASK_RUN_PORT", "HOST", "PORT", "FLASK_APP", "SEED_UPDATES_DIR"}
#: gunicorn knobs and app internals with sane defaults, documented as "normally left alone".
NOT_PASSED_ON_PURPOSE = {
    "GUNICORN_BIND", "GUNICORN_WORKER_CLASS", "GUNICORN_WORKER_TMP_DIR", "GUNICORN_KEEPALIVE",
    "GUNICORN_PRELOAD", "GUNICORN_MAX_REQUESTS", "GUNICORN_MAX_REQUESTS_JITTER", "JWT_ALGORITHM",
    "RATELIMIT_STORAGE_URI", "RATELIMIT_STRATEGY", "SITE_SETTINGS_CACHE_SECONDS", "SANCTION_EMAIL_ASYNC",
}


def _keys(path: Path, *, include_commented: bool) -> dict[str, str]:
    pattern = r"^#?\s*([A-Z][A-Z0-9_]*)=(.*)$" if include_commented else r"^([A-Z][A-Z0-9_]*)=(.*)$"
    return {m.group(1): m.group(2).strip() for m in re.finditer(pattern, path.read_text(encoding="utf-8"), re.M)}


def _backend_reads() -> set[str]:
    names: set[str] = set()
    files = [*(ROOT / "backend" / "app").rglob("*.py"), *(ROOT / "backend" / "scripts").glob("*.py")]
    files += [ROOT / "backend" / "gunicorn.conf.py", ROOT / "backend" / "run.py"]
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        names |= set(re.findall(r"os\.(?:getenv|environ\.get)\(\s*[\"']([A-Z0-9_]+)", text))
        names |= set(re.findall(r"os\.environ\[\s*[\"']([A-Z0-9_]+)", text))
    return names - NOT_CONFIGURATION


def _frontend_reads() -> set[str]:
    names: set[str] = set()
    src = ROOT / "frontend" / "src"
    for path in [*src.rglob("*.ts"), *src.rglob("*.tsx"), ROOT / "frontend" / "next.config.ts"]:
        if "__tests__" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        names |= set(re.findall(r"process\.env\.([A-Z0-9_]+)", text))
        names |= set(re.findall(r"process\.env\[['\"]([A-Z0-9_]+)", text))
    return names - NOT_CONFIGURATION


def _compose_reads() -> set[str]:
    names: set[str] = set()
    for name in ("docker-compose.base.yml", "docker-compose.dev.yml", "docker-compose.prod.yml", "docker-compose.yml"):
        names |= set(re.findall(r"\$\{([A-Z0-9_]+)", (ROOT / name).read_text(encoding="utf-8")))
    return names


def test_every_variable_the_stack_reads_is_documented() -> None:
    documented = set(_keys(EXAMPLE, include_commented=True))
    missing = sorted((_backend_reads() | _frontend_reads() | _compose_reads()) - documented)
    assert not missing, f"read by the code or compose but not in .env.example: {missing}"


def test_documented_backend_settings_reach_the_container() -> None:
    services = yaml.safe_load(COMPOSE_BASE.read_text(encoding="utf-8"))["services"]
    env = services["backend"]["environment"]
    passed = set(env) if isinstance(env, dict) else {str(item).split("=", 1)[0] for item in env}
    documented = set(_keys(EXAMPLE, include_commented=True))
    lost = sorted((_backend_reads() & documented) - passed - HOST_ONLY - NOT_PASSED_ON_PURPOSE)
    assert not lost, f"documented in .env.example but never passed to the backend container: {lost}"


def test_prod_example_has_the_same_keys_with_production_values() -> None:
    dev, prod = _keys(EXAMPLE, include_commented=False), _keys(PROD_EXAMPLE, include_commented=False)
    assert set(prod) == set(dev)
    assert prod["FLASK_ENV"] == "production" and prod["FLASK_DEBUG"] == "false"
    assert prod["SESSION_COOKIE_SECURE"] == "true"
    assert prod["RATELIMIT_ENABLED"] == "true" and prod["ALTCHA_ENFORCED"] == "true"
    for secret in ("SECRET_KEY", "JWT_SECRET_KEY", "TWO_FACTOR_ENCRYPTION_KEY", "POSTGRES_PASSWORD",
                   "UMAMI_APP_SECRET", "UMAMI_ADMIN_PASSWORD", "PGADMIN_DEFAULT_PASSWORD"):
        assert prod[secret] == "", f"{secret} must be left for the operator to fill in"
    assert "*" not in prod["CORS_ORIGINS"]
