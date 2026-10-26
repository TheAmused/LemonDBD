"""The lemon / user demo accounts exist only when FLASK_ENV=development."""
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from app.core.config import demo_accounts_enabled
from app.core.extensions import db
from app.core.account_state import block_kind
from app.models import SanctionNotification, User, UserSanction
from app.seeds.static_db_seeder import _find_data_dir, _seed_subfolders, load_static_seed_payload
from app.services.moderation_actions import pending_warnings
from app.services.user import seed_default_admin_if_empty


@pytest.mark.unit
class TestDemoAccountSwitch:
    @pytest.mark.parametrize("value", ["development", "Development", " development "])
    def test_enabled_only_for_development(self, monkeypatch: pytest.MonkeyPatch, value: str) -> None:
        monkeypatch.setenv("FLASK_ENV", value)
        assert demo_accounts_enabled() is True

    @pytest.mark.parametrize("value", ["production", "prod", "staging", "testing", ""])
    def test_everything_else_is_production(self, monkeypatch: pytest.MonkeyPatch, value: str) -> None:
        monkeypatch.setenv("FLASK_ENV", value)
        assert demo_accounts_enabled() is False

    def test_unset_variable_counts_as_production(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("FLASK_ENV", raising=False)
        assert demo_accounts_enabled() is False


@pytest.mark.unit
class TestDemoAccountsEndpoint:
    def test_production_lists_nothing(self, client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "production")
        res = client.get("/api/v1/auth/demo-accounts")
        assert res.status_code == 200
        assert res.get_json() == {"enabled": False, "accounts": []}
        assert "no-store" in res.headers["Cache-Control"]
        # the credentials must not appear anywhere in the production answer
        assert b"lemon" not in res.data and b"password" not in res.data.replace(b'"password"', b"")

    def test_development_lists_both_accounts(self, client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "development")
        body = client.get("/api/v1/auth/demo-accounts").get_json()
        assert body["enabled"] is True
        assert {a["role"] for a in body["accounts"]} == {"admin", "player"}
        assert {a["login"] for a in body["accounts"]} == {"lemon", "user", "warned", "suspended", "banned"}
        states = {a["login"]: a["state"] for a in body["accounts"]}
        assert states == {
            "lemon": "active",
            "user": "active",
            "warned": "warned",
            "suspended": "suspended",
            "banned": "banned",
        }
        # the sign-in modal fills in the first account of a role: it must stay the everyday ones
        first = {}
        for account in body["accounts"]:
            first.setdefault(account["role"], account["login"])
        assert first == {"admin": "lemon", "player": "user"}


@pytest.mark.unit
class TestDemoAccountSeeding:
    def test_production_seeds_no_demo_users(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "production")
        seed_default_admin_if_empty()
        assert db.session.scalars(select(User)).all() == []

    def test_development_seeds_them(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "development")
        seed_default_admin_if_empty()
        names = {u.username for u in db.session.scalars(select(User))}
        assert names == {"lemon", "user", "warned", "suspended", "banned"}

    def test_moderation_demo_accounts_sit_in_their_states(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "development")
        seed_default_admin_if_empty()
        seed_default_admin_if_empty()  # idempotent: no second sanction
        users = {u.username: u for u in db.session.scalars(select(User))}
        assert block_kind(users["user"]) is None and block_kind(users["lemon"]) is None
        assert block_kind(users["warned"]) is None
        assert block_kind(users["suspended"]) == "suspended"
        assert block_kind(users["banned"]) == "banned"
        sanctions = db.session.scalars(select(UserSanction)).all()
        assert sorted(s.kind for s in sanctions) == ["ban", "suspension", "warning"]
        assert db.session.scalars(select(SanctionNotification)).all() == []  # seeding sends no e-mail
        assert [w["id"] for w in pending_warnings(users["warned"].id)] == [
            s.id for s in sanctions if s.kind == "warning"
        ]
        assert pending_warnings(users["user"].id) == []

    @pytest.mark.parametrize(("login", "code"), [("suspended", "account_suspended"), ("banned", "account_banned")])
    def test_blocked_demo_accounts_are_told_so_at_login(
        self, app: Flask, client: FlaskClient, monkeypatch: pytest.MonkeyPatch, login: str, code: str
    ) -> None:
        monkeypatch.setenv("FLASK_ENV", "development")
        seed_default_admin_if_empty()
        res = client.post("/api/v1/auth/login", json={"login": login, "password": login})
        assert res.status_code == 403
        assert res.get_json()["code"] == code

    def test_static_seed_data_skips_the_users_folder_in_production(self, monkeypatch: pytest.MonkeyPatch) -> None:
        data_dir = _find_data_dir()
        assert data_dir is not None

        monkeypatch.setenv("FLASK_ENV", "production")
        assert "users" not in _seed_subfolders()
        assert "users" not in load_static_seed_payload(data_dir)["data"]

        monkeypatch.setenv("FLASK_ENV", "development")
        assert "users" in _seed_subfolders()
        assert {u["username"] for u in load_static_seed_payload(data_dir)["data"]["users"]} >= {"lemon", "user"}
