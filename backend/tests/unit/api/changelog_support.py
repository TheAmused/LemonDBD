# backend/tests/unit/api/changelog_support.py
"""Admin and reader fixtures shared by the changelog route test modules."""
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.security import generate_token
from app.models import User


class ChangelogRouteFixtures:
    @pytest.fixture
    def admin_user(self, db_session) -> User:
        user = User(
            login="route_admin", username="route_admin",
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
            login="route_user", username="route_user",
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

    def _publish(self, client: FlaskClient, headers: dict[str, str], published: bool = True) -> int:
        res = client.post(
            "/api/v1/changelog",
            json={"title": "Big patch", "content_html": "<h3>New</h3><ul><li>Thing</li></ul>", "is_published": published},
            headers=headers,
        )
        return res.get_json()["data"]["id"]
