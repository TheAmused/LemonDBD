# backend/tests/unit/api/test_profile_email_change.py
"""Changing the account email gets the checks sign-up makes, and never strands the account."""
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User

PASSWORD = "password123"


@pytest.fixture
def account(db_session) -> tuple[User, dict[str, str]]:
    user = User(login="mover", username="mover", email="mover@example.com", password_hash=hash_password(PASSWORD), is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user, {"Authorization": f"Bearer {generate_token(user.id, role='user')}"}


@pytest.fixture
def sent(monkeypatch) -> dict[str, list]:
    import app.services.mail_service as mail_service

    calls: dict[str, list] = {"verification": [], "notice": []}
    monkeypatch.setattr(mail_service, "send_verification_email", lambda user: calls["verification"].append(user.email))
    monkeypatch.setattr(mail_service, "send_email_changed_notice", lambda user, old: calls["notice"].append((old, user.email)))
    return calls


def _change(client: FlaskClient, headers: dict[str, str], email: str):
    return client.put("/api/v1/auth/profile", json={"email": email, "current_password": PASSWORD}, headers=headers)


@pytest.mark.unit
class TestEmailChange:
    @pytest.mark.parametrize("bad", ["not-an-email", "a@b", "x@" + "a" * 130 + ".com", "two@@example.com"])
    def test_invalid_address_is_refused_and_nothing_is_written(self, client, account, sent, bad) -> None:
        user, headers = account
        res = _change(client, headers, bad)
        assert res.status_code == 400
        db.session.expire_all()
        assert db.session.get(User, user.id).email == "mover@example.com"
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
        assert sent == {"verification": [], "notice": []}

    def test_new_address_must_be_verified_again(self, client, account, sent, monkeypatch) -> None:
        import app.services.site_settings as site_settings

        monkeypatch.setattr(site_settings, "email_verification_required", lambda: True)
        user, headers = account
        res = _change(client, headers, "New.Address@Example.com")
        assert res.status_code == 200
        body = res.get_json()
        assert body["user"]["email"] == "new.address@example.com"
        assert body["verification_required"] is True
        db.session.expire_all()
        stored = db.session.get(User, user.id)
        assert stored.is_verified is False
        assert stored.verification_code
        assert sent["verification"] == ["new.address@example.com"]
        assert sent["notice"] == [("mover@example.com", "new.address@example.com")]

    def test_without_required_verification_the_old_address_is_still_told(self, client, account, sent, monkeypatch) -> None:
        import app.services.site_settings as site_settings

        monkeypatch.setattr(site_settings, "email_verification_required", lambda: False)
        _, headers = account
        res = _change(client, headers, "moved@example.com")
        assert res.status_code == 200
        assert res.get_json()["verification_required"] is False
        assert sent == {"verification": [], "notice": [("mover@example.com", "moved@example.com")]}

    def test_ban_listed_address_is_refused(self, client, account, sent, monkeypatch) -> None:
        import app.services.ban_list as ban_list

        monkeypatch.setattr(ban_list, "registration_refusal", lambda email: "This address cannot be used." if email == "banned@example.com" else None)
        user, headers = account
        res = _change(client, headers, "banned@example.com")
        assert res.status_code == 400
        db.session.expire_all()
        assert db.session.get(User, user.id).email == "mover@example.com"

    def test_new_password_uses_the_admin_minimum(self, client, account, monkeypatch) -> None:
        import app.services.site_settings as site_settings

        monkeypatch.setattr(site_settings, "password_min_length", lambda: 10)
        _, headers = account
        short = client.put("/api/v1/auth/profile", json={"new_password": "eight888", "current_password": PASSWORD}, headers=headers)
        assert short.status_code == 400
        assert "10" in short.get_json()["error"]
        ok = client.put("/api/v1/auth/profile", json={"new_password": "ten-chars!", "current_password": PASSWORD}, headers=headers)
        assert ok.status_code == 200

    def test_address_taken_by_another_account_is_refused(self, client, account, sent) -> None:
        db.session.add(User(login="other", username="other", email="taken@example.com", password_hash=hash_password(PASSWORD)))
        db.session.commit()
        _, headers = account
        assert _change(client, headers, "taken@example.com").status_code == 400
