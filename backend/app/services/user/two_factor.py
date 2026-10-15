# backend/app/services/user/two_factor.py
"""Optional two-factor sign-in: TOTP authenticator app + single-use recovery codes.

Every function raises `TwoFactorError` (a machine-readable `code` that routes turn into a
localized `error_code` response, and an HTTP status) instead of returning error strings.

Safety properties worth keeping when editing this file:
* the TOTP secret is only ever stored encrypted (app/core/two_factor_crypto.py);
* a code is accepted once: `last_used_step` is advanced with a conditional UPDATE, so two
  concurrent requests with the same code cannot both succeed;
* five wrong codes lock the *account's* second factor for 15 minutes (counted in the database,
  so the limit holds across workers and cannot be dodged by changing IP);
* the password is checked before a code is, so a wrong password never burns a valid code.
"""
import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import current_app
from sqlalchemy import delete, func, select, update
from werkzeug.security import check_password_hash, generate_password_hash

from app.core import totp
from app.core.account_state import AccountBlockedError, is_blocked
from app.core.extensions import db
from app.core.security import decode_token, generate_token, verify_password
from app.core.two_factor_crypto import (
    TwoFactorUnavailable,
    decrypt_secret,
    encrypt_secret,
    is_configured,
)
from app.models import User, UserRecoveryCode, UserTwoFactor
from app.models.base import utcnow
from app.services.mail_service import send_security_notice_email

logger = logging.getLogger(__name__)

CHALLENGE_TOKEN_TYPE = "2fa"
CHALLENGE_LIFETIME = timedelta(minutes=5)
MAX_FAILED_ATTEMPTS = 5
LOCKOUT = timedelta(minutes=15)
RECOVERY_CODE_COUNT = 10
# Crockford base32: no I, L, O or U, so a code read off paper cannot be misread.
_RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
_RECOVERY_LENGTH = 10


@dataclass
class TwoFactorError(Exception):
    code: str
    status: int = 400
    extra: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return self.code


def _aware(moment: datetime | None) -> datetime | None:
    if moment is not None and moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def _require_available() -> None:
    if not is_configured():
        raise TwoFactorError("two_factor_unavailable", 503)


def _row(user_id: int) -> UserTwoFactor | None:
    return db.session.scalar(select(UserTwoFactor).where(UserTwoFactor.user_id == user_id))


def _enabled_row(user_id: int) -> UserTwoFactor | None:
    row = _row(user_id)
    return row if row is not None and row.is_enabled else None


def is_enabled(user_id: int) -> bool:
    return _enabled_row(user_id) is not None


def enabled_user_ids(user_ids: list[int]) -> set[int]:
    """Which of these accounts have 2FA switched on (one query, for the admin user table)."""
    if not user_ids:
        return set()
    return set(
        db.session.scalars(
            select(UserTwoFactor.user_id).where(
                UserTwoFactor.user_id.in_(user_ids), UserTwoFactor.enabled_at.is_not(None)
            )
        )
    )


def _remaining_recovery_codes(user_id: int) -> int:
    return db.session.scalar(
        select(func.count(UserRecoveryCode.id)).where(
            UserRecoveryCode.user_id == user_id, UserRecoveryCode.used_at.is_(None)
        )
    ) or 0


def status(user: User) -> dict[str, Any]:
    row = _enabled_row(user.id)
    return {
        "available": is_configured(),
        "enabled": row is not None,
        "enabled_at": _aware(row.enabled_at).isoformat() if row else None,
        "recovery_codes_remaining": _remaining_recovery_codes(user.id) if row else 0,
    }


# --- proving it is really the owner ---------------------------------------------------------


def _check_password(user: User, password: str | None) -> None:
    if not password:
        raise TwoFactorError("password_required", 400)
    if not verify_password(password, user.password_hash):
        raise TwoFactorError("incorrect_password", 403)


def _raise_if_locked(row: UserTwoFactor) -> None:
    locked_until = _aware(row.locked_until)
    if locked_until and locked_until > utcnow():
        raise TwoFactorError(
            "two_factor_locked", 429, {"retry_after": int((locked_until - utcnow()).total_seconds()) + 1}
        )


def _register_failure(row: UserTwoFactor) -> TwoFactorError:
    """Count a wrong code (atomically) and lock the account's second factor at the limit."""
    db.session.execute(
        update(UserTwoFactor)
        .where(UserTwoFactor.id == row.id)
        .values(failed_attempts=UserTwoFactor.failed_attempts + 1)
    )
    db.session.commit()
    db.session.refresh(row)
    if row.failed_attempts >= MAX_FAILED_ATTEMPTS:
        row.failed_attempts = 0
        row.locked_until = utcnow() + LOCKOUT
        db.session.commit()
        logger.warning(f"2FA locked for user {row.user_id} after {MAX_FAILED_ATTEMPTS} wrong codes")
        return TwoFactorError("two_factor_locked", 429, {"retry_after": int(LOCKOUT.total_seconds())})
    return TwoFactorError("invalid_two_factor_code", 401)


def _accept_totp(row: UserTwoFactor, code: str) -> bool:
    try:
        secret = decrypt_secret(row.secret_encrypted)
    except TwoFactorUnavailable:
        raise TwoFactorError("two_factor_unavailable", 503)
    step = totp.match_step(secret, code, after_step=int(row.last_used_step or 0))
    if step is None:
        return False
    claimed = db.session.execute(
        update(UserTwoFactor)
        .where(UserTwoFactor.id == row.id, UserTwoFactor.last_used_step < step)
        .values(last_used_step=step, failed_attempts=0, locked_until=None)
    ).rowcount
    db.session.commit()
    if claimed:
        db.session.refresh(row)
    return bool(claimed)


def _normalize_recovery_code(code: str | None) -> str:
    cleaned = "".join(ch for ch in (code or "").upper() if ch not in " -")
    return cleaned.translate(str.maketrans({"O": "0", "I": "1", "L": "1"}))


def _accept_recovery_code(row: UserTwoFactor, code: str) -> bool:
    cleaned = _normalize_recovery_code(code)
    if len(cleaned) != _RECOVERY_LENGTH or any(ch not in _RECOVERY_ALPHABET for ch in cleaned):
        return False
    candidates = db.session.scalars(
        select(UserRecoveryCode).where(
            UserRecoveryCode.user_id == row.user_id, UserRecoveryCode.used_at.is_(None)
        )
    ).all()
    for candidate in candidates:
        if check_password_hash(candidate.code_hash, cleaned):
            burned = db.session.execute(
                update(UserRecoveryCode)
                .where(UserRecoveryCode.id == candidate.id, UserRecoveryCode.used_at.is_(None))
                .values(used_at=utcnow())
            ).rowcount
            if burned:
                row.failed_attempts = 0
                row.locked_until = None
                db.session.commit()
                return True
            db.session.rollback()
            return False
    return False


def verify_second_factor(user: User, code: str | None) -> str:
    """Check a six-digit app code or a recovery code; returns "totp" or "recovery".

    Raises `TwoFactorError`: 409 when 2FA is not on, 429 while locked, 401 for a wrong code.
    """
    _require_available()
    row = _enabled_row(user.id)
    if row is None:
        raise TwoFactorError("two_factor_not_enabled", 409)
    _raise_if_locked(row)

    is_app_code = len(totp.normalize_code(code)) == totp.DIGITS and not any(
        ch.isalpha() for ch in (code or "")
    )
    if is_app_code and _accept_totp(row, code or ""):
        return "totp"
    if not is_app_code and _accept_recovery_code(row, code or ""):
        return "recovery"
    raise _register_failure(row)


def require_recent_auth(user: User, password: str | None, code: str | None = None) -> None:
    """The gate for sensitive actions: the password, plus a code when 2FA is on."""
    _check_password(user, password)
    if is_enabled(user.id):
        if not (code or "").strip():
            raise TwoFactorError("two_factor_required", 403)
        verify_second_factor(user, code)


# --- enrolment ------------------------------------------------------------------------------


def _issue_recovery_codes(user_id: int) -> list[str]:
    db.session.execute(delete(UserRecoveryCode).where(UserRecoveryCode.user_id == user_id))
    plain: list[str] = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = "".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(_RECOVERY_LENGTH))
        db.session.add(UserRecoveryCode(user_id=user_id, code_hash=generate_password_hash(raw)))
        plain.append(f"{raw[:5]}-{raw[5:]}")
    return plain


def begin_setup(user: User, password: str | None) -> dict[str, str]:
    """Create (or restart) a pending enrolment and hand back the secret to scan."""
    _require_available()
    _check_password(user, password)
    row = _row(user.id)
    if row is not None and row.is_enabled:
        raise TwoFactorError("two_factor_already_enabled", 409)
    secret = totp.generate_secret()
    encrypted = encrypt_secret(secret)
    if row is None:
        db.session.add(UserTwoFactor(user_id=user.id, secret_encrypted=encrypted))
    else:
        row.secret_encrypted = encrypted
        row.last_used_step = 0
        row.failed_attempts = 0
        row.locked_until = None
    db.session.commit()
    issuer = str(current_app.config.get("TWO_FACTOR_ISSUER") or "LemonDBD")
    return {"secret": secret, "otpauth_uri": totp.provisioning_uri(secret, user.login, issuer)}


def confirm_setup(user: User, code: str | None) -> list[str]:
    """Turn 2FA on once the person proves the app produces valid codes; returns the recovery codes."""
    _require_available()
    row = _row(user.id)
    if row is None:
        raise TwoFactorError("two_factor_not_started", 409)
    if row.is_enabled:
        raise TwoFactorError("two_factor_already_enabled", 409)
    _raise_if_locked(row)
    if not _accept_totp(row, code or ""):
        raise _register_failure(row)
    row.enabled_at = utcnow()
    user.token_version = int(user.token_version or 0) + 1
    codes = _issue_recovery_codes(user.id)
    db.session.commit()
    send_security_notice_email(user, "two_factor_enabled")
    return codes


def disable(user: User, password: str | None, code: str | None) -> None:
    _require_available()
    if not is_enabled(user.id):
        raise TwoFactorError("two_factor_not_enabled", 409)
    require_recent_auth(user, password, code)
    user.token_version = int(user.token_version or 0) + 1
    _remove(user.id)
    send_security_notice_email(user, "two_factor_disabled")


def regenerate_recovery_codes(user: User, password: str | None, code: str | None) -> list[str]:
    _require_available()
    if not is_enabled(user.id):
        raise TwoFactorError("two_factor_not_enabled", 409)
    require_recent_auth(user, password, code)
    codes = _issue_recovery_codes(user.id)
    db.session.commit()
    send_security_notice_email(user, "recovery_codes_regenerated")
    return codes


def _remove(user_id: int) -> bool:
    db.session.execute(delete(UserRecoveryCode).where(UserRecoveryCode.user_id == user_id))
    removed = db.session.execute(delete(UserTwoFactor).where(UserTwoFactor.user_id == user_id)).rowcount
    db.session.commit()
    return bool(removed)


def admin_reset(target: User) -> bool:
    """Switch 2FA off for someone who lost their device and codes. True if it was on."""
    had_it = _remove(target.id)
    if had_it:
        target.token_version = int(target.token_version or 0) + 1
        db.session.commit()
        send_security_notice_email(target, "two_factor_reset")
    return had_it


# --- sign-in --------------------------------------------------------------------------------


def create_challenge(user: User) -> str:
    """The short-lived token that proves the password step passed (it is not a session)."""
    return generate_token(user.id, user.role, token_type=CHALLENGE_TOKEN_TYPE, lifetime=CHALLENGE_LIFETIME)


def complete_login(challenge: str | None, code: str | None) -> tuple[User, str]:
    """Second step of a sign-in: challenge token + code -> (user, method used)."""
    from app.services.user.auth import auto_verify_if_disabled

    payload = decode_token(challenge or "")
    if not payload or payload.get("typ") != CHALLENGE_TOKEN_TYPE:
        raise TwoFactorError("two_factor_challenge_invalid", 401)
    try:
        user = db.session.get(User, int(payload["sub"]))
        version = int(payload.get("ver", 0))
    except (KeyError, TypeError, ValueError):
        raise TwoFactorError("two_factor_challenge_invalid", 401)
    if user is None or version != int(user.token_version or 0):
        raise TwoFactorError("two_factor_challenge_invalid", 401)
    try:
        method = verify_second_factor(user, code)
    except TwoFactorError as err:
        if err.code == "two_factor_not_enabled":
            raise TwoFactorError("two_factor_challenge_invalid", 401)
        raise
    if is_blocked(user):
        # Fully authenticated (password and second factor): now it is safe to say why.
        raise AccountBlockedError(user)
    auto_verify_if_disabled(user)
    return user, method
