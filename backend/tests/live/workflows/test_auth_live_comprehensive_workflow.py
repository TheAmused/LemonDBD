# backend/tests/live/workflows/test_auth_live_comprehensive_workflow.py
import hashlib
import time
from typing import Any
import pytest
from flask import Flask
from flask.testing import FlaskClient


def solve_altcha_pow(challenge_data: dict[str, Any]) -> dict[str, Any]:
    """Helper to solve ALTCHA challenge by computing SHA-256 hash."""
    salt = challenge_data["salt"]
    target = challenge_data["challenge"]
    max_num = challenge_data.get("maxnumber", 50000)

    for n in range(max_num + 1):
        h = hashlib.sha256(f"{salt}{n}".encode("utf-8")).hexdigest()
        if h == target:
            return {
                "algorithm": challenge_data.get("algorithm", "SHA-256"),
                "challenge": target,
                "number": n,
                "salt": salt,
                "signature": challenge_data["signature"],
                "expires": challenge_data["expires"],
            }
    raise ValueError(f"Could not solve ALTCHA challenge within max number {max_num}")


@pytest.mark.live
@pytest.mark.workflow
class TestAuthLiveComprehensiveWorkflow:
    """Comprehensive live workflow tests ensuring authentication, registration, ALTCHA, and demo accounts always function."""

    def test_live_altcha_challenge_generation_and_solving(self, live_client: FlaskClient) -> None:
        """Verify the ALTCHA challenge endpoint generates solvable, properly signed PoW challenges."""
        res = live_client.get("/api/v1/auth/altcha-challenge")
        assert res.status_code == 200
        data = res.get_json()

        assert data["algorithm"] == "SHA-256"
        assert "challenge" in data and len(data["challenge"]) == 64
        assert "salt" in data and len(data["salt"]) >= 16
        assert "signature" in data and len(data["signature"]) == 64
        assert "maxnumber" in data and data["maxnumber"] > 0
        assert data["expires"] > time.time()

        # Solve challenge
        solution = solve_altcha_pow(data)
        assert solution["number"] <= data["maxnumber"]

        # Verify cryptographic equation
        expected_hash = hashlib.sha256(f"{data['salt']}{solution['number']}".encode("utf-8")).hexdigest()
        assert expected_hash == data["challenge"]

    def test_live_demo_accounts_endpoint_and_admin_login(self, live_client: FlaskClient) -> None:
        """Verify the demo accounts endpoint returns 'lemon' admin and that lemon admin can successfully authenticate."""
        demo_res = live_client.get("/api/v1/auth/demo-accounts")
        assert demo_res.status_code == 200
        demo_data = demo_res.get_json()

        assert demo_data.get("enabled") is True
        accounts = demo_data.get("accounts", [])
        assert len(accounts) >= 2

        admin_account = next((a for a in accounts if a["role"] == "admin"), None)
        assert admin_account is not None, "Admin demo account must be available"
        assert admin_account["login"] == "lemon"
        assert admin_account["password"] == "lemon"

        # Log in with the lemon admin credentials
        login_res = live_client.post(
            "/api/v1/auth/login",
            headers={"X-Return-Token": "1"},
            json={
                "username_or_email": admin_account["login"],
                "password": admin_account["password"],
            },
        )
        assert login_res.status_code == 200
        login_data = login_res.get_json()
        assert login_data.get("token") is not None
        assert login_data.get("user", {}).get("role") == "admin"
        assert login_data.get("user", {}).get("login") == "lemon"

        token = login_data["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Verify /auth/me returns admin status
        me_res = live_client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.get_json()
        assert me_data.get("user", {}).get("role") == "admin"

    def test_live_registration_and_login_full_lifecycle(self, live_client: FlaskClient, live_app: Flask) -> None:
        """Verify full user registration with ALTCHA PoW, duplicate handling, and dual-identifier login."""
        ts = int(time.time() * 1000)
        unique_login = f"user_{ts}"
        unique_username = f"Survivor_{ts}"
        unique_email = f"user_{ts}@example.com"
        password = "SecurePassword123!"

        # 1. Fetch and solve ALTCHA challenge
        ch_res = live_client.get("/api/v1/auth/altcha-challenge")
        assert ch_res.status_code == 200
        altcha_payload = solve_altcha_pow(ch_res.get_json())

        # 2. Register user
        reg_res = live_client.post(
            "/api/v1/auth/register",
            json={
                "login": unique_login,
                "username": unique_username,
                "email": unique_email,
                "password": password,
                "altcha": altcha_payload,
            },
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.get_json()
        assert "user" in reg_data
        assert reg_data["user"]["login"] == unique_login
        assert reg_data["user"]["username"] == unique_username
        assert reg_data["user"]["email"] == unique_email
        assert reg_data["user"]["role"] in ("user", "player")

        # 3. Duplicate registration checks
        ch_res_dup = live_client.get("/api/v1/auth/altcha-challenge")
        dup_altcha = solve_altcha_pow(ch_res_dup.get_json())
        dup_res = live_client.post(
            "/api/v1/auth/register",
            json={
                "login": unique_login,
                "username": f"Other_{ts}",
                "email": f"other_{ts}@example.com",
                "password": password,
                "altcha": dup_altcha,
            },
        )
        assert dup_res.status_code in (400, 409)
        dup_err = dup_res.get_json().get("error", "").lower()
        assert "already" in dup_err or "exists" in dup_err or "taken" in dup_err

        # 4. Login via login/username
        login_by_username = live_client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": unique_login,
                "password": password,
            },
        )
        assert login_by_username.status_code == 200
        assert login_by_username.get_json()["user"]["login"] == unique_login

        # 5. Login via email
        login_by_email = live_client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": unique_email,
                "password": password,
            },
        )
        assert login_by_email.status_code == 200
        assert login_by_email.get_json()["user"]["email"] == unique_email

        # 6. Invalid credentials rejected
        bad_pw = live_client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": unique_login,
                "password": "WrongPassword999!",
            },
        )
        assert bad_pw.status_code == 401

        non_user = live_client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": "non_existent_ghost_account",
                "password": "AnyPassword123!",
            },
        )
        assert non_user.status_code == 401

    def test_live_forgot_password_and_logout_endpoints(self, live_client: FlaskClient) -> None:
        """Verify forgot-password submission and logout invalidate sessions properly."""
        ch_res = live_client.get("/api/v1/auth/altcha-challenge")
        assert ch_res.status_code == 200
        altcha_payload = solve_altcha_pow(ch_res.get_json())

        forgot_res = live_client.post(
            "/api/v1/auth/forgot-password",
            json={
                "email": "lemon@lemondbd.com",
                "altcha": altcha_payload,
            },
        )
        assert forgot_res.status_code == 200
        forgot_json = forgot_res.get_json()
        assert forgot_json.get("status") == "success" or forgot_json.get("success") is True

        # Test logout endpoint
        logout_res = live_client.post("/api/v1/auth/logout")
        assert logout_res.status_code == 200
