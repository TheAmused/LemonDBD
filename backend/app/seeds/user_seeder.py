# backend/app/seeds/user_seeder.py
import logging
from typing import Any

from sqlalchemy import or_, select
from werkzeug.security import check_password_hash
from app.core.extensions import db
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.services.moderation_actions import ModerationError, active_sanctions, create_sanction

logger = logging.getLogger(__name__)

# The development-only demo accounts. They are offered to the sign-in modal by
# GET /api/v1/auth/demo-accounts and seeded by the static seeder, both only when
# app.core.config.demo_accounts_enabled() is true (FLASK_ENV=development).
#
# `lemon` and `user` are the everyday admin / player logins. The accounts after them each sit in one
# moderation state so the warning modal, the blocked screen and the admin Moderation panel can be
# tried without first punishing someone: an optional "sanction" entry is issued through the real
# moderation service (no e-mail is queued) the first time the account has no active sanction of that
# kind. Keep `user` first among the "player" accounts: the sign-in modal uses the first match.
DEMO_ACCOUNTS: tuple[dict[str, Any], ...] = (
    {
        "login": "lemon",
        "username": "lemon",
        "email": "lemon@lemondbd.com",
        "password": "lemon",
        "role": "admin",
        "avatar_url": "default_avatar",
    },
    {
        "login": "user",
        "username": "user",
        "email": "survivor@lemondbd.com",
        "password": "user",
        "role": "user",
        "avatar_url": "default_avatar",
    },
    {
        "login": "warned",
        "username": "warned",
        "email": "warned@lemondbd.com",
        "password": "warned",
        "role": "user",
        "avatar_url": "default_avatar",
        "state": "warned",
        "sanction": {
            "kind": "warning",
            "reason_code": "harassment",
            "rule_ref": "respect",
            "facts": "Demo account: a warning for disrespectful comments, shown once after sign-in.",
        },
    },
    {
        "login": "suspended",
        "username": "suspended",
        "email": "suspended@lemondbd.com",
        "password": "suspended",
        "role": "user",
        "avatar_url": "default_avatar",
        "state": "suspended",
        "sanction": {
            "kind": "suspension",
            "reason_code": "spam",
            "rule_ref": "fairPlay",
            "facts": "Demo account: suspended for 365 days so the blocked screen can be previewed.",
            "duration_days": 365,
        },
    },
    {
        "login": "banned",
        "username": "banned",
        "email": "banned@lemondbd.com",
        "password": "banned",
        "role": "user",
        "avatar_url": "default_avatar",
        "state": "banned",
        "sanction": {
            "kind": "ban",
            "reason_code": "hate_speech",
            "rule_ref": "respect",
            "facts": "Demo account: permanently banned so the blocked screen can be previewed.",
        },
    },
)


def _apply_demo_sanction(login: str, spec: dict[str, Any]) -> None:
    """Puts a demo account into its moderation state, once, through the real moderation service."""
    user = db.session.scalar(select(User).where(User.login == login))
    if user is None:
        return
    kind = spec["kind"]
    if active_sanctions(user.id, kind=kind):
        return
    fields = {key: value for key, value in spec.items() if key != "kind"}
    try:
        create_sanction(kind, None, user, source="manual", send_email=False, **fields)
        db.session.commit()
        logger.info(f"Demo account '{login}' put into state '{kind}'.")
    except ModerationError as exc:
        db.session.rollback()
        logger.debug(f"Demo account '{login}' keeps its state: {exc.message}")


def seed_default_users() -> None:
    """
    Seeds baseline default admin and test user accounts (the development demo accounts).
    Callers outside tests must check app.core.config.demo_accounts_enabled() first.
    Thread-safe and idempotent to prevent unique constraint crashes under Gunicorn concurrency.
    """
    default_users = DEMO_ACCOUNTS

    try:
        for udata in default_users:
            existing = db.session.scalar(
                select(User).where(
                    or_(
                        User.login == udata["login"],
                        User.email == udata["email"],
                    )
                )
            )
            if not existing:
                new_user = User(
                    login=udata["login"],
                    username=udata["username"],
                    email=udata["email"],
                    password_hash=hash_password(udata["password"]),
                    role=udata["role"],
                    avatar_url=udata["avatar_url"],
                    is_active=True,
                    is_verified=True,
                )
                db.session.add(new_user)
                try:
                    db.session.commit()
                    logger.info(f"Default user seeded: {udata['login']} ({udata['role']})")
                except Exception as commit_err:
                    db.session.rollback()
                    logger.debug(f"Worker concurrency notice seeding user {udata['login']}: {commit_err}")
            else:
                changed = False
                # Ensure the primary user retains admin role
                if existing.login == "lemon" and existing.role != "admin":
                    existing.role = "admin"
                    changed = True

                # Ensure default users are marked verified
                if existing.login in ("lemon", "user") and not existing.is_verified:
                    existing.is_verified = True
                    changed = True

                # Self-heal a stale/incompatible password hash on the seeded
                # default accounts (e.g. left over from before the password
                # hashing method changed) -- otherwise the known default
                # credential silently stops working for anyone using it, and
                # any unreadable-hash format bubbles up rather than just
                # failing to verify. Only touches accounts still on their
                # seeded default password's hash shape; never re-hashes on
                # a merely-wrong-password mismatch.
                try:
                    hash_is_valid = verify_password(udata["password"], existing.password_hash)
                except Exception:
                    hash_is_valid = False
                if not hash_is_valid:
                    try:
                        check_password_hash(existing.password_hash, udata["password"])
                    except (ValueError, TypeError):
                        existing.password_hash = hash_password(udata["password"])
                        changed = True
                        logger.info(
                            f"Re-hashed stale/incompatible password hash for seeded user '{udata['login']}'."
                        )

                if changed:
                    db.session.commit()

            if udata.get("sanction"):
                _apply_demo_sanction(udata["login"], udata["sanction"])
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error during default user seeding: {e}")