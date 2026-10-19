# backend/app/services/user/admin.py
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import ColumnElement, and_, case, func, not_, or_, select, update

from app.core.account_state import block_kind
from app.core.extensions import db
from app.core.security import verify_password
from app.core.transaction import transaction
from app.models import (
    BugReport,
    ContentReport,
    ContentReportSubscriber,
    User,
    UserCharacterOwnership,
    UserPerkOwnership,
)
from app.services.moderation_actions import ModerationError, ban, restore_account
from app.services.user import google_auth
from app.services.user.two_factor import enabled_user_ids
from app.services.user.avatar import (
    get_avatar_storage_directory,
    remove_stale_avatar_file,
)

logger = logging.getLogger(__name__)


def list_all_users_paginated(
    search: str | None = None,
    role: str | None = None,
    page: int = 1,
    per_page: int = 20,
    standing: str | None = None,
) -> dict[str, Any]:
    """Retrieve paginated user records annotated with owned count metrics.

    The per-row owned-character / unlocked-perk counts used to be two extra
    COUNT queries *per user* (2 * per_page queries for one page load). Both
    are now fetched as a single GROUP BY per metric, scoped to just the
    users on this page, and merged in Python -- 2 extra queries total
    regardless of page size.
    """
    stmt = select(User)

    if role and role.lower() in ["admin", "user"]:
        stmt = stmt.where(User.role == role.lower())

    standing_condition = _standing_condition((standing or "").strip().lower())
    if standing_condition is not None:
        stmt = stmt.where(standing_condition)

    if search and search.strip():
        pat = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(User.login.ilike(pat), User.username.ilike(pat), User.email.ilike(pat))
        )

    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(User.id.asc()).offset((page - 1) * per_page).limit(per_page)
    users = db.session.scalars(stmt).all()
    user_ids = [u.id for u in users]

    owned_chars_by_user: dict[int, int] = {}
    unlocked_perks_by_user: dict[int, int] = {}

    if user_ids:
        char_rows = db.session.execute(
            select(UserCharacterOwnership.user_id, func.count(UserCharacterOwnership.id))
            .where(
                UserCharacterOwnership.user_id.in_(user_ids),
                UserCharacterOwnership.is_owned.is_(True),
            )
            .group_by(UserCharacterOwnership.user_id)
        ).all()
        owned_chars_by_user = dict(char_rows)

        perk_rows = db.session.execute(
            select(UserPerkOwnership.user_id, func.count(UserPerkOwnership.id))
            .where(
                UserPerkOwnership.user_id.in_(user_ids),
                UserPerkOwnership.is_unlocked.is_(True),
            )
            .group_by(UserPerkOwnership.user_id)
        ).all()
        unlocked_perks_by_user = dict(perk_rows)

    two_factor_users = enabled_user_ids(user_ids)

    user_list = []
    for u in users:
        d = u.to_dict()
        d["two_factor_enabled"] = u.id in two_factor_users
        d["owned_characters_count"] = owned_chars_by_user.get(u.id, 0)
        d["unlocked_perks_count"] = unlocked_perks_by_user.get(u.id, 0)
        user_list.append(d)

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "users": user_list,
    }


def admin_modify_user(
    user_id: int,
    role: str | None = None,
    is_active: bool | None = None,
    acting_admin: User | None = None,
    username: str | None = None,
    is_verified: bool | None = None,
) -> tuple[User | None, str | None]:
    """Administrative update of an account: role, display name, e-mail verification and active status.

    `is_active` is the old enable/disable switch; it now goes through the sanctions so that the
    decision is recorded and the user is told: False bans the account, True lifts every running
    suspension and ban. Warnings, suspensions and reasons have their own endpoints.
    """
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    clean_role = role.lower() if role and role.lower() in ("admin", "user") else None
    if clean_role == "user" and acting_admin is not None and acting_admin.id == user_id:
        return None, "You cannot remove your own admin role."
    clean_username = username.strip() if username is not None else None
    if clean_username is not None and len(clean_username) < 3:
        return None, "Username must be at least 3 characters long."

    if clean_role or clean_username or is_verified is not None:
        with transaction():
            if clean_role:
                user.role = clean_role
            if clean_username:
                user.username = clean_username
            if is_verified is not None:
                user.is_verified = is_verified
                if is_verified:
                    user.verification_code = None
                    user.verification_code_expires_at = None
                    user.verification_attempts = 0

    try:
        if is_active is False and block_kind(user) != "banned":
            ban(
                acting_admin,
                user_id,
                reason_code="other",
                facts="The account was disabled by an administrator.",
            )
        elif is_active is True and block_kind(user) is not None:
            restore_account(acting_admin, user_id, "Re-enabled by an administrator.")
    except ModerationError as err:
        return None, err.message

    return db.session.get(User, user_id), None


def _anonymise_moderation_records(user_id: int) -> None:
    """Moderation records outlive the account (the ban list must keep working), but not its username.

    The foreign keys already null the user id on delete; this also clears the copy of the username
    that reports keep for the admin queue, and erases the free-text notes the user wrote as a reporter
    (the report category stays, so a pending report is still understood).
    """
    db.session.execute(
        update(ContentReport).where(ContentReport.author_id == user_id).values(author_login="Deleted user")
    )
    db.session.execute(
        update(ContentReportSubscriber).where(ContentReportSubscriber.reporter_id == user_id).values(notes=None)
    )


def _anonymise_bug_reports(user_id: int) -> None:
    """Bug reports are kept for the team's records, but without the reporter's name and address."""
    db.session.execute(
        update(BugReport)
        .where(BugReport.user_id == user_id)
        .values(reporter_name="Deleted user", reporter_email=None)
        .execution_options(synchronize_session=False)
    )


def admin_remove_user(user_id: int) -> bool:
    """Administrative deletion of user account and stored media.

    Anonymises the account's bug reports exactly like self-service deletion: a report that kept the
    address would otherwise be claimable by whoever registers it next.
    """
    user = db.session.get(User, user_id)
    if not user:
        return False
    avatar_dir = get_avatar_storage_directory()
    remove_stale_avatar_file(user.avatar_url, avatar_dir, user.id)
    with transaction():
        _anonymise_bug_reports(user.id)
        _anonymise_moderation_records(user.id)
        db.session.delete(user)
    return True


def delete_own_account(
    user_id: int,
    password: str,
    two_factor_code: str | None = None,
    google_credential: str | None = None,
) -> tuple[bool, str | None]:
    """Self-service account deletion, confirmed with the current password.

    Everything keyed to the user cascades away with the row. Bug reports are kept
    for the team's records but stripped of the reporter's identity first. The only
    remaining admin cannot delete itself (that would lock the site out).
    """
    from app.services.user import two_factor

    user = db.session.get(User, user_id)
    if not user:
        return False, "Account not found."
    if user.has_password:
        confirmed = bool(password) and verify_password(password, user.password_hash)
    else:
        confirmed = google_auth.credential_belongs_to(user, google_credential)
    if not confirmed:
        return False, "Incorrect password."
    if user.role == "admin":
        other_admins = db.session.scalar(
            select(func.count(User.id)).where(User.role == "admin", User.id != user.id)
        )
        if not other_admins:
            return False, "The last administrator account cannot be deleted."
    if two_factor.is_enabled(user.id):
        if not (two_factor_code or "").strip():
            raise two_factor.TwoFactorError("two_factor_required", 403)
        two_factor.verify_second_factor(user, two_factor_code)

    avatar_dir = get_avatar_storage_directory()
    remove_stale_avatar_file(user.avatar_url, avatar_dir, user.id)

    with transaction():
        _anonymise_bug_reports(user.id)
        _anonymise_moderation_records(user.id)
        db.session.delete(user)

    return True, None


def _standing_condition(standing: str) -> ColumnElement[bool] | None:
    """SQL twin of `account_state.block_kind`: "banned", "suspended" or "active" (anything else: None)."""
    now = datetime.now(timezone.utc)
    suspended = and_(User.is_active.is_(True), User.suspended_until.is_not(None), User.suspended_until > now)
    if standing == "banned":
        return User.is_active.is_(False)
    if standing == "suspended":
        return suspended
    if standing == "active":
        return and_(User.is_active.is_(True), not_(suspended))
    return None


def fetch_admin_metrics() -> dict[str, Any]:
    """The numbers behind the admin panel's filters and attention markers, in two aggregate queries."""
    now = datetime.now(timezone.utc)
    total, admins, banned, suspended = db.session.execute(
        select(
            func.count(User.id),
            func.count(case((User.role == "admin", 1))),
            func.count(case((User.is_active.is_(False), 1))),
            func.count(case((and_(User.is_active.is_(True), User.suspended_until > now), 1))),
        )
    ).one()
    bug_pending = db.session.scalar(
        select(func.count(BugReport.id)).where(BugReport.status == "pending")
    ) or 0
    content_pending = db.session.scalar(
        select(func.count(ContentReport.id)).where(ContentReport.status == "pending")
    ) or 0
    total, admins, banned, suspended = total or 0, admins or 0, banned or 0, suspended or 0
    return {
        "users": {
            "total": total,
            "admins": admins,
            "players": total - admins,
            "active": total - banned - suspended,
            "suspended": suspended,
            "banned": banned,
        },
        "pending": {"bug_reports": bug_pending, "content_reports": content_pending},
    }


def seed_default_admin_if_empty() -> None:
    """Invoke baseline admin seeders (development only: they create the demo accounts)."""
    from app.core.config import demo_accounts_enabled

    if not demo_accounts_enabled():
        return
    try:
        from app.seeds.user_seeder import seed_default_users

        seed_default_users()
    except Exception as e:
        logger.debug(f"Error executing user seeder: {e}")
