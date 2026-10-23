# backend/tests/unit/test_reset_token_hashing.py
"""Password-reset tokens are stored as their SHA-256: the e-mailed link works, the stored value does not."""
import hashlib
import importlib.util
from pathlib import Path
from unittest.mock import patch

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

from app.core.extensions import db
from app.models import User
from app.services.user.auth import hash_reset_token
from app.core.security import hash_password

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "0029_hash_reset_tokens.py"


@pytest.fixture
def person(db_session) -> User:
    user = User(login="resetter", username="Resetter", email="resetter@example.com", password_hash=hash_password("old-password-1"), role="user", is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


def _request_link(client) -> str:
    with patch("app.services.user.auth.send_password_reset_email") as send:
        assert client.post("/api/v1/auth/forgot-password", json={"email": "resetter@example.com"}).status_code == 200
    (_user, token), _ = send.call_args
    return token


@pytest.mark.unit
def test_only_the_hash_is_stored(client, person) -> None:
    token = _request_link(client)
    db.session.refresh(person)
    assert person.reset_token == hashlib.sha256(token.encode()).hexdigest()
    assert token not in person.reset_token


@pytest.mark.unit
def test_the_emailed_token_resets_the_password(client, person) -> None:
    token = _request_link(client)
    res = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "new-password-1"})
    assert res.status_code == 200
    db.session.refresh(person)
    assert person.reset_token is None


@pytest.mark.unit
def test_the_stored_value_is_not_a_working_token(client, person) -> None:
    _request_link(client)
    db.session.refresh(person)
    res = client.post("/api/v1/auth/reset-password", json={"token": person.reset_token, "new_password": "new-password-1"})
    assert res.status_code == 400


@pytest.mark.unit
def test_the_link_carries_the_raw_token(app, person) -> None:
    from app.services import mail_service

    with app.app_context(), patch.object(mail_service.mail, "send") as send:
        mail_service.send_password_reset_email(person, "RAW-TOKEN")
    message = send.call_args.args[0]
    assert "reset-password?token=RAW-TOKEN" in (message.html or "")


@pytest.mark.unit
def test_the_migration_hashes_outstanding_tokens_once() -> None:
    spec = importlib.util.spec_from_file_location("migration_0029", MIGRATION)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, reset_token VARCHAR(255), reset_token_expires_at DATETIME)"))
        conn.execute(sa.text("INSERT INTO users (id, reset_token) VALUES (1, 'plain-token'), (2, NULL)"))
        for _ in range(2):
            with Operations.context(MigrationContext.configure(conn)):
                migration.upgrade()
        rows = dict(conn.execute(sa.text("SELECT id, reset_token FROM users")).all())
    assert rows == {1: hash_reset_token("plain-token"), 2: None}
