# backend/tests/unit/test_login_and_username.py
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token
from app.models import User

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
PROFILE = "/api/v1/auth/profile"


def _register(client: FlaskClient, login: str, username: str, email: str):
    return client.post(
        REGISTER,
        json={"login": login, "username": username, "email": email, "password": "password123"},
    )


def test_register_stores_login_and_public_username_separately(client: FlaskClient) -> None:
    res = _register(client, "secret_login", "Shown Name", "a@example.com")
    assert res.status_code == 201
    user = res.get_json()["user"]
    assert user["login"] == "secret_login"
    assert user["username"] == "Shown Name"


def test_register_requires_both_names(client: FlaskClient) -> None:
    only_username = client.post(
        REGISTER, json={"username": "Shown", "email": "b@example.com", "password": "password123"}
    )
    only_login = client.post(
        REGISTER, json={"login": "loginonly", "email": "c@example.com", "password": "password123"}
    )
    assert only_username.status_code == 400
    assert only_login.status_code == 400


def test_login_cannot_contain_at_sign_or_spaces(client: FlaskClient) -> None:
    assert _register(client, "me@home", "Shown", "d@example.com").status_code == 400
    assert _register(client, "two words", "Shown", "e@example.com").status_code == 400


def test_login_is_unique_ignoring_case_but_username_is_not(client: FlaskClient) -> None:
    assert _register(client, "Taken_Login", "Same Name", "f@example.com").status_code == 201
    clash = _register(client, "taken_login", "Another", "g@example.com")
    assert clash.status_code == 400
    assert "Login" in clash.get_json()["error"]
    assert _register(client, "other_login", "Same Name", "h@example.com").status_code == 201


def test_sign_in_with_login_or_email_but_not_the_public_username(client: FlaskClient) -> None:
    _register(client, "real_login", "Public Name", "i@example.com")
    assert client.post(LOGIN, json={"login": "real_login", "password": "password123"}).status_code == 200
    assert client.post(LOGIN, json={"login": "REAL_LOGIN", "password": "password123"}).status_code == 200
    assert client.post(LOGIN, json={"login": "i@example.com", "password": "password123"}).status_code == 200
    assert client.post(LOGIN, json={"login": "Public Name", "password": "password123"}).status_code == 401


def test_username_can_be_changed_but_login_cannot(client: FlaskClient) -> None:
    _register(client, "fixed_login", "Old Name", "j@example.com")
    user = db.session.query(User).filter_by(login="fixed_login").one()
    headers = {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}

    res = client.put(
        PROFILE,
        json={"username": "New Name", "login": "hijacked", "current_password": "password123"},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.get_json()["user"]
    assert body["username"] == "New Name"
    assert body["login"] == "fixed_login"

    too_short = client.put(
        PROFILE, json={"username": "ab", "current_password": "password123"}, headers=headers
    )
    assert too_short.status_code == 400


def test_username_change_needs_the_current_password(client: FlaskClient) -> None:
    _register(client, "pw_needed", "Before", "k@example.com")
    user = db.session.query(User).filter_by(login="pw_needed").one()
    headers = {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}

    assert client.put(PROFILE, json={"username": "After"}, headers=headers).status_code == 400
    wrong = client.put(
        PROFILE, json={"username": "After", "current_password": "nope-nope"}, headers=headers
    )
    assert wrong.status_code == 403
    db.session.refresh(user)
    assert user.username == "Before"

    right = client.put(
        PROFILE, json={"username": "After", "current_password": "password123"}, headers=headers
    )
    assert right.status_code == 200
    assert right.get_json()["user"]["username"] == "After"


def test_saving_an_unchanged_username_does_not_ask_for_the_password(client: FlaskClient) -> None:
    _register(client, "same_name", "Same Name", "m@example.com")
    user = db.session.query(User).filter_by(login="same_name").one()
    headers = {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}
    assert client.put(PROFILE, json={"username": "Same Name"}, headers=headers).status_code == 200


def test_a_password_with_surrounding_spaces_signs_in_as_typed(client: FlaskClient) -> None:
    """Sign-up keeps the password as typed; sign-in used to trim it, so such an account could never sign in."""
    res = client.post(REGISTER, json={"login": "spacey", "username": "Spacey", "email": "s@example.com", "password": " password123 "})
    assert res.status_code == 201
    assert client.post(LOGIN, json={"login": "spacey", "password": " password123 "}).status_code == 200
    assert client.post(LOGIN, json={"login": "spacey", "password": "password123"}).status_code == 401


def test_a_stray_space_around_a_plain_password_is_still_forgiven(client: FlaskClient) -> None:
    assert _register(client, "plainpw", "Plain", "p@example.com").status_code == 201
    assert client.post(LOGIN, json={"login": "plainpw", "password": "password123 "}).status_code == 200
