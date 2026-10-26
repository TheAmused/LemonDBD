# backend/tests/unit/admin/test_admin_import_invariants.py
"""A database import keeps the rules every other write path keeps (audit log, sanctions, accounts)."""
import pytest
from flask.testing import FlaskClient
from sqlalchemy import select

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import AdminAuditLog, User
from app.models.sanction import UserSanction

PASSWORD = "password123"


def _account(login: str, role: str = "user") -> User:
    user = User(login=login, username=login, email=f"{login}@example.com", password_hash=hash_password(PASSWORD), role=role, is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


def _import(client: FlaskClient, admin: User, data: dict, mode: str = "merge"):
    return client.post(
        "/api/v1/admin/database/import",
        json={"current_password": PASSWORD, "mode": mode, "data": data},
        headers={"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"},
    )


@pytest.mark.unit
def test_replace_mode_cannot_wipe_or_forge_the_audit_log(client: FlaskClient, db_session) -> None:
    alpha, bravo = _account("alpha", "admin"), _account("bravo", "admin")
    for i in range(3):
        db.session.add(AdminAuditLog(admin_user_id=alpha.id, action="user_banned", target_type="user", target_id=str(i)))
    db.session.commit()
    forged = {"admin_audit_logs": [{"admin_login": "bravo", "action": "database_purged", "target_type": "database"}]}
    assert _import(client, alpha, forged, mode="replace").status_code == 200
    rows = db.session.scalars(select(AdminAuditLog)).all()
    assert sum(row.action == "user_banned" for row in rows) == 3
    assert not any(row.admin_user_id == bravo.id for row in rows)


@pytest.mark.unit
def test_an_import_cannot_lift_a_ban(client: FlaskClient, db_session) -> None:
    admin = _account("boss", "admin")
    baddie = _account("baddie")
    res = client.post(
        f"/api/v1/admin/users/{baddie.id}/sanctions",
        json={"kind": "ban", "reason_code": "spam", "facts": "spam", "send_email": False},
        headers={"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"},
    )
    assert res.status_code == 201
    assert _import(client, admin, {"users": [{"login": "baddie", "is_active": True, "role": "admin"}]}).status_code == 200
    db.session.expire_all()
    user = db.session.get(User, baddie.id)
    assert (user.is_active, user.role) == (False, "user")
    assert db.session.scalars(select(UserSanction).where(UserSanction.user_id == baddie.id, UserSanction.revoked_at.is_(None))).one()


@pytest.mark.unit
def test_new_accounts_need_a_real_unused_address_and_a_known_role(client: FlaskClient, db_session) -> None:
    admin = _account("boss", "admin")
    rows = [
        {"login": "no_mail"},
        {"login": "bad_mail", "email": "not-an-address"},
        {"login": "taken_mail", "email": "boss@example.com"},
        {"login": "fresh", "email": "Fresh@Example.com", "role": "superuser"},
    ]
    res = _import(client, admin, {"users": rows})
    assert res.status_code == 200
    assert res.get_json()["summary"]["users"] == {"created": 1, "updated": 0, "skipped": 3}
    fresh = db.session.scalar(select(User).where(User.login == "fresh"))
    assert (fresh.email, fresh.role) == ("fresh@example.com", "user")
    assert db.session.scalar(select(User).where(User.email.like("%@lemondbd.com"))) is None
