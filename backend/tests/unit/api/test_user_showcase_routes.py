# backend/tests/unit/api/test_user_showcase_routes.py
"""Unit tests for user showcase endpoints:
GET /api/v1/users/<id>/showcase
PUT /api/v1/users/<id>/showcase
"""
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.security import generate_token
from app.models import User


@pytest.mark.unit
class TestUserShowcaseRoutes:
    @pytest.fixture
    def user(self, db_session) -> User:
        user = User(username="showcase_user", email="showcase@example.com", password_hash="hashed")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def other_user(self, db_session) -> User:
        user = User(username="other_user", email="other@example.com", password_hash="hashed")
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

    def test_get_showcase_returns_default_when_not_previously_saved(self, client: FlaskClient, user: User) -> None:
        res = client.get(f"/api/v1/users/{user.id}/showcase")
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["player_title"] == "The Camper"
        assert data["devotion_level"] == 0
        assert data["grade_rank"] == "Ash IV"
        assert data["survivor_main"]["character_name"] == "Feng Min"
        assert data["survivor_main"]["prestige"] == 1
        assert data["killer_main"]["character_name"] == "The Blight"
        assert data["killer_main"]["prestige"] == 1

    def test_get_showcase_user_not_found(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/users/999999/showcase")
        assert res.status_code == 404

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
        self, client: FlaskClient, user: User, user_headers: dict
    ) -> None:
        payload = {
            "player_title": "Apex Predator",
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
        assert saved["player_title"] == "Apex Predator"
        assert saved["devotion_level"] == 25
        assert saved["grade_rank"] == "Gold I"
        assert saved["survivor_main"]["character_name"] == "Meg Thomas"
        assert saved["survivor_main"]["prestige"] == 50
        assert saved["survivor_main"]["perk_ids"] == [1, 2, 3, 4]
        assert saved["killer_main"]["character_name"] == "The Trapper"
        assert saved["killer_main"]["prestige"] == 100
        assert saved["killer_main"]["perk_ids"] == [5, 6, 7, 8]

        # Fetch again to verify persistence
        get_res = client.get(f"/api/v1/users/{user.id}/showcase")
        assert get_res.status_code == 200
        fetched = get_res.get_json()["data"]
        assert fetched["player_title"] == "Apex Predator"
        assert fetched["killer_main"]["character_name"] == "The Trapper"
