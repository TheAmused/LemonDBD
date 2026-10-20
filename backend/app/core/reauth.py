# backend/app/core/reauth.py
"""Re-authentication for the admin actions a stolen session must not be able to take.

A session cookie proves that someone signed in, not that the admin is at the keyboard now. The actions
that grant admin rights or rewrite the database in bulk (creating or promoting an admin, demoting or
resetting the second factor of another admin, database import and purge) therefore also need the
acting admin's own password and, when their account has two-factor sign-in, a current code. Without
both, a stolen cookie could mint an admin with a password the attacker chose and act through it.
"""
from typing import Any

from flask import Response

from app.core.security import verify_password
from app.models.user import User
from app.utils.api_i18n import error_response
from app.utils.responses import api_error


def reauth_error(actor: User, data: dict[str, Any] | None) -> tuple[Response, int] | None:
    """None when `data` carries the actor's current password (and 2FA code when it is on), else a 403."""
    from app.services.user import two_factor

    body = data if isinstance(data, dict) else {}
    if not actor.password_hash:
        return api_error("Set a password on your own account before taking this action.", 403, error_code="reauth_password_missing")
    password = body.get("current_password")
    if not isinstance(password, str) or not password or not verify_password(password, actor.password_hash):
        return api_error("Confirm with your own password to take this action.", 403, error_code="reauth_required")
    if two_factor.is_enabled(actor.id):
        code = body.get("two_factor_code")
        if not isinstance(code, str) or not code.strip():
            return api_error("Confirm with a code from your authenticator app.", 403, error_code="reauth_two_factor_required")
        try:
            two_factor.verify_second_factor(actor, code)
        except two_factor.TwoFactorError as err:
            # 403, not the sign-in flow's 401: the session itself is still valid.
            return error_response(err.code, 403 if err.status == 401 else err.status, None, **err.extra)
    return None
