# backend/app/services/user/auth.py
import logging
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, or_, select, update

from app.core.account_state import AccountBlockedError, is_blocked
from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.core.transaction import transaction
from app.core.security import (
    decode_token,
    generate_token,
    token_matches_user,
    hash_password,
    verify_password,
)
from app.models import BugReport, User
from app.services import ban_list
from app.services.mail_service import send_password_reset_email, send_verification_email
from app.services.site_settings import (
    email_verification_required,
    password_min_length,
    resend_cooldown,
    reset_lifetime,
    verification_lifetime,
    verification_max_attempts,
)

logger = logging.getLogger(__name__)

# Lifetimes are admin-editable: see app.services.site_settings (read at use time).


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


@retry_on_transient_db_error()
def create_user_account(
    login: str,
    username: str,
    email: str,
    password: str,
    role: str = "user",
    avatar_url: str = "default_avatar",
) -> tuple[User | None, str | None]:
    """Validate registration parameters, hash passwords, and persist new User entity.

    Retries on a transient connection drop/pool-timeout (see db_retry.py):
    safe here because the only write is the final db.session.commit() of
    new_user, and a dropped connection means that commit did not reach the
    server -- a retry either creates the account cleanly, or (in the rare
    case the drop happened after the server received but before we saw the
    ack) hits the username/email uniqueness check above and returns the
    normal "already taken" error instead of a 500. Either outcome is
    correct; neither double-creates an account.
    """
    clean_login = (login or "").strip()
    clean_username = (username or "").strip()
    clean_email = (email or "").strip().lower()

    if not clean_login or len(clean_login) < 3:
        return None, "Login must be at least 3 characters long."
    if "@" in clean_login or any(ch.isspace() for ch in clean_login):
        return None, "Login cannot contain spaces or the @ sign."
    if not clean_username or len(clean_username) < 3:
        return None, "Username must be at least 3 characters long."
    if not clean_email or "@" not in clean_email:
        return None, "A valid email address is required."
    min_length = password_min_length()
    if not password or len(password) < min_length:
        return None, f"Password must be at least {min_length} characters long."

    # Ban-evasion list (off unless BAN_LIST_ENABLED): same wording for every refused address, and
    # checked before the duplicate checks so it never reveals whether an account exists.
    refusal = ban_list.registration_refusal(clean_email)
    if refusal:
        return None, refusal

    existing_login = db.session.scalars(
        select(User).where(func.lower(User.login) == clean_login.lower())
    ).first()
    if existing_login:
        return None, "Login is already taken."

    existing_email = db.session.scalars(
        select(User).where(func.lower(User.email) == clean_email)
    ).first()
    if existing_email:
        return None, "Email address is already registered."

    role_clean = role.lower() if role in ["admin", "user"] else "user"
    pw_hash = hash_password(password)

    require_verification = email_verification_required()

    sent_at = datetime.now(timezone.utc)
    if require_verification:
        is_verified = False
        verif_code = _generate_verification_code()
        verif_expires = sent_at + verification_lifetime()
    else:
        is_verified = True
        verif_code = None
        verif_expires = None

    new_user = User(
        login=clean_login,
        username=clean_username,
        email=clean_email,
        password_hash=pw_hash,
        role=role_clean,
        avatar_url=avatar_url or "default_avatar",
        is_active=True,
        is_verified=is_verified,
        verification_code=verif_code,
        verification_code_expires_at=verif_expires,
        verification_sent_at=sent_at if require_verification else None,
        verification_attempts=0,
    )
    with transaction():
        db.session.add(new_user)

    if require_verification:
        logger.info(f"User '{new_user.login}' registered with role '{new_user.role}'.")
        send_verification_email(new_user)
    else:
        logger.info(
            f"User '{new_user.login}' registered and auto-verified (REQUIRE_EMAIL_VERIFICATION is disabled)."
        )
    return new_user, None


def claim_guest_bug_reports(user: User) -> int:
    """Attach the guest bug reports filed with `user.email` to `user`; returns how many.

    Only call this once the address is proven (a verification code was just consumed): the email a
    guest types is otherwise all that ties a report to a person.
    """
    if not user.email:
        return 0
    result = db.session.execute(
        update(BugReport)
        .where(BugReport.user_id.is_(None), func.lower(BugReport.reporter_email) == user.email.lower())
        .values(user_id=user.id)
        .execution_options(synchronize_session=False)
    )
    return int(result.rowcount or 0)


#: What a sign-in or sign-up that still needs the e-mail code returns instead of a session.
VERIFICATION_PENDING_TYPE = "verify"
VERIFICATION_PENDING_LIFETIME = timedelta(hours=1)


def needs_email_verification(user: User) -> bool:
    """True while the site requires a confirmed address and this account has not confirmed one."""
    return email_verification_required() and not user.is_verified


def create_verification_pending_token(user: User) -> str:
    """Proof that the password step passed for `user`, good only for finishing sign-in with the e-mail code."""
    return generate_token(user.id, user.role, token_type=VERIFICATION_PENDING_TYPE, lifetime=VERIFICATION_PENDING_LIFETIME)


def user_from_verification_pending_token(token: str | None) -> User | None:
    """The account a still-valid pending-verification token belongs to (same credentials version), else None."""
    from app.core.security import decode_token

    payload = decode_token(token or "") if token else None
    if not payload or payload.get("typ") != VERIFICATION_PENDING_TYPE:
        return None
    try:
        user = db.session.get(User, int(payload["sub"]))
        version = int(payload.get("ver", 0))
    except (KeyError, TypeError, ValueError):
        return None
    if user is None or version != int(user.token_version or 0):
        return None
    return user


def verify_email_code(email: str, code: str) -> tuple[User | None, str | None]:
    """Consume a verification code and mark the matching user as verified."""
    clean_email = (email or "").strip().lower()
    clean_code = (code or "").strip()
    if not clean_email or not clean_code:
        return None, "Email and verification code are required."

    user = db.session.scalars(
        select(User).where(func.lower(User.email) == clean_email)
    ).first()
    if not user or not user.verification_code:
        return None, "Invalid or already used verification code."

    expires_at = user.verification_code_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        return None, "This verification code has expired. Please request a new one."

    with transaction():
        if user.verification_code != clean_code:
            user.verification_attempts += 1
            if user.verification_attempts >= verification_max_attempts():
                user.verification_code = None
                user.verification_code_expires_at = None
                user.verification_attempts = 0
                return None, "Too many incorrect attempts. Please request a new code."
            return None, "Invalid or already used verification code."

        user.is_verified = True
        user.verification_code = None
        user.verification_code_expires_at = None
        user.verification_attempts = 0
        claimed = claim_guest_bug_reports(user)

    logger.info(f"User '{user.login}' verified their email.")
    if claimed:
        logger.info(f"User '{user.login}' claimed {claimed} guest bug report(s) filed with their address.")
    return user, None


def _cooldown_left(sent_at: datetime | None, expires_at: datetime | None, lifetime: timedelta) -> int:
    """Seconds until another code or link may be sent (0 when it may be sent now).

    Counted from the stored send time. A code sent before that was stored falls back to
    `expires_at - lifetime`, clamped so a lifetime the admin shortened since cannot push the send
    time into the future (that used to block new reset mails for most of an hour).
    """
    now = datetime.now(timezone.utc)
    last = sent_at
    if last is None and expires_at is not None:
        last = min(expires_at - lifetime, now - resend_cooldown())
    if last is None:
        return 0
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    remaining = resend_cooldown() - (now - last)
    return max(0, int(remaining.total_seconds()) + 1) if remaining.total_seconds() > 0 else 0


def resend_verification_email(email: str) -> tuple[bool, str | None]:
    """Regenerate and resend a verification code if the account isn't verified yet."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return True, None

    user = db.session.scalars(
        select(User).where(func.lower(User.email) == clean_email)
    ).first()
    if not user or user.is_verified:
        return True, None

    expires_at = user.verification_code_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if _cooldown_left(user.verification_sent_at, expires_at, verification_lifetime()):
        # The same answer as for an unknown or verified address: a 429 here told anyone that the
        # address has an account waiting for its code. The form's own countdown covers the wait.
        return True, None

    now = datetime.now(timezone.utc)
    with transaction():
        user.verification_code = _generate_verification_code()
        user.verification_code_expires_at = now + verification_lifetime()
        user.verification_sent_at = now
        user.verification_attempts = 0

    send_verification_email(user)
    return True, None


def request_password_reset(email: str) -> tuple[bool, str | None]:
    """Generate a reset token and email it, if an account with this email exists."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return True, None

    user = db.session.scalars(
        select(User).where(func.lower(User.email) == clean_email)
    ).first()
    if not user:
        return True, None

    expires_at = user.reset_token_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if _cooldown_left(user.reset_sent_at, expires_at, reset_lifetime()):
        # Silent, like an unknown address: a 429 only for registered addresses revealed the account.
        return True, None

    now = datetime.now(timezone.utc)
    with transaction():
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expires_at = now + reset_lifetime()
        user.reset_sent_at = now

    send_password_reset_email(user)
    return True, None


def reset_password_with_token(token: str, new_password: str) -> tuple[User | None, str | None]:
    """Consume a reset token and set a new password for the matching user."""
    clean_token = (token or "").strip()
    if not clean_token:
        return None, "Reset token is required."
    min_length = password_min_length()
    if not new_password or len(new_password) < min_length:
        return None, f"Password must be at least {min_length} characters long."

    user = db.session.scalars(
        select(User).where(User.reset_token == clean_token)
    ).first()
    if not user:
        return None, "Invalid or already used reset link."

    expires_at = user.reset_token_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        return None, "This reset link has expired. Please request a new one."

    with transaction():
        user.password_hash = hash_password(new_password)
        user.token_version = int(user.token_version or 0) + 1  # signs out every existing session
        user.reset_token = None
        user.reset_token_expires_at = None

    logger.info(f"User '{user.login}' reset their password.")
    return user, None


def auto_verify_if_disabled(user: User) -> None:
    """When REQUIRE_EMAIL_VERIFICATION is off, mark an unverified user as verified once sign-in completes."""
    require_verification = email_verification_required()

    if not require_verification and not user.is_verified:
        with transaction():
            user.is_verified = True
            user.verification_code = None
            user.verification_code_expires_at = None
            user.verification_attempts = 0
        logger.info(
            f"User '{user.login}' auto-verified upon login (REQUIRE_EMAIL_VERIFICATION is disabled)."
        )


@retry_on_transient_db_error()
def authenticate_user_credentials(
    login_or_email: str,
    password: str,
) -> tuple[User | None, str | None]:
    """Verify login/email and password against stored database hash."""
    clean_id = (login_or_email or "").strip()
    if not clean_id or not password:
        return None, None

    user = db.session.scalars(
        select(User).where(
            or_(
                func.lower(User.login) == clean_id.lower(),
                func.lower(User.email) == clean_id.lower(),
            )
        )
    ).first()

    if not user:
        return None, None

    if verify_password(password, user.password_hash):
        from app.services.user import two_factor

        if two_factor.is_enabled(user.id):
            # A banned or suspended account is reported after the second factor (complete_login).
            return user, None

        if is_blocked(user):
            # Only someone who knows the password learns why; a wrong password stays a plain 401.
            raise AccountBlockedError(user)

        auto_verify_if_disabled(user)
        token = generate_token(user.id, user.role)
        return user, token

    return None, None


def retrieve_user_from_jwt(token: str) -> User | None:
    """Decode incoming JWT and fetch corresponding active User entity."""
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload["sub"])
        user = db.session.get(User, user_id)
        if user and not is_blocked(user) and token_matches_user(payload, user):
            return user
    except (ValueError, TypeError):
        return None
    return None
