# backend/tests/unit/api/test_admin_on_admin_actions.py
"""One admin session cannot quietly strip another admin: delete is refused, demotion and 2FA reset need a password."""
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User

PASSWORD = "password123"


def _admin(login: str) -> tuple[User, dict[str, str]]:
    user = User(login=login, username=login, email=f"{login}@example.com", password_hash=hash_password(PASSWORD), role="admin", is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user, {"Authorization": f"Bearer {generate_token(user.id, role='admin')}"}


@pytest.fixture
def admins(db_session):
    return _admin("alpha"), _admin("bravo")


@pytest.mark.unit
def test_another_admin_cannot_be_deleted(client: FlaskClient, admins) -> None:
    (_, headers), (bravo, _) = admins
    assert client.delete(f"/api/v1/users/{bravo.id}", headers=headers).status_code == 400
    assert db.session.get(User, bravo.id) is not None


@pytest.mark.unit
def test_demoting_another_admin_needs_the_actors_password(client: FlaskClient, admins) -> None:
    (_, headers), (bravo, _) = admins
    assert client.put(f"/api/v1/users/{bravo.id}", json={"role": "user"}, headers=headers).status_code == 403
    assert client.put(f"/api/v1/users/{bravo.id}", json={"role": "user", "current_password": "wrong"}, headers=headers).status_code == 403
    db.session.expire_all()
    assert db.session.get(User, bravo.id).role == "admin"

    res = client.put(f"/api/v1/users/{bravo.id}", json={"role": "user", "current_password": PASSWORD}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["user"]["role"] == "user"
    # Once a player, the account can be deleted as usual.
    assert client.delete(f"/api/v1/users/{bravo.id}", headers=headers).status_code == 200


@pytest.mark.unit
def test_renaming_another_admin_needs_no_password(client: FlaskClient, admins) -> None:
    (_, headers), (bravo, _) = admins
    assert client.put(f"/api/v1/users/{bravo.id}", json={"username": "bravo-two"}, headers=headers).status_code == 200


@pytest.mark.unit
def test_resetting_another_admins_two_factor_needs_the_actors_password(client: FlaskClient, admins) -> None:
    (_, headers), (bravo, _) = admins
    assert client.post(f"/api/v1/users/{bravo.id}/two-factor/reset", headers=headers).status_code == 403
    assert client.post(f"/api/v1/users/{bravo.id}/two-factor/reset", json={"current_password": PASSWORD}, headers=headers).status_code == 200


@pytest.mark.unit
def test_players_are_unaffected(client: FlaskClient, admins) -> None:
    (_, headers), _ = admins
    player = User(login="player", username="player", email="player@example.com", password_hash=hash_password(PASSWORD))
    db.session.add(player)
    db.session.commit()
    assert client.post(f"/api/v1/users/{player.id}/two-factor/reset", headers=headers).status_code == 200
    assert client.delete(f"/api/v1/users/{player.id}", headers=headers).status_code == 200


@pytest.mark.unit
def test_an_admin_cannot_reset_their_own_two_factor_here(client: FlaskClient, admins) -> None:
    """The profile's own switch needs the password and a code; this reset needs neither."""
    (alpha, headers), _ = admins
    assert client.post(f"/api/v1/users/{alpha.id}/two-factor/reset", json={"current_password": PASSWORD}, headers=headers).status_code == 400


@pytest.mark.unit
def test_a_refused_disable_changes_nothing_else(client: FlaskClient, admins) -> None:
    """Banning an admin is refused; the rename sent with it used to be saved anyway."""
    (_, headers), (bravo, _) = admins
    res = client.put(f"/api/v1/users/{bravo.id}", json={"username": "renamed", "is_active": False}, headers=headers)
    assert res.status_code == 400
    db.session.expire_all()
    assert db.session.get(User, bravo.id).username == "bravo"
