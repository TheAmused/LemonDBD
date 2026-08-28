# backend/tests/live/workflows/test_user_profile_lifecycle_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestUserProfileLifecycleWorkflow:
    """Workflow asserting complete user profile lifecycle: updates, password changes, and re-authentication."""

    def test_full_user_profile_and_password_lifecycle(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "profile_user_1", "prof1@example.com", "InitialPass123!"
        )

        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.get_json()
        assert me_data["user"]["username"] == "profile_user_1"
        assert me_data["user"]["email"] == "prof1@example.com"

        update_res = client.put(
            "/api/v1/auth/profile",
            json={
                "email": "prof_updated@example.com",
                "avatar_url": "custom_avatar_icon",
                "new_password": "NewStrongPassword456!",
            },
            headers=headers,
        )
        assert update_res.status_code == 200
        updated_user = update_res.get_json()["user"]
        assert updated_user["email"] == "prof_updated@example.com"
        assert updated_user["avatar_url"] == "custom_avatar_icon"

        old_login = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "profile_user_1",
                "password": "InitialPass123!",
            },
        )
        assert old_login.status_code in (400, 401)

        new_login = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "profile_user_1",
                "password": "NewStrongPassword456!",
            },
        )
        assert new_login.status_code == 200
        new_token = new_login.get_json()["token"]
        new_headers = {
            "Authorization": f"Bearer {new_token}",
            "Content-Type": "application/json",
        }

        me_res2 = client.get("/api/v1/auth/me", headers=new_headers)
        assert me_res2.status_code == 200
        assert me_res2.get_json()["user"]["email"] == "prof_updated@example.com"
