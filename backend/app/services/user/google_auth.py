# backend/app/services/user/google_auth.py
import logging
import re
import secrets
from dataclasses import dataclass

import jwt
from flask import current_app
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.account_state import AccountBlockedError, is_blocked
from app.core.extensions import db
from app.models import User
from app.services import ban_list, site_settings
from app.utils.api_i18n import localized_message

logger = logging.getLogger(__name__)

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]
LOGIN_PREFIX = "player"
LOGIN_DIGITS = 8
USERNAME_MIN = 3
USERNAME_MAX = 50
_USERNAME_FILLER = "player"
_CREATE_ATTEMPTS = 5
_LOGIN_ATTEMPTS = 20
# A server clock a few seconds behind Google's would otherwise reject a fresh token ("iat" in the future).
CLOCK_SKEW_SECONDS = 30

_jwk_client = jwt.PyJWKClient(GOOGLE_CERTS_URL, cache_keys=True, lifespan=3600)


class GoogleAuthError(Exception):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str


def client_id() -> str:
    return str(current_app.config.get("GOOGLE_CLIENT_ID") or "")


def is_configured() -> bool:
    return bool(client_id())


def verify_id_token(credential: str | None) -> GoogleIdentity:
    if not is_configured():
        raise GoogleAuthError("Google sign-in is not configured.", 503)
    if not credential or not isinstance(credential, str):
        raise GoogleAuthError("Google credential is required.", 400)
    try:
        signing_key = _jwk_client.get_signing_key_from_jwt(credential)
        claims = jwt.decode(
            credential,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id(),
            issuer=GOOGLE_ISSUERS,
            leeway=CLOCK_SKEW_SECONDS,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except jwt.PyJWKClientConnectionError as exc:
        logger.warning("Could not fetch Google signing keys: %s", exc)
        raise GoogleAuthError("Google sign-in is temporarily unavailable.", 503)
    except jwt.PyJWTError as exc:
        logger.info("Rejected Google ID token: %s", exc)
        raise GoogleAuthError("Invalid Google credential.", 401)

    email = str(claims.get("email") or "").strip().lower()
    if not email or claims.get("email_verified") is not True:
        raise GoogleAuthError("Your Google account email is not verified.", 403)
    return GoogleIdentity(sub=str(claims["sub"]), email=email)


def _login_taken(candidate: str) -> bool:
    return db.session.scalar(
        select(User.id).where(func.lower(User.login) == candidate.lower()).limit(1)
    ) is not None


def unique_login() -> str:
    for _ in range(_LOGIN_ATTEMPTS):
        candidate = f"{LOGIN_PREFIX}{secrets.randbelow(10**LOGIN_DIGITS):0{LOGIN_DIGITS}d}"
        if not _login_taken(candidate):
            return candidate
    return f"{LOGIN_PREFIX}{secrets.token_hex(8)}"


def display_username(email: str) -> str:
    local = re.sub(r"[^A-Za-z0-9_.-]", "", email.split("@", 1)[0])
    if len(local) < USERNAME_MIN:
        local = f"{local}{_USERNAME_FILLER}"
    return local[:USERNAME_MAX]


def _find(identity: GoogleIdentity) -> User | None:
    user = db.session.scalars(select(User).where(User.google_sub == identity.sub)).first()
    if user:
        return user
    return db.session.scalars(
        select(User).where(func.lower(User.email) == identity.email)
    ).first()


def _link(user: User, identity: GoogleIdentity) -> None:
    if not user.is_verified:
        # The e-mail was never confirmed, so whoever registered it may not own it. Google has just
        # proven the real owner: drop the password that registration set and end its sessions.
        user.password_hash = None
        user.token_version = int(user.token_version or 0) + 1
        user.verification_code = None
        user.verification_code_expires_at = None
        user.verification_attempts = 0
        user.is_verified = True
    user.google_sub = identity.sub
    db.session.commit()
    logger.info("Linked Google account to user '%s'.", user.login)


def credential_belongs_to(user: User, credential: str | None) -> bool:
    if user.google_sub is None or not credential:
        return False
    try:
        return verify_id_token(credential).sub == user.google_sub
    except GoogleAuthError:
        return False


def sign_in(credential: str | None) -> tuple[User, bool]:
    identity = verify_id_token(credential)

    for _ in range(_CREATE_ATTEMPTS):
        user = _find(identity)
        if user:
            if is_blocked(user):
                from app.services.user import two_factor

                # With 2FA on, the block is reported after the second factor (complete_login), and
                # the Google identity is not linked to a blocked account in the meantime.
                if not two_factor.is_enabled(user.id):
                    raise AccountBlockedError(user)
                return user, False
            if user.google_sub is None:
                _link(user, identity)
            elif user.google_sub != identity.sub:
                raise GoogleAuthError("This email is linked to a different Google account.", 409)
            return user, False

        if not site_settings.registration_open():
            raise GoogleAuthError(localized_message("registration_closed"), 403)

        refusal = ban_list.registration_refusal(identity.email)
        if refusal:
            raise GoogleAuthError(refusal, 403)

        new_user = User(
            login=unique_login(),
            username=display_username(identity.email),
            email=identity.email,
            password_hash=None,
            google_sub=identity.sub,
            is_active=True,
            is_verified=True,
        )
        db.session.add(new_user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            continue
        logger.info("User '%s' registered with Google.", new_user.login)
        return new_user, True

    raise GoogleAuthError("Could not create the account, please try again.", 503)
