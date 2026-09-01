# backend/tests/unit/api/test_admin_users_and_stats_routes.py
"""Unit/API coverage for GET/POST /api/v1/users (admin directory) and
GET /api/v1/admin/stats, including a regression test pinning the fixed
N+1 query pattern in list_all_users_paginated.
"""
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import event

from app.core.extensions import db
from app.core.security import generate_token
from app.models import Character, User, UserCharacterOwnership, UserPerkOwnership, Perk


@pytest.mark.unit
class TestAdminUserDirectoryRoute:
    """Tests for GET/POST /api/v1/users."""

    @pytest.fixture
    def admin_user(self, db_session) -> User:
        user = User(username="dir_admin", email="dir_admin@example.com", password_hash="hashed", role="admin")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def plain_user(self, db_session) -> User:
        user = User(username="dir_user", email="dir_user@example.com", password_hash="hashed", role="user")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def admin_headers(self, app: Flask, admin_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(admin_user.id, role="admin")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def user_headers(self, app: Flask, plain_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(plain_user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    def test_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.get("/api/v1/users", headers=user_headers)
        assert res.status_code == 403

    def test_requires_authentication(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/users")
        assert res.status_code == 401

    def test_lists_users_with_owned_counts(
        self, client: FlaskClient, db_session, admin_user: User, admin_headers: dict[str, str]
    ) -> None:
        char = Character(name="The Trapper", role="Killer")
        db_session.add(char)
        db_session.flush()
        perk = Perk(name="Brutal Strength", character_id=char.id, category="Killer")
        db_session.add(perk)
        db_session.flush()

        db_session.add(UserCharacterOwnership(user_id=admin_user.id, character_id=char.id, is_owned=True))
        db_session.add(UserPerkOwnership(user_id=admin_user.id, perk_id=perk.id, is_unlocked=True))
        db_session.commit()

        res = client.get("/api/v1/users", headers=admin_headers)
        assert res.status_code == 200
        data = res.get_json()
        row = next(u for u in data["users"] if u["id"] == admin_user.id)
        assert row["owned_characters_count"] == 1
        assert row["unlocked_perks_count"] == 1

    def test_search_filters_by_username_or_email(
        self, client: FlaskClient, db_session, admin_headers: dict[str, str]
    ) -> None:
        db_session.add(User(username="findme_zebra", email="zebra@example.com", password_hash="hashed"))
        db_session.add(User(username="someone_else", email="other@example.com", password_hash="hashed"))
        db_session.commit()

        res = client.get("/api/v1/users?search=zebra", headers=admin_headers)
        data = res.get_json()
        assert all("zebra" in u["username"].lower() or "zebra" in u["email"].lower() for u in data["users"])
        assert any(u["username"] == "findme_zebra" for u in data["users"])

    def test_role_filter(self, client: FlaskClient, db_session, admin_headers: dict[str, str]) -> None:
        db_session.add(User(username="second_admin", email="second_admin@example.com", password_hash="hashed", role="admin"))
        db_session.add(User(username="regular_joe", email="regular_joe@example.com", password_hash="hashed", role="user"))
        db_session.commit()

        res = client.get("/api/v1/users?role=admin", headers=admin_headers)
        data = res.get_json()
        assert all(u["role"] == "admin" for u in data["users"])

    def test_pagination_respects_page_and_per_page(
        self, client: FlaskClient, db_session, admin_headers: dict[str, str]
    ) -> None:
        for i in range(5):
            db_session.add(User(username=f"bulk_user_{i}", email=f"bulk{i}@example.com", password_hash="hashed"))
        db_session.commit()

        res = client.get("/api/v1/users?page=1&per_page=3", headers=admin_headers)
        data = res.get_json()
        assert len(data["users"]) == 3
        assert data["per_page"] == 3
        assert data["total"] >= 6  # 5 bulk + the admin fixture

    def test_user_listing_issues_a_bounded_number_of_queries_regardless_of_page_size(
        self, app: Flask, client: FlaskClient, db_session, admin_headers: dict[str, str]
    ) -> None:
        """Regression test: this used to run 2 extra COUNT queries *per user*
        row (an N+1). It must now stay flat as the page grows."""
        char = Character(name="The Wraith", role="Killer")
        db_session.add(char)
        db_session.flush()
        perk = Perk(name="Predator", character_id=char.id, category="Killer")
        db_session.add(perk)
        db_session.flush()

        for i in range(20):
            u = User(username=f"n1_user_{i}", email=f"n1_{i}@example.com", password_hash="hashed")
            db_session.add(u)
            db_session.flush()
            db_session.add(UserCharacterOwnership(user_id=u.id, character_id=char.id, is_owned=True))
            db_session.add(UserPerkOwnership(user_id=u.id, perk_id=perk.id, is_unlocked=True))
        db_session.commit()

        query_count = {"n": 0}

        def _count_queries(*_args, **_kwargs):
            query_count["n"] += 1

        with app.app_context():
            event.listen(db.engine, "before_cursor_execute", _count_queries)
            try:
                res = client.get("/api/v1/users?per_page=20", headers=admin_headers)
            finally:
                event.remove(db.engine, "before_cursor_execute", _count_queries)

        assert res.status_code == 200
        assert len(res.get_json()["users"]) == 20
        # 1 count query + 1 page query + 2 grouped aggregate queries = 4,
        # independent of how many users are on the page. Generous headroom
        # (< 10) keeps this resilient to unrelated query additions while
        # still failing hard on a reintroduced N+1 (which would be ~44).
        assert query_count["n"] < 10, f"Expected a bounded query count, got {query_count['n']} (possible N+1)"


@pytest.mark.unit
class TestAdminStatsRoute:
    @pytest.fixture
    def admin_headers(self, app: Flask, db_session) -> dict[str, str]:
        user = User(username="stats_admin", email="stats_admin@example.com", password_hash="hashed", role="admin")
        db_session.add(user)
        db_session.commit()
        with app.app_context():
            token = generate_token(user.id, role="admin")
        return {"Authorization": f"Bearer {token}"}

    def test_requires_admin(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/admin/stats")
        assert res.status_code == 401

    def test_returns_system_metrics(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        res = client.get("/api/v1/admin/stats", headers=admin_headers)
        assert res.status_code == 200
        data = res.get_json()
        for key in ("total_users", "active_users", "admin_count", "total_characters", "total_perks"):
            assert key in data
