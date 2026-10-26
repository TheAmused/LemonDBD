# backend/tests/unit/auth/test_registration_role.py
"""Sign-up creates players only: the role is never taken from the request."""
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.models import User


@pytest.mark.unit
@pytest.mark.parametrize("role", ["admin", "ADMIN", "user"])
def test_self_registration_cannot_choose_its_role(client: FlaskClient, db_session, role: str) -> None:
    login = f"sneaky_{role.lower()}{len(role)}"
    res = client.post(
        "/api/v1/auth/register",
        json={"login": login, "username": login, "email": f"{login}@example.com", "password": "password123", "role": role},
    )
    assert res.status_code == 201
    assert res.get_json()["user"]["role"] == "user"
    assert db.session.query(User).filter_by(login=login).one().role == "user"


@pytest.mark.unit
def test_admin_can_still_create_an_admin(client: FlaskClient, db_session) -> None:
    from app.core.security import generate_token, hash_password

    boss = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password("password123"), role="admin", is_verified=True)
    db.session.add(boss)
    db.session.commit()
    headers = {"Authorization": f"Bearer {generate_token(boss.id, role='admin')}"}
    res = client.post(
        "/api/v1/users",
        # Granting admin asks for the acting admin's own password (see test_admin_reauth).
        json={"login": "deputy", "username": "deputy", "email": "deputy@example.com", "password": "password123", "role": "admin", "current_password": "password123"},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.get_json()["user"]["role"] == "admin"
