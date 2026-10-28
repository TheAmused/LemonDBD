# backend/tests/unit/auth/test_login_timing.py
"""A failed sign-in does a full password check whether or not the account exists, so response
timing cannot be used to find out which logins and e-mail addresses are registered."""
from unittest.mock import patch

import pytest

from app.core.extensions import db
from app.core.security import hash_password
from app.models import User
from app.services.user.auth import authenticate_user_credentials


@pytest.mark.unit
@pytest.mark.parametrize("login", ["nobody-here", "ghost@example.com"])
def test_unknown_accounts_still_pay_for_a_password_check(db_session, login: str) -> None:
    with patch("app.core.security.check_password_hash", return_value=False) as check:
        assert authenticate_user_credentials(login, "whatever-password") == (None, None)
    assert check.call_count == 1


@pytest.mark.unit
def test_a_passwordless_account_pays_for_one_too(db_session) -> None:
    db.session.add(User(login="googler", username="Googler", email="g@example.com", password_hash=None, role="user", is_verified=True))
    db.session.commit()
    with patch("app.core.security.check_password_hash", return_value=False) as check:
        assert authenticate_user_credentials("googler", "whatever-password") == (None, None)
    assert check.call_count == 1


@pytest.mark.unit
def test_a_known_account_is_checked_once(db_session) -> None:
    db.session.add(User(login="real", username="Real", email="r@example.com", password_hash=hash_password("right-password"), role="user", is_verified=True))
    db.session.commit()
    with patch("app.core.security.check_password_hash", return_value=False) as check:
        assert authenticate_user_credentials("real", "wrong-password") == (None, None)
    assert check.call_count == 1
