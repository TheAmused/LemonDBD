# backend/tests/unit/test_fatal_secrets.py
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
