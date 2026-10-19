# backend/tests/unit/api/test_user_showcase_routes.py
"""Unit tests for user showcase endpoints:
GET /api/v1/users/<id>/showcase
PUT /api/v1/users/<id>/showcase
"""
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.security import generate_token
from app.models import Chapter, Killer, Survivor, User


@pytest.mark.unit
class TestUserShowcaseRoutes:
    @pytest.fixture
    def user(self, db_session) -> User:
        user = User(login="showcase_user", username="showcase_user", email="showcase@example.com", password_hash="hashed")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def other_user(self, db_session) -> User:
        user = User(login="other_user", username="other_user", email="other@example.com", password_hash="hashed")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def user_headers(self, app: Flask, user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def other_headers(self, app: Flask, other_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(other_user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    def test_get_showcase_returns_default_when_not_previously_saved(self, client: FlaskClient, user: User, user_headers: dict) -> None:
        res = client.get(f"/api/v1/users/{user.id}/showcase", headers=user_headers)
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["player_title"] == "Survivor"
        assert data["devotion_level"] == 0
        assert data["grade_rank"] == "Ash IV"
        assert data["survivor_main"]["character_name"] == "Feng Min"
        assert data["survivor_main"]["prestige"] == 0
        assert data["killer_main"]["character_name"] == "The Blight"
        assert data["killer_main"]["prestige"] == 0

    def test_get_showcase_user_not_found(self, client: FlaskClient, db_session) -> None:
        admin = User(login="showcase_admin", username="showcase_admin", email="sa@example.com", password_hash="hashed", role="admin")
        db_session.add(admin)
        db_session.commit()
        headers = {"Authorization": f"Bearer {generate_token(admin.id, role='admin')}"}
        res = client.get("/api/v1/users/999999/showcase", headers=headers)
        assert res.status_code == 404

    def test_get_showcase_requires_login(self, client: FlaskClient, user: User) -> None:
        assert client.get(f"/api/v1/users/{user.id}/showcase").status_code == 401

    def test_get_showcase_forbids_other_user(self, client: FlaskClient, user: User, other_headers: dict) -> None:
        assert client.get(f"/api/v1/users/{user.id}/showcase", headers=other_headers).status_code == 403

    def test_update_showcase_keeps_only_offered_choices(self, client: FlaskClient, user: User, user_headers: dict) -> None:
        res = client.put(
            f"/api/v1/users/{user.id}/showcase",
            json={"player_title": "<b>Totally Official Admin</b>", "grade_rank": "Grandmaster", "devotion_level": -5,
                  "survivor_main": {"prestige": 0}, "killer_main": {"prestige": 1e9}},
            headers=user_headers,
        )
        assert res.status_code == 200
        saved = res.get_json()["data"]
        assert saved["player_title"] == "Survivor"
        assert saved["grade_rank"] == "Ash IV"
        assert saved["devotion_level"] == 0
        assert saved["survivor_main"]["prestige"] == 0
        assert saved["killer_main"]["prestige"] == 100

    def test_backend_choices_match_the_frontend_lists(self) -> None:
        import re
        from pathlib import Path

        from app.models.user import SHOWCASE_GRADE_RANKS, SHOWCASE_PLAYER_TITLES

        source = (Path(__file__).resolve().parents[4] / "frontend" / "src" / "types" / "userShowcase.ts")
        if not source.exists():
            pytest.skip("frontend sources not available")
        text = source.read_text(encoding="utf-8")

        def listed(name: str) -> tuple[str, ...]:
            body = re.search(rf"export const {name} = \[(.*?)\]", text, re.S).group(1)
            return tuple(re.findall(r"'([^']+)'", body))

        assert listed("PLAYER_TITLES") == SHOWCASE_PLAYER_TITLES
        assert listed("GRADE_EMBLEMS") == SHOWCASE_GRADE_RANKS

    def test_update_showcase_requires_auth(self, client: FlaskClient, user: User) -> None:
        res = client.put(f"/api/v1/users/{user.id}/showcase", json={"player_title": "Apex Predator"})
        assert res.status_code == 401

    def test_update_showcase_forbids_other_user(self, client: FlaskClient, user: User, other_headers: dict) -> None:
        res = client.put(
            f"/api/v1/users/{user.id}/showcase",
            json={"player_title": "Apex Predator"},
            headers=other_headers,
        )
        assert res.status_code == 403

    def test_update_showcase_persists_to_database(
        self, client: FlaskClient, user: User, user_headers: dict, db_session
    ) -> None:
        # A showcase "main" is a foreign key to a real Survivor/Killer row now
        # -- `character_name` is resolved against the table, not stored as a
        # free-text label -- so the character it names has to exist first.
        chapter = Chapter(name="Test Chapter")
        db_session.add(chapter)
        db_session.flush()
        db_session.add(Survivor(name="Meg Thomas", chapter_id=chapter.id))
        db_session.add(Killer(name="The Trapper", chapter_id=chapter.id, power_name="Bear Trap"))
        db_session.commit()

        payload = {
            "player_title": "Killer",
            "devotion_level": 25,
            "grade_rank": "Gold I",
            "survivor_main": {
                "character_name": "Meg Thomas",
                "prestige": 50,
                "perk_ids": [1, 2, 3, 4],
            },
            "killer_main": {
                "character_name": "The Trapper",
                "prestige": 100,
                "perk_ids": [5, 6, 7, 8],
            },
        }

        res = client.put(
            f"/api/v1/users/{user.id}/showcase",
            json=payload,
            headers=user_headers,
        )
        assert res.status_code == 200
        saved = res.get_json()["data"]
        assert saved["player_title"] == "Killer"
        assert saved["devotion_level"] == 25
        assert saved["grade_rank"] == "Gold I"
        assert saved["survivor_main"]["character_name"] == "Meg Thomas"
        assert saved["survivor_main"]["prestige"] == 50
        assert saved["survivor_main"]["perk_ids"] == [1, 2, 3, 4]
        assert saved["killer_main"]["character_name"] == "The Trapper"
        assert saved["killer_main"]["prestige"] == 100
        assert saved["killer_main"]["perk_ids"] == [5, 6, 7, 8]

        # Fetch again to verify persistence
        get_res = client.get(f"/api/v1/users/{user.id}/showcase", headers=user_headers)
        assert get_res.status_code == 200
        fetched = get_res.get_json()["data"]
        assert fetched["player_title"] == "Killer"
        assert fetched["killer_main"]["character_name"] == "The Trapper"
