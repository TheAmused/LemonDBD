# backend/tests/unit/api/test_admin_data_tools_audit.py
"""The riskiest admin actions leave an audit entry, and an imported password signs old sessions out."""
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import AdminAuditLog, User


@pytest.fixture
def admin(db_session) -> tuple[User, dict[str, str]]:
    boss = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password("password123"), role="admin", is_verified=True)
    db.session.add(boss)
    db.session.commit()
    return boss, {"Authorization": f"Bearer {generate_token(boss.id, role='admin')}"}


def _actions() -> list[str]:
    return [row.action for row in db.session.query(AdminAuditLog).order_by(AdminAuditLog.id).all()]


@pytest.mark.unit
def test_creating_a_user_is_audited(client: FlaskClient, admin) -> None:
    _, headers = admin
    res = client.post("/api/v1/users", json={"login": "deputy", "username": "deputy", "email": "deputy@example.com", "password": "password123", "role": "admin"}, headers=headers)
    assert res.status_code == 201
    assert "user_created" in _actions()


@pytest.mark.unit
def test_export_and_purge_are_audited(client: FlaskClient, admin) -> None:
    _, headers = admin
    assert client.get("/api/v1/admin/database/export?targets=perks&include_assets=false", headers=headers).status_code == 200
    assert client.post("/api/v1/admin/database/purge", json={"targets": ["perks"]}, headers=headers).status_code == 200
    assert {"database_exported", "database_purged"} <= set(_actions())


@pytest.mark.unit
def test_importing_a_new_password_hash_bumps_the_token_version(client: FlaskClient, admin) -> None:
    _, headers = admin
    victim = User(login="player", username="player", email="player@example.com", password_hash=hash_password("old-password"), token_version=0)
    db.session.add(victim)
    db.session.commit()
    old_token = generate_token(victim.id, role="user")

    res = client.post(
        "/api/v1/admin/database/import",
        json={"mode": "merge", "targets": ["users"], "data": {"users": [{"login": "player", "email": "player@example.com", "password_hash": hash_password("new-password")}]}},
        headers=headers,
    )
    assert res.status_code == 200, res.get_json()
    assert "database_imported" in _actions()
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_token}"}).get_json()["authenticated"] is False
