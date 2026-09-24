# backend/tests/unit/test_email_verification_config.py
from unittest.mock import patch
import pytest
from flask import Flask
from app.services.user.auth import create_user_account
from app.services.user_service import UserService


@pytest.mark.unit
def test_create_user_account_with_verification_enabled(app: Flask):
    """When REQUIRE_EMAIL_VERIFICATION is True, new users must be unverified and receive a code."""
    app.config["REQUIRE_EMAIL_VERIFICATION"] = True
    user_service = UserService()

    with patch("app.services.user.auth.send_verification_email") as mock_send_email:
        user, err = user_service.register_user(
            username="verified_mode_user",
            email="verif_on@example.com",
            password="password123",
        )
        assert err is None
        assert user is not None
        assert user.is_verified is False
        assert user.verification_code is not None
        assert len(user.verification_code) == 6
        mock_send_email.assert_called_once_with(user)


@pytest.mark.unit
def test_create_user_account_with_verification_disabled(app: Flask):
    """When REQUIRE_EMAIL_VERIFICATION is False, new users must be auto-verified with no email sent."""
    app.config["REQUIRE_EMAIL_VERIFICATION"] = False
    user_service = UserService()

    with patch("app.services.user.auth.send_verification_email") as mock_send_email:
        user, err = user_service.register_user(
            username="auto_verified_user",
            email="verif_off@example.com",
            password="password123",
        )
        assert err is None
        assert user is not None
        assert user.is_verified is True
        assert user.verification_code is None
        assert user.verification_code_expires_at is None
        mock_send_email.assert_not_called()
