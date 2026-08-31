# backend/tests/unit/api/test_changelog_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token
from app.models import User


@pytest.mark.unit
class TestChangelogRoutes:
    """Tests for the /api/v1/changelog admin CRUD + public feed routes."""

    @pytest.fixture
    def admin_user(self, db_session) -> User:
        user = User(
            username="route_admin",
            email="route_admin@example.com",
            password_hash="hashed",
            role="admin",
        )
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def plain_user(self, db_session) -> User:
        user = User(
            username="route_user",
            email="route_user@example.com",
            password_hash="hashed",
            role="user",
        )
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

    # -- public feed --------------------------------------------------

    def test_public_feed_returns_200_with_empty_data(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/changelog")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["data"] == []

    def test_public_feed_does_not_require_auth(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/changelog?page=1&per_page=20")
        assert res.status_code == 200

    def test_public_feed_hides_unpublished_posts(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        client.post(
            "/api/v1/changelog",
            json={"title": "Draft post", "content_html": "<p>draft</p>", "is_published": False},
            headers=admin_headers,
        )
        res = client.get("/api/v1/changelog")
        assert res.get_json()["data"] == []

    # -- admin feed -----------------------------------------------------

    def test_admin_feed_requires_authentication(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/changelog/admin")
        assert res.status_code == 401

    def test_admin_feed_rejects_non_admin_user(
        self, client: FlaskClient, user_headers: dict[str, str]
    ) -> None:
        res = client.get("/api/v1/changelog/admin", headers=user_headers)
        assert res.status_code == 403

    def test_admin_feed_returns_drafts_for_admin(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        client.post(
            "/api/v1/changelog",
            json={"title": "Draft post", "content_html": "<p>draft</p>", "is_published": False},
            headers=admin_headers,
        )
        res = client.get("/api/v1/changelog/admin", headers=admin_headers)
        assert res.status_code == 200
        assert res.get_json()["total"] == 1

    # -- create -----------------------------------------------------------

    def test_create_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Nope", "content_html": "<p>x</p>"},
            headers=user_headers,
        )
        assert res.status_code == 403

    def test_create_returns_201_with_sanitized_post(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={
                "title": "The Entity Stirs",
                "content_html": '<p>New killer! <script>alert(1)</script></p>',
                "tag": "feature",
                "is_published": True,
            },
            headers=admin_headers,
        )
        assert res.status_code == 201
        data = res.get_json()["data"]
        assert data["title"] == "The Entity Stirs"
        assert "alert(1)" not in data["content_html"]
        assert data["position"] == 0

    def test_create_rejects_title_too_short(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "ab", "content_html": "<p>x</p>"},
            headers=admin_headers,
        )
        assert res.status_code == 400
        assert "details" in res.get_json()

    def test_create_rejects_missing_content(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Valid Title"},
            headers=admin_headers,
        )
        assert res.status_code == 400

    def test_create_rejects_oversized_content(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Valid Title", "content_html": "a" * 20001},
            headers=admin_headers,
        )
        assert res.status_code == 400

    # -- update -----------------------------------------------------------

    def test_update_requires_admin(self, client: FlaskClient, admin_headers: dict[str, str], user_headers: dict[str, str]) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "Original", "content_html": "<p>x</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.patch(
            f"/api/v1/changelog/{created['id']}",
            json={"title": "Hacked"},
            headers=user_headers,
        )
        assert res.status_code == 403

    def test_update_returns_404_for_missing_post(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.patch(
            "/api/v1/changelog/999999",
            json={"title": "Doesn't matter"},
            headers=admin_headers,
        )
        assert res.status_code == 404

    def test_update_applies_partial_changes(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "Original", "content_html": "<p>orig</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.patch(
            f"/api/v1/changelog/{created['id']}",
            json={"is_published": False},
            headers=admin_headers,
        )
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data["is_published"] is False
        assert data["title"] == "Original"

    def test_update_rejects_invalid_payload(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "Original", "content_html": "<p>orig</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.patch(
            f"/api/v1/changelog/{created['id']}",
            json={"title": "a"},  # below min_length=3
            headers=admin_headers,
        )
        assert res.status_code == 400

    # -- delete -----------------------------------------------------------

    def test_delete_requires_admin(self, client: FlaskClient, admin_headers: dict[str, str], user_headers: dict[str, str]) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "To delete", "content_html": "<p>x</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.delete(f"/api/v1/changelog/{created['id']}", headers=user_headers)
        assert res.status_code == 403

    def test_delete_returns_404_for_missing_post(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.delete("/api/v1/changelog/999999", headers=admin_headers)
        assert res.status_code == 404

    def test_delete_removes_post(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        created = client.post(
            "/api/v1/changelog",
            json={"title": "To delete", "content_html": "<p>x</p>"},
            headers=admin_headers,
        ).get_json()["data"]

        res = client.delete(f"/api/v1/changelog/{created['id']}", headers=admin_headers)
        assert res.status_code == 200

        follow_up = client.get("/api/v1/changelog/admin", headers=admin_headers)
        assert follow_up.get_json()["total"] == 0

    # -- reorder ------------------------------------------------------------

    def test_reorder_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/changelog/reorder", json={"ordered_ids": [1, 2]}, headers=user_headers
        )
        assert res.status_code == 403

    def test_reorder_rejects_non_list_payload(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog/reorder", json={"ordered_ids": "not-a-list"}, headers=admin_headers
        )
        assert res.status_code == 400

    def test_reorder_rejects_non_integer_ids(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/changelog/reorder",
            json={"ordered_ids": [1, "two", 3]},
            headers=admin_headers,
        )
        assert res.status_code == 400

    def test_reorder_persists_new_order(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        p1 = client.post(
            "/api/v1/changelog", json={"title": "Post One", "content_html": "<p>1</p>"}, headers=admin_headers
        ).get_json()["data"]
        p2 = client.post(
            "/api/v1/changelog", json={"title": "Post Two", "content_html": "<p>2</p>"}, headers=admin_headers
        ).get_json()["data"]

        res = client.post(
            "/api/v1/changelog/reorder",
            json={"ordered_ids": [p1["id"], p2["id"]]},
            headers=admin_headers,
        )
        assert res.status_code == 200

        feed = client.get("/api/v1/changelog/admin", headers=admin_headers).get_json()
        ids_in_order = [row["id"] for row in feed["data"]]
        assert ids_in_order == [p1["id"], p2["id"]]
