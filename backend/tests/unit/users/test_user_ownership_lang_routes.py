# backend/tests/unit/users/test_user_ownership_lang_routes.py
"""GET /api/v1/users/<id>/perks and /characters translate only on an explicit `lang`.

Chaos and Gauntlet runs store canonical English names and compare them against
these rows, so a Referer or Accept-Language header must never translate `name`.
"""
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.security import generate_token
from app.models import Perk, User
from tests.unit.conftest import make_chapter

LOCALIZED_HEADERS = {"Referer": "http://localhost/pl/challenges/chaos", "Accept-Language": "pl"}


@pytest.mark.unit
class TestOwnershipRoutesLanguage:
    @pytest.fixture
    def user(self, db_session) -> User:
        user = User(login="lang_user", username="lang_user", email="lang@example.com", password_hash="hashed")
        db_session.add(user)
        db_session.add(
            Perk(name="Agitation", role="Killer", is_teachable=True, translations={"pl": {"name": "Agitacja"}})
        )
        make_chapter(db_session, "Base Game")
        db_session.commit()
        return user

    @pytest.fixture
    def auth(self, app: Flask, user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    def _perk_names(self, client: FlaskClient, user: User, headers: dict[str, str], query: str = "") -> list[str]:
        res = client.get(f"/api/v1/users/{user.id}/perks?category=Killer{query}", headers=headers)
        assert res.status_code == 200
        return [p["name"] for p in res.get_json()["data"]]

    def test_referer_and_accept_language_do_not_translate_perk_names(
        self, client: FlaskClient, user: User, auth: dict[str, str]
    ) -> None:
        names = self._perk_names(client, user, {**auth, **LOCALIZED_HEADERS})
        assert "Agitation" in names
        assert "Agitacja" not in names

    def test_explicit_lang_translates_perk_names(self, client: FlaskClient, user: User, auth: dict[str, str]) -> None:
        names = self._perk_names(client, user, auth, "&lang=pl")
        assert "Agitacja" in names
