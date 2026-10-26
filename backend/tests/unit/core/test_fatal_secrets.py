# backend/tests/unit/core/test_fatal_secrets.py
"""Production refuses to start with an empty or publicly known signing key."""
import pytest

from app.core.config import fatal_secret_problems

STRONG = "x" * 48


@pytest.mark.unit
def test_placeholder_and_empty_keys_are_fatal_in_production(monkeypatch) -> None:
    monkeypatch.setenv("FLASK_ENV", "production")
    assert fatal_secret_problems({"SECRET_KEY": "dbd-lemon-secret-key-2026", "JWT_SECRET_KEY": STRONG}) == [
        "SECRET_KEY is a publicly known placeholder value"
    ]
    assert fatal_secret_problems({"SECRET_KEY": STRONG, "JWT_SECRET_KEY": ""}) == ["JWT_SECRET_KEY is not set"]
    assert fatal_secret_problems({"SECRET_KEY": STRONG, "JWT_SECRET_KEY": STRONG}) == []


@pytest.mark.unit
def test_development_and_tests_are_exempt(monkeypatch) -> None:
    monkeypatch.setenv("FLASK_ENV", "development")
    assert fatal_secret_problems({"SECRET_KEY": "dbd-lemon-secret-key-2026"}) == []
    monkeypatch.setenv("FLASK_ENV", "production")
    assert fatal_secret_problems({"TESTING": True, "SECRET_KEY": ""}) == []


@pytest.mark.unit
def test_create_app_refuses_to_start(monkeypatch) -> None:
    from app import create_app
    from app.core.config import TestingConfig

    class InsecureProduction(TestingConfig):
        TESTING = False
        SECRET_KEY = "dbd-lemon-secret-key-2026"
        JWT_SECRET_KEY = "dbd-lemon-secret-key-2026"

    monkeypatch.setenv("FLASK_ENV", "production")
    with pytest.raises(RuntimeError, match="Refusing to start"):
        create_app(InsecureProduction)


@pytest.mark.unit
def test_public_two_factor_key_is_fatal_in_production(monkeypatch) -> None:
    from app.core.config import DEV_TWO_FACTOR_ENCRYPTION_KEY

    monkeypatch.setenv("FLASK_ENV", "production")
    base = {"SECRET_KEY": STRONG, "JWT_SECRET_KEY": STRONG, "CORS_ORIGINS": "https://lemondbd.example"}
    assert fatal_secret_problems({**base, "TWO_FACTOR_ENCRYPTION_KEY": DEV_TWO_FACTOR_ENCRYPTION_KEY}) == [
        "TWO_FACTOR_ENCRYPTION_KEY is a publicly known placeholder value"
    ]
    # Rotation lists are checked entry by entry.
    assert fatal_secret_problems(
        {**base, "TWO_FACTOR_ENCRYPTION_KEY": "bmV3LWtleQ==," + DEV_TWO_FACTOR_ENCRYPTION_KEY}
    ) == ["TWO_FACTOR_ENCRYPTION_KEY is a publicly known placeholder value"]
    # Empty is fine: two-factor sign-in is simply unavailable.
    assert fatal_secret_problems({**base, "TWO_FACTOR_ENCRYPTION_KEY": ""}) == []


@pytest.mark.unit
def test_wildcard_cors_is_fatal_in_production(monkeypatch) -> None:
    monkeypatch.setenv("FLASK_ENV", "production")
    base = {"SECRET_KEY": STRONG, "JWT_SECRET_KEY": STRONG}
    expected = ["CORS_ORIGINS allows every origin (*) while credentials are allowed"]
    assert fatal_secret_problems({**base, "CORS_ORIGINS": "*"}) == expected
    assert fatal_secret_problems({**base, "CORS_ORIGINS": "https://a.example, *"}) == expected
    assert fatal_secret_problems({**base, "CORS_ORIGINS": ["*"]}) == expected
    assert fatal_secret_problems({**base, "CORS_ORIGINS": "https://a.example,https://b.example"}) == []


@pytest.mark.unit
def test_two_factor_key_only_falls_back_in_development(monkeypatch) -> None:
    import importlib

    import app.core.config as config_module

    monkeypatch.delenv("TWO_FACTOR_ENCRYPTION_KEY", raising=False)
    try:
        monkeypatch.setenv("FLASK_ENV", "production")
        assert importlib.reload(config_module).Config.TWO_FACTOR_ENCRYPTION_KEY == ""
        monkeypatch.setenv("FLASK_ENV", "development")
        reloaded = importlib.reload(config_module)
        assert reloaded.Config.TWO_FACTOR_ENCRYPTION_KEY == reloaded.DEV_TWO_FACTOR_ENCRYPTION_KEY
    finally:
        monkeypatch.undo()
        importlib.reload(config_module)


@pytest.mark.unit
def test_cors_defaults_to_the_frontend_origin(monkeypatch) -> None:
    import importlib

    import app.core.config as config_module

    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://lemondbd.example/")
    try:
        assert importlib.reload(config_module).Config.CORS_ORIGINS == "https://lemondbd.example"
    finally:
        monkeypatch.undo()
        importlib.reload(config_module)
