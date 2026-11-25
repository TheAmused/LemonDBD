# backend/app/services/content_report_resolution.py
"""An admin's decision on a content report: ban or dismiss it, sanction the author, wipe the evidence."""
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.transaction import transaction
from app.models.admin import AdminAuditLog
from app.models.content_moderation import ContentReport, ContentRevocation
from app.models.user import User
from app.services.mail_service import send_content_moderation_notice_email
from app.services.moderation_actions import ModerationError, create_sanction, default_report_facts
from app.services.sanction_outbox import dispatch_notifications, queued_notification_ids
from app.services.site_settings import contact_email


AUTHOR_ACTIONS = {"warn": "warning", "suspend": "suspension", "ban": "ban"}


def resolve_report(
    admin: User,
    report_id: int,
    action: str,
    ban_author: bool = False,
    admin_notes: str | None = None,
    author_action: str | None = None,
    duration_days: int | None = None,
    facts: str | None = None,
    rule_ref: str | None = None,
) -> tuple[dict[str, Any], int]:
    """Resolve a content report with ban or dismiss action and zero-retention hard wipe.

    `author_action` ("none", "warn", "suspend", "ban") is what happens to the author's account when the
    content is banned; the old `ban_author` flag means "ban" and is used only when it is not given.
    """
    if action not in ("ban", "dismiss"):
        return {"error": "Action must be 'ban' or 'dismiss'", "status": 400}, 400
    if author_action is None:
        author_action = "ban" if ban_author else "none"
    if author_action not in ("none", *AUTHOR_ACTIONS):
        return {"error": "author_action must be 'none', 'warn', 'suspend' or 'ban'", "status": 400}, 400

    clean_notes = admin_notes.strip() if isinstance(admin_notes, str) and admin_notes.strip() else None
    sanction_ids: list[int] = []

    try:
        return _resolve_report(
            admin, report_id, action, author_action, clean_notes, sanction_ids,
            duration_days=duration_days, facts=facts, rule_ref=rule_ref,
        )
    except ModerationError as err:
        return {"error": err.message, "status": err.status}, err.status


def _resolve_report(
    admin: User,
    report_id: int,
    action: str,
    author_action: str,
    clean_notes: str | None,
    sanction_ids: list[int],
    *,
    duration_days: int | None,
    facts: str | None,
    rule_ref: str | None,
) -> tuple[dict[str, Any], int]:
    ban_author = author_action != "none"
    with transaction():
        # Locked: two admins resolving the same report at once used to both pass the "pending" check
        # below and both sanction the author (two warnings, two emails). The second now waits and
        # then sees the first one's decision.
        report = db.session.get(ContentReport, report_id, with_for_update=True)
        if report is None:
            return {"error": "Content report not found", "status": 404}, 404

        if report.status == "expired":
            return {
                "error": f"Content report #{report_id} expired and its evidence was wiped; it can no longer be resolved",
                "status": 409,
            }, 409
        if report.status != "pending":
            return {
                "error": f"Content report #{report_id} has already been resolved as '{report.status}'",
                "status": 409,
            }, 409

        if action == "ban":
            existing_rev = db.session.scalar(
                select(ContentRevocation).where(ContentRevocation.content_hash == report.content_hash)
            )
            if existing_rev is None:
                rev = ContentRevocation(
                    content_hash=report.content_hash,
                    content_type=report.content_type,
                    author_id=report.author_id,
                    reason=report.primary_reason,
                    revoked_by_id=admin.id,
                )
                db.session.add(rev)

            if ban_author and report.author_id is not None:
                author = db.session.get(User, report.author_id, with_for_update=True)
                if author is not None and author.role != "admin":
                    sanction = create_sanction(
                        AUTHOR_ACTIONS[author_action],
                        admin,
                        author,
                        reason_code=report.primary_reason,
                        facts=facts or default_report_facts(report.content_type),
                        rule_ref=rule_ref,
                        internal_notes=clean_notes,
                        duration_days=duration_days,
                        source="content_report",
                        report_id=report.id,
                    )
                    sanction_ids.append(sanction.id)

            report.status = "resolved_banned"

            db.session.add(
                AdminAuditLog(
                    admin_user_id=admin.id,
                    action="content_ban",
                    target_type="content",
                    target_id=str(report.content_hash),
                    details=safe_json_dumps({
                        "report_id": report.id,
                        "admin_notes": clean_notes,
                        "ban_author": ban_author,
                        "author_action": author_action,
                    }),
                )
            )
        elif action == "dismiss":
            report.status = "dismissed"

            db.session.add(
                AdminAuditLog(
                    admin_user_id=admin.id,
                    action="content_dismiss",
                    target_type="content",
                    target_id=str(report.content_hash),
                    details=safe_json_dumps({
                        "report_id": report.id,
                        "admin_notes": clean_notes,
                    }),
                )
            )

        # CRITICAL ZERO-RETENTION HARD WIPE: wipe evidence payload permanently
        report.evidence_payload = None
        report.resolved_by_id = admin.id
        report.resolved_at = datetime.now(timezone.utc)
        report.admin_notes = clean_notes

        notice = None
        # An account decision sends its own (merged) email through the outbox; without one the
        # author still gets the plain statement about the blocked content.
        if action == "ban" and report.author_id is not None and not sanction_ids:
            notice = (report.author_id, report.content_type, report.primary_reason)

    if sanction_ids:
        dispatch_notifications(queued_notification_ids(sanction_ids))
    if notice is not None:
        # Statement of reasons for the author. Sent after the decision is committed and never raises.
        author = db.session.get(User, notice[0])
        if author is not None and author.email:
            send_content_moderation_notice_email(
                author, notice[1], notice[2], account_deactivated=not author.is_active, contact_email=contact_email()
            )

    return {
        "message": f"Report successfully resolved with action '{action}'",
        "report_id": report.id,
    }, 200
