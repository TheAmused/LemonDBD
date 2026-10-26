# backend/tests/unit/auth/test_resend_cooldown.py
"""The resend cooldown counts from when the last code / link was sent, whatever the lifetime setting says.

It used to be worked out as `expires_at - <current lifetime>`: after an admin shortened reset links
from 60 to 5 minutes, asking again two minutes later answered "Please wait 3240s".
"""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

from app.core.extensions import db
from app.core.security import hash_password
from app.models import User
from app.services import site_settings
from app.services.user import auth as auth_module

MIGRATION = Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0027_user_code_sent_at.py"


def _later(minutes: float):
    """Patch the auth module's clock `minutes` ahead."""
    moment = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    class _Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return moment

    return patch.object(auth_module, "datetime", _Clock)


@pytest.fixture
def person(db_session) -> User:
    user = User(login="person", username="person", email="person@example.com", password_hash=hash_password("password123"), is_verified=False)
    db.session.add(user)
    db.session.commit()
    return user


@pytest.mark.unit
def test_shortening_the_reset_lifetime_does_not_block_new_reset_mails(client, person) -> None:
    with patch("app.services.user.auth.send_password_reset_email") as send:
        assert client.post("/api/v1/auth/forgot-password", json={"email": "person@example.com"}).status_code == 200
        site_settings.update_settings({"reset_token_minutes": 5})
        site_settings.invalidate_cache()
        with _later(2):
            assert client.post("/api/v1/auth/forgot-password", json={"email": "person@example.com"}).status_code == 200
    assert send.call_count == 2


@pytest.mark.unit
def test_inside_the_cooldown_nothing_is_sent_and_the_answer_does_not_reveal_the_account(client, person) -> None:
    with patch("app.services.user.auth.send_password_reset_email") as send:
        first = client.post("/api/v1/auth/forgot-password", json={"email": "person@example.com"})
        again = client.post("/api/v1/auth/forgot-password", json={"email": "person@example.com"})
        unknown = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert first.status_code == again.status_code == unknown.status_code == 200
    assert again.get_json() == unknown.get_json()
    assert send.call_count == 1


@pytest.mark.unit
def test_shortening_the_code_lifetime_does_not_block_resending_the_code(client, person) -> None:
    with patch("app.services.user.auth.send_verification_email") as send:
        assert client.post("/api/v1/auth/resend-verification", json={"email": "person@example.com"}).status_code == 200
        site_settings.update_settings({"verification_code_hours": 1})
        site_settings.invalidate_cache()
        with _later(2):
            assert client.post("/api/v1/auth/resend-verification", json={"email": "person@example.com"}).status_code == 200
    assert send.call_count == 2


@pytest.mark.unit
def test_a_code_sent_before_the_send_time_was_stored_is_not_blocked_by_a_shorter_lifetime(client, person) -> None:
    person.reset_token = "old-token"
    person.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=55)  # sent 5 min ago under 60
    person.reset_sent_at = None
    db.session.commit()
    site_settings.update_settings({"reset_token_minutes": 5})
    site_settings.invalidate_cache()
    with patch("app.services.user.auth.send_password_reset_email") as send:
        assert client.post("/api/v1/auth/forgot-password", json={"email": "person@example.com"}).status_code == 200
    assert send.call_count == 1


def _run(conn: sa.Connection, step) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        step()


@pytest.mark.unit
def test_the_migration_adds_both_columns_once() -> None:
    spec = importlib.util.spec_from_file_location("migration_0027", MIGRATION)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, login VARCHAR(50))"))
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)
        assert {"verification_sent_at", "reset_sent_at"} <= {c["name"] for c in sa.inspect(conn).get_columns("users")}
        _run(conn, migration.downgrade)
        assert "reset_sent_at" not in {c["name"] for c in sa.inspect(conn).get_columns("users")}
