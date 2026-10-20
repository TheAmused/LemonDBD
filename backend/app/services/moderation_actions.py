# backend/app/services/moderation_actions.py
"""Warnings, suspensions and bans: the one place that changes an account's moderation state.

`user_sanctions` rows are the source of truth. `User.is_active` (permanent ban) and
`User.suspended_until` (end of the longest active suspension) are copies derived from them by
`recompute_user_state`; nothing else writes those two columns. Every decision is one transaction:
sanction row, derived user state, audit entry and the queued email (`sanction_notifications`, a
transactional outbox). Delivery happens after the commit, in a background thread, and the scheduler
retries whatever failed; each row is claimed with a compare-and-set so a slow attempt and a retry
never both send. Delivery is at-least-once: a crash between SMTP accepting the message and the
`notified_at` write can still produce a duplicate.
"""
import logging
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import current_app
from sqlalchemy import func, select

from app.core.account_state import as_utc, block_kind
from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.transaction import transaction
from app.models.admin import AdminAuditLog
from app.models.content_moderation import ContentReport, ContentRevocation
from app.models.sanction import (
    RULE_REFS,
    SANCTION_REASONS,
    SANCTION_SOURCES,
    SanctionNotification,
    UserSanction,
)
from app.models.user import User
from app.services import ban_list
from app.services.escalation import suggest_next_step
from app.services.sanction_email_texts import build_sanction_email
from app.services.sanction_outbox import dispatch_notifications, queued_notification_ids
from app.services.site_settings import contact_email, escalation_thresholds, warning_lifetime_days
from app.utils.responses import api_error

logger = logging.getLogger(__name__)

MIN_SUSPENSION_DAYS = 1
MAX_SUSPENSION_DAYS = 365
TEXT_LIMIT = 2000


class ModerationError(Exception):
    """A refused moderation request (carries the HTTP status the route should answer with)."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


# --- state -----------------------------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def is_active_sanction(sanction: UserSanction, now: datetime | None = None) -> bool:
    """Not revoked and not past its end (a ban has none)."""
    if sanction.revoked_at is not None:
        return False
    expires = as_utc(sanction.expires_at)
    return expires is None or expires > (now or _now())


def _sanctions_of(user_id: int) -> list[UserSanction]:
    return list(
        db.session.scalars(
            select(UserSanction).where(UserSanction.user_id == user_id).order_by(UserSanction.issued_at, UserSanction.id)
        )
    )


def active_sanctions(user_id: int, kind: str | None = None, now: datetime | None = None) -> list[UserSanction]:
    moment = now or _now()
    return [s for s in _sanctions_of(user_id) if is_active_sanction(s, moment) and (kind is None or s.kind == kind)]


def recompute_user_state(user: User, now: datetime | None = None) -> None:
    """Derive `is_active` / `suspended_until` from the active sanctions (warnings never matter)."""
    moment = now or _now()
    active = [s for s in active_sanctions(user.id, now=moment) if s.kind != "warning"]
    if any(s.kind == "ban" for s in active):
        user.is_active = False
        user.suspended_until = None
        return
    user.is_active = True
    ends = [as_utc(s.expires_at) for s in active if s.kind == "suspension" and s.expires_at is not None]
    user.suspended_until = max(ends) if ends else None


# --- validation ------------------------------------------------------------------------------


def _clean_text(value: Any, name: str, required: bool = False, limit: int = TEXT_LIMIT) -> str | None:
    if value is not None and not isinstance(value, str):
        raise ModerationError(f"{name} must be a string", 400)
    text = (value or "").strip()
    if not text:
        if required:
            raise ModerationError(f"{name} is required", 400)
        return None
    if len(text) > limit:
        raise ModerationError(f"{name} must be at most {limit} characters", 400)
    return text


def _check_target(admin: User | None, user: User | None) -> User:
    if user is None:
        raise ModerationError("User not found", 404)
    if user.role == "admin":
        raise ModerationError("Administrators cannot be sanctioned; change the role first", 400)
    if admin is not None and admin.id == user.id:
        raise ModerationError("You cannot sanction your own account", 400)
    return user


def _duration(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not (MIN_SUSPENSION_DAYS <= value <= MAX_SUSPENSION_DAYS):
        raise ModerationError(
            f"duration_days must be a whole number between {MIN_SUSPENSION_DAYS} and {MAX_SUSPENSION_DAYS}", 400
        )
    return value


# --- creating decisions ----------------------------------------------------------------------


def _audit(admin: User | None, action: str, user_id: int, details: dict[str, Any]) -> None:
    db.session.add(
        AdminAuditLog(
            admin_user_id=admin.id if admin is not None else None,
            action=action,
            target_type="user",
            target_id=str(user_id),
            details=safe_json_dumps(details),
        )
    )


def create_sanction(
    kind: str,
    admin: User | None,
    user: User,
    *,
    reason_code: str,
    facts: str | None = None,
    rule_ref: str | None = None,
    internal_notes: str | None = None,
    duration_days: int | None = None,
    source: str = "manual",
    report_id: int | None = None,
    send_email: bool = True,
) -> UserSanction:
    """Record one decision inside the caller's transaction (no commit, no email sent yet)."""
    if kind not in ("warning", "suspension", "ban"):
        raise ModerationError("kind must be 'warning', 'suspension' or 'ban'", 400)
    if reason_code not in SANCTION_REASONS:
        raise ModerationError(f"reason_code must be one of: {', '.join(SANCTION_REASONS)}", 400)
    if rule_ref is not None and rule_ref not in RULE_REFS:
        raise ModerationError(f"rule_ref must be one of: {', '.join(RULE_REFS)}", 400)
    if source not in SANCTION_SOURCES:
        raise ModerationError("Unknown sanction source", 400)
    _check_target(admin, user)

    facts = _clean_text(facts, "facts", required=kind != "warning")
    internal_notes = _clean_text(internal_notes, "internal_notes")

    now = _now()
    expires_at: datetime | None = None
    if kind == "warning":
        expires_at = now + timedelta(days=warning_lifetime_days())
    elif kind == "suspension":
        expires_at = now + timedelta(days=_duration(duration_days))
        if not user.is_active:
            raise ModerationError("The account is already banned or disabled", 409)
    elif active_sanctions(user.id, kind="ban", now=now):
        raise ModerationError("The account is already banned", 409)

    sanction = UserSanction(
        user_id=user.id,
        kind=kind,
        reason_code=reason_code,
        rule_ref=rule_ref,
        facts=facts,
        internal_notes=internal_notes,
        source=source,
        report_id=report_id,
        issued_by_id=admin.id if admin is not None else None,
        issued_at=now,
        expires_at=expires_at,
    )
    db.session.add(sanction)
    db.session.flush()

    if kind != "warning":
        recompute_user_state(user, now)
        # Ends every open session; a warning must never do this.
        user.token_version = int(user.token_version or 0) + 1
    if kind == "ban":
        # Same transaction as the ban, so a committed ban is always on the list (when it is enabled).
        ban_list.record_ban(sanction, user.email, now)
    if send_email:
        db.session.add(SanctionNotification(sanction_id=sanction.id, event="issued"))

    _audit(
        admin,
        {"warning": "user_warned", "suspension": "user_suspended", "ban": "user_banned"}[kind],
        user.id,
        {
            "sanction_id": sanction.id,
            "reason_code": reason_code,
            "rule_ref": rule_ref,
            "duration_days": duration_days if kind == "suspension" else None,
            "source": source,
            "report_id": report_id,
        },
    )
    db.session.flush()
    return sanction


def default_report_facts(content_type: str) -> str:
    """The "what happened" of a decision taken from a report when the moderator wrote none."""
    return f"A {content_type.replace('_', ' ')} created with your account was blocked after a review of a report."


def preview_sanction(body: dict[str, Any]) -> dict[str, Any]:
    """What `apply_sanction` / a report resolution would tell the account holder, without saving anything.

    Takes the same fields as the decision form plus the target: `user_id`, or `report_id` (the author
    of the reported content; the report supplies the reason). Returns the reason and facts as they would be
    stored, when it would end, and the email in the account holder's language.
    """
    kind = body.get("kind")
    if kind not in ("warning", "suspension", "ban"):
        raise ModerationError("kind must be 'warning', 'suspension' or 'ban'", 400)
    report = None
    if body.get("report_id") is not None:
        report = db.session.get(ContentReport, body.get("report_id"))
        if report is None or report.author_id is None:
            raise ModerationError("Content report not found", 404)
        user = db.session.get(User, report.author_id)
        reason_code = report.primary_reason
    else:
        user = db.session.get(User, body.get("user_id")) if isinstance(body.get("user_id"), int) else None
        reason_code = body.get("reason_code")
    if user is None:
        raise ModerationError("User not found", 404)
    if reason_code not in SANCTION_REASONS:
        raise ModerationError(f"reason_code must be one of: {', '.join(SANCTION_REASONS)}", 400)
    rule_ref = body.get("rule_ref") or None
    if rule_ref is not None and rule_ref not in RULE_REFS:
        raise ModerationError(f"rule_ref must be one of: {', '.join(RULE_REFS)}", 400)

    facts = _clean_text(body.get("facts"), "facts")
    if facts is None and report is not None:
        facts = default_report_facts(report.content_type)
    until = None
    if kind == "warning":
        until = _now() + timedelta(days=warning_lifetime_days())
    elif kind == "suspension":
        until = _now() + timedelta(days=_duration(body.get("duration_days")))

    language = user.preferred_language
    base = str(current_app.config.get("FRONTEND_URL") or "").rstrip("/")
    email = build_sanction_email(
        language,
        event="issued",
        kind=kind,
        username=user.username,
        reason_code=reason_code,
        rule_ref=rule_ref,
        facts=facts,
        issued_at=_now(),
        until=until if kind == "suspension" else None,
        from_report=report is not None,
        content_type=report.content_type if report is not None else None,
        contact=contact_email(),
        rules_url=f"{base}/{language or 'en'}/rules" if base and rule_ref else "",
    )
    return {
        "language": language or "en",
        "reason_code": reason_code,
        "facts": facts,
        "appeal_contact": contact_email() or None,
        "until": until.isoformat() if until else None,
        "email": asdict(email),
    }


def _issue(kind: str, admin: User | None, user_id: int, **fields: Any) -> UserSanction:
    with transaction():
        # The account row is locked for the decision, so two admins banning the same account at once
        # cannot both pass the "already banned" check.
        user = _check_target(admin, db.session.get(User, user_id, with_for_update=True))
        sanction = create_sanction(kind, admin, user, **fields)
    dispatch_notifications(queued_notification_ids([sanction.id]))
    return sanction


def issue_warning(admin: User | None, user_id: int, **fields: Any) -> UserSanction:
    return _issue("warning", admin, user_id, **fields)


def suspend(admin: User | None, user_id: int, **fields: Any) -> UserSanction:
    return _issue("suspension", admin, user_id, **fields)


def ban(admin: User | None, user_id: int, **fields: Any) -> UserSanction:
    return _issue("ban", admin, user_id, **fields)


def apply_sanction(admin: User, user_id: int, body: dict[str, Any]) -> UserSanction:
    """Create a decision from an admin request body (manual source only)."""
    kind = body.get("kind")
    if kind not in ("warning", "suspension", "ban"):
        raise ModerationError("kind must be 'warning', 'suspension' or 'ban'", 400)
    reason_code = body.get("reason_code")
    if not isinstance(reason_code, str):
        raise ModerationError("reason_code is required", 400)
    send_email = body.get("send_email", True)
    if not isinstance(send_email, bool):
        raise ModerationError("send_email must be true or false", 400)
    return _issue(
        kind,
        admin,
        user_id,
        reason_code=reason_code,
        facts=body.get("facts"),
        rule_ref=body.get("rule_ref"),
        internal_notes=body.get("internal_notes"),
        duration_days=body.get("duration_days"),
        send_email=send_email,
    )


def _lift(admin: User | None, sanction: UserSanction, reason: str, now: datetime, queue_email: bool) -> None:
    was_live = is_active_sanction(sanction, now)
    sanction.revoked_at = now
    sanction.revoked_by_id = admin.id if admin is not None else None
    sanction.revoke_reason = reason
    if sanction.kind == "ban":
        ban_list.forget_sanction(sanction.id)
    if queue_email and was_live and sanction.kind != "warning":
        db.session.add(SanctionNotification(sanction_id=sanction.id, event="lifted"))


def revoke_sanction(admin: User | None, sanction_id: int, reason: Any) -> UserSanction:
    clean_reason = _clean_text(reason, "reason", required=True, limit=1000)
    with transaction():
        sanction = db.session.get(UserSanction, sanction_id, with_for_update=True)
        if sanction is None:
            raise ModerationError("Sanction not found", 404)
        if sanction.revoked_at is not None:
            raise ModerationError("This sanction has already been revoked", 409)
        user = db.session.get(User, sanction.user_id)
        now = _now()
        _lift(admin, sanction, clean_reason or "", now, queue_email=True)
        if sanction.kind != "warning" and user is not None:
            db.session.flush()
            recompute_user_state(user, now)
        _audit(admin, "sanction_revoked", sanction.user_id, {"sanction_id": sanction.id, "kind": sanction.kind})
    dispatch_notifications(queued_notification_ids([sanction.id]))
    return sanction


def restore_account(admin: User | None, user_id: int, reason: str) -> int:
    """Lift every running suspension and ban (the old 'enable account' button). Returns how many."""
    with transaction():
        user = db.session.get(User, user_id)
        if user is None:
            raise ModerationError("User not found", 404)
        now = _now()
        live = [s for s in active_sanctions(user_id, now=now) if s.kind != "warning"]
        for sanction in live:
            # One "restriction lifted" email is enough, for the most recent decision.
            _lift(admin, sanction, reason, now, queue_email=sanction is live[-1])
        db.session.flush()
        recompute_user_state(user, now)
        _audit(admin, "account_restored", user_id, {"revoked": [s.id for s in live]})
    dispatch_notifications(queued_notification_ids([s.id for s in live]))
    return len(live)


# --- reading ---------------------------------------------------------------------------------


def list_user_sanctions(user_id: int) -> list[dict[str, Any]]:
    now = _now()
    rows = list(reversed(_sanctions_of(user_id)))
    admin_ids = {id_ for s in rows for id_ in (s.issued_by_id, s.revoked_by_id) if id_ is not None}
    logins = (
        {u.id: u.login for u in db.session.scalars(select(User).where(User.id.in_(admin_ids)))} if admin_ids else {}
    )
    return [
        {
            **s.to_dict(),
            "active": is_active_sanction(s, now),
            "issued_by_login": logins.get(s.issued_by_id),
            "revoked_by_login": logins.get(s.revoked_by_id),
        }
        for s in rows
    ]


def moderation_summary(user_id: int) -> dict[str, Any]:
    now = _now()
    sanctions = _sanctions_of(user_id)
    active = [s for s in sanctions if is_active_sanction(s, now)]
    suspension = max((s for s in active if s.kind == "suspension"), key=lambda s: as_utc(s.expires_at), default=None)
    active_warnings = sum(1 for s in active if s.kind == "warning")
    banned = any(s.kind == "ban" for s in active)
    return {
        "active_warnings": active_warnings,
        "total_warnings": sum(1 for s in sanctions if s.kind == "warning"),
        "total_suspensions": sum(1 for s in sanctions if s.kind == "suspension"),
        "banned": banned,
        # Suggest-only: what the escalation ladder would do next. A moderator decides.
        "suggestion": suggest_next_step(
            active_warnings=active_warnings,
            suspensions=sum(1 for s in sanctions if s.kind == "suspension" and s.revoked_at is None),
            banned=banned,
            thresholds=escalation_thresholds(),
        ),
        "suspended_until": as_utc(suspension.expires_at).isoformat() if suspension else None,
        "content_blocked": db.session.scalar(
            select(func.count(ContentRevocation.id)).where(ContentRevocation.author_id == user_id)
        )
        or 0,
    }


def pending_warnings(user_id: int) -> list[dict[str, Any]]:
    """The account holder's active warnings they have not acknowledged yet."""
    return [s.to_user_dict() for s in active_sanctions(user_id, kind="warning") if s.acknowledged_at is None]


def acknowledge_warning(user: User, sanction_id: int) -> bool:
    with transaction():
        sanction = db.session.get(UserSanction, sanction_id)
        if sanction is None or sanction.user_id != user.id or sanction.kind != "warning":
            return False
        if sanction.acknowledged_at is None:
            sanction.acknowledged_at = _now()
    return True


def blocked_response(user: User):
    """The 403 body for a banned or suspended account that has just proven who it is."""
    kind = block_kind(user)
    wanted = "ban" if kind == "banned" else "suspension"
    current = next(iter(sorted(active_sanctions(user.id, kind=wanted), key=lambda s: s.issued_at, reverse=True)), None)
    until = as_utc(user.suspended_until) if kind == "suspended" else None
    return api_error(
        "This account is banned." if kind == "banned" else "This account is suspended.",
        403,
        code="account_banned" if kind == "banned" else "account_suspended",
        until=until.isoformat() if until else None,
        reason_code=current.reason_code if current else None,
        appeal_contact=contact_email() or None,
    )
