# backend/tests/unit/admin/test_admin_data_tools_audit.py
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
    res = client.post("/api/v1/users", json={"login": "deputy", "username": "deputy", "email": "deputy@example.com", "password": "password123", "role": "admin", "current_password": "password123"}, headers=headers)
    assert res.status_code == 201
    assert "user_created" in _actions()


@pytest.mark.unit
def test_export_and_purge_are_audited(client: FlaskClient, admin) -> None:
    _, headers = admin
    assert client.post("/api/v1/admin/database/export", json={"targets": ["perks"], "include_assets": False}, headers=headers).status_code == 200
    assert client.post("/api/v1/admin/database/purge", json={"targets": ["perks"], "current_password": "password123"}, headers=headers).status_code == 200
    assert {"database_exported", "database_purged"} <= set(_actions())


@pytest.mark.unit
def test_importing_never_rewrites_an_existing_accounts_credentials_role_or_standing(client: FlaskClient, admin) -> None:
    """An import used to set a known password hash, the admin role, `is_active` and the e-mail address."""
    _, headers = admin
    victim = User(login="player", username="player", email="player@example.com", password_hash=hash_password("old-password"), token_version=0)
    db.session.add(victim)
    db.session.commit()
    old_hash = victim.password_hash
    old_token = generate_token(victim.id, role="user")

    row = {"login": "player", "username": "Player Two", "email": "attacker@example.com", "password_hash": hash_password("new-password"), "role": "admin", "is_active": False, "is_verified": True}
    res = client.post(
        "/api/v1/admin/database/import",
        json={"current_password": "password123", "mode": "merge", "targets": ["users"], "data": {"users": [row]}},
        headers=headers,
    )
    assert res.status_code == 200, res.get_json()
    assert "database_imported" in _actions()
    db.session.expire_all()
    player = db.session.get(User, victim.id)
    assert (player.password_hash, player.role, player.is_active, player.email, player.is_verified) == (old_hash, "user", True, "player@example.com", False)
    assert player.username == "Player Two"
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_token}"}).get_json()["authenticated"] is True
