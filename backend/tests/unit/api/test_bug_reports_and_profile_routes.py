# backend/tests/unit/api/test_bug_reports_and_profile_routes.py
"""Unit/API coverage for the routes backing the /user page:
GET /bug-reports/my (pagination, isolation, localized errors) and
PUT /auth/profile + POST/DELETE /auth/avatar (validation, localized errors).
"""
import io

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token
from app.models import BugReport, User


@pytest.mark.unit
class TestMyBugReportsRoute:
    """Tests for GET /api/v1/bug-reports/my."""

    @pytest.fixture
    def owner(self, db_session) -> User:
        user = User(username="report_owner", email="owner@example.com", password_hash="hashed")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def other_user(self, db_session) -> User:
        user = User(username="someone_else", email="someone@example.com", password_hash="hashed")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def owner_headers(self, app: Flask, owner: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(owner.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    def _make_report(self, db_session, *, user_id=None, title="Bug", reporter_name="x", reporter_email="x@x.com"):
        report = BugReport(
            user_id=user_id,
            reporter_name=reporter_name,
            reporter_email=reporter_email,
            title=title,
            category="General",
            message="Something broke.",
        )
        db_session.add(report)
        db_session.commit()
        return report

    def test_requires_authentication(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/bug-reports/my")
        assert res.status_code == 401
        assert res.get_json()["error_code"] == "auth_required"

    def test_unauthenticated_error_is_localized_via_lang_param(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/bug-reports/my?lang=pl")
        assert res.status_code == 401
        assert "uwierzytelnienie" in res.get_json()["error"].lower()

    def test_returns_only_own_reports(
        self, client: FlaskClient, db_session, owner: User, other_user: User, owner_headers: dict[str, str]
    ) -> None:
        self._make_report(db_session, user_id=owner.id, title="My bug")
        self._make_report(db_session, user_id=other_user.id, title="Not mine")

        res = client.get("/api/v1/bug-reports/my", headers=owner_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data["total"] == 1
        assert [r["title"] for r in data["reports"]] == ["My bug"]

    def test_empty_state_returns_zero_total(self, client: FlaskClient, owner_headers: dict[str, str]) -> None:
        res = client.get("/api/v1/bug-reports/my", headers=owner_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data["total"] == 0
        assert data["reports"] == []
        assert data["page"] == 1

    def test_pagination_limits_page_size_and_reports_total_pages(
        self, client: FlaskClient, db_session, owner: User, owner_headers: dict[str, str]
    ) -> None:
        for i in range(12):
            self._make_report(db_session, user_id=owner.id, title=f"Bug {i}")

        res = client.get("/api/v1/bug-reports/my?page=1&per_page=5", headers=owner_headers)
        data = res.get_json()
        assert res.status_code == 200
        assert len(data["reports"]) == 5
        assert data["total"] == 12
        assert data["total_pages"] == 3

        res_page2 = client.get("/api/v1/bug-reports/my?page=2&per_page=5", headers=owner_headers)
        assert len(res_page2.get_json()["reports"]) == 5

    def test_per_page_is_capped_at_fifty(
        self, client: FlaskClient, db_session, owner: User, owner_headers: dict[str, str]
    ) -> None:
        res = client.get("/api/v1/bug-reports/my?per_page=500", headers=owner_headers)
        assert res.status_code == 200
        assert res.get_json()["per_page"] == 50

    def test_invalid_page_param_returns_400(self, client: FlaskClient, owner_headers: dict[str, str]) -> None:
        res = client.get("/api/v1/bug-reports/my?page=0", headers=owner_headers)
        assert res.status_code == 400
        assert res.get_json()["error_code"] == "invalid_pagination"

    def test_reports_ordered_newest_first(
        self, client: FlaskClient, db_session, owner: User, owner_headers: dict[str, str]
    ) -> None:
        self._make_report(db_session, user_id=owner.id, title="Oldest")
        self._make_report(db_session, user_id=owner.id, title="Newest")

        res = client.get("/api/v1/bug-reports/my", headers=owner_headers)
        titles = [r["title"] for r in res.get_json()["reports"]]
        assert titles == ["Newest", "Oldest"]


@pytest.mark.unit
class TestProfileAndAvatarRoutes:
    """Tests for PUT /api/v1/auth/profile and POST/DELETE /api/v1/auth/avatar."""

    @pytest.fixture
    def plain_user(self, db_session) -> User:
        from app.core.security import hash_password

        user = User(
            username="profile_owner",
            email="profile_owner@example.com",
            password_hash=hash_password("Password123!"),
        )
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def user_headers(self, app: Flask, plain_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(plain_user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    def test_update_profile_requires_authentication(self, client: FlaskClient) -> None:
        res = client.put("/api/v1/auth/profile", json={"email": "new@example.com"})
        assert res.status_code == 401

    def test_update_profile_changes_email(
        self, client: FlaskClient, user_headers: dict[str, str]
    ) -> None:
        res = client.put(
            "/api/v1/auth/profile", json={"email": "updated@example.com"}, headers=user_headers
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert data["user"]["email"] == "updated@example.com"

    def test_update_profile_rejects_email_already_in_use(
        self, client: FlaskClient, db_session, plain_user: User, user_headers: dict[str, str]
    ) -> None:
        taken = User(username="taken_email_user", email="taken@example.com", password_hash="hashed")
        db_session.add(taken)
        db_session.commit()

        res = client.put(
            "/api/v1/auth/profile", json={"email": "taken@example.com"}, headers=user_headers
        )
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_upload_avatar_without_file_returns_localized_error(
        self, client: FlaskClient, user_headers: dict[str, str]
    ) -> None:
        res = client.post("/api/v1/auth/avatar?lang=es", headers=user_headers)
        assert res.status_code == 400
        data = res.get_json()
        assert data["error_code"] == "no_avatar_file"
        assert "archivo" in data["error"].lower()

    def test_upload_avatar_requires_authentication(self, client: FlaskClient) -> None:
        data = {"avatar": (io.BytesIO(b"fake-image-bytes"), "avatar.png")}
        res = client.post("/api/v1/auth/avatar", data=data, content_type="multipart/form-data")
        assert res.status_code == 401

    def test_delete_avatar_requires_authentication(self, client: FlaskClient) -> None:
        res = client.delete("/api/v1/auth/avatar")
        assert res.status_code == 401

    def test_delete_avatar_resets_user_without_custom_avatar(
        self, client: FlaskClient, user_headers: dict[str, str]
    ) -> None:
        res = client.delete("/api/v1/auth/avatar", headers=user_headers)
        assert res.status_code == 200
        assert res.get_json()["status"] == "success"
