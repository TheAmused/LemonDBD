# backend/tests/unit/api/test_admin_reauth.py
"""Granting admin rights and the bulk database tools need the acting admin to re-authenticate.

A stolen session cookie used to be enough to create an admin with a password of the attacker's
choosing, and then to pass every "confirm with your own password" check as that new admin.
"""
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core import totp
from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User

PASSWORD = "password123"


@pytest.fixture(autouse=True)
def _mail_sender(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")


def _account(login: str, role: str = "user") -> User:
    user = User(login=login, username=login, email=f"{login}@example.com", password_hash=hash_password(PASSWORD), role=role, is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


def _h(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


NEW_ADMIN = {"login": "deputy", "username": "deputy", "email": "deputy@example.com", "password": "Attacker-pass-1", "role": "admin"}


@pytest.mark.unit
def test_creating_an_admin_needs_the_actors_password(client: FlaskClient, db_session) -> None:
    boss = _account("boss", "admin")
    assert client.post("/api/v1/users", json=NEW_ADMIN, headers=_h(boss)).status_code == 403
    assert client.post("/api/v1/users", json={**NEW_ADMIN, "current_password": "wrong"}, headers=_h(boss)).status_code == 403
    assert db.session.query(User).filter_by(login="deputy").first() is None
    res = client.post("/api/v1/users", json={**NEW_ADMIN, "current_password": PASSWORD}, headers=_h(boss))
    assert res.status_code == 201
    assert "current_password" not in (res.get_json()["user"])


@pytest.mark.unit
def test_creating_a_player_needs_no_password(client: FlaskClient, db_session) -> None:
    boss = _account("boss", "admin")
    assert client.post("/api/v1/users", json={**NEW_ADMIN, "role": "user"}, headers=_h(boss)).status_code == 201


@pytest.mark.unit
def test_promoting_to_admin_needs_the_actors_password(client: FlaskClient, db_session) -> None:
    boss = _account("boss", "admin")
    player = _account("player")
    assert client.put(f"/api/v1/users/{player.id}", json={"role": "admin"}, headers=_h(boss)).status_code == 403
    db.session.expire_all()
    assert db.session.get(User, player.id).role == "user"
    assert client.put(f"/api/v1/users/{player.id}", json={"role": "admin", "current_password": PASSWORD}, headers=_h(boss)).status_code == 200


@pytest.mark.unit
def test_a_stolen_session_can_no_longer_strip_the_other_admins(client: FlaskClient, db_session) -> None:
    victim = _account("victim", "admin")
    stolen = _account("stolen", "admin")  # the attacker has this session, not its password
    assert client.post("/api/v1/users", json=NEW_ADMIN, headers=_h(stolen)).status_code == 403
    assert client.put(f"/api/v1/users/{victim.id}", json={"role": "user", "current_password": "Attacker-pass-1"}, headers=_h(stolen)).status_code == 403
    db.session.expire_all()
    assert db.session.get(User, victim.id).role == "admin"


@pytest.mark.unit
def test_import_and_purge_need_the_actors_password(client: FlaskClient, db_session) -> None:
    boss = _account("boss", "admin")
    body = {"mode": "merge", "data": {"challenge_mode_settings": []}}
    assert client.post("/api/v1/admin/database/import", json=body, headers=_h(boss)).status_code == 403
    assert client.post("/api/v1/admin/database/import", json={**body, "current_password": PASSWORD}, headers=_h(boss)).status_code == 200
    assert client.post("/api/v1/admin/database/purge", json={"targets": ["perks"]}, headers=_h(boss)).status_code == 403
    assert client.post("/api/v1/admin/database/purge", json={"targets": ["perks"], "current_password": PASSWORD}, headers=_h(boss)).status_code == 200


@pytest.mark.unit
def test_an_admin_with_two_factor_also_needs_a_code(client: FlaskClient, db_session) -> None:
    boss = _account("boss", "admin")
    setup = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_h(boss))
    assert setup.status_code == 200
    secret = setup.get_json()["secret"]
    assert client.post("/api/v1/auth/two-factor/enable", json={"code": totp.totp(secret)}, headers=_h(boss)).status_code == 200
    db.session.expire_all()
    boss = db.session.get(User, boss.id)

    res = client.post("/api/v1/users", json={**NEW_ADMIN, "current_password": PASSWORD}, headers=_h(boss))
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "reauth_two_factor_required"
    wrong = client.post("/api/v1/users", json={**NEW_ADMIN, "current_password": PASSWORD, "two_factor_code": "000000"}, headers=_h(boss))
    assert wrong.status_code == 403
    code = totp.hotp(secret, totp.current_step() + 1)
    ok = client.post("/api/v1/users", json={**NEW_ADMIN, "current_password": PASSWORD, "two_factor_code": code}, headers=_h(boss))
    assert ok.status_code == 201, ok.get_json()
