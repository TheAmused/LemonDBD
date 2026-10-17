# backend/app/services/sanction_outbox.py
"""Delivery of the moderation emails queued in `sanction_notifications` (transactional outbox).

A decision commits together with its notification rows. Delivery then claims a row with a
compare-and-set on `in_flight_at` (so a slow attempt and a scheduler retry never both send, and a
stuck claim is retaken after STALE_CLAIM), sends it, and records `notified_at` or the error. It is
at-least-once: a crash between SMTP accepting the message and the `notified_at` write can duplicate.
"""
import logging
import threading
from datetime import datetime, timedelta, timezone

from flask import current_app
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError

from app.core.extensions import db
from app.core.transaction import transaction
from app.models.content_moderation import ContentReport
from app.models.sanction import SanctionNotification, UserSanction
from app.models.user import User
from app.services.mail_service import send_sanction_email
from app.services.sanction_email_texts import build_sanction_email
from app.services.site_settings import contact_email, sanction_email_attempts

logger = logging.getLogger(__name__)

MAX_NOTIFY_ATTEMPTS = 5  # the ceiling; the admin setting `sanction_email_attempts` can lower it
STALE_CLAIM = timedelta(minutes=10)
ENDED_LOOKBACK = timedelta(days=7)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def max_attempts() -> int:
    return min(MAX_NOTIFY_ATTEMPTS, sanction_email_attempts())


def queued_notification_ids(sanction_ids: list[int]) -> list[int]:
    if not sanction_ids:
        return []
    return list(
        db.session.scalars(
            select(SanctionNotification.id)
            .where(SanctionNotification.sanction_id.in_(sanction_ids), SanctionNotification.notified_at.is_(None))
            .order_by(SanctionNotification.id)
        )
    )


def _claim(notification_id: int) -> bool:
    """Compare-and-set: only one caller wins a row, and a stuck claim is retaken after STALE_CLAIM."""
    now = _now()
    result = db.session.execute(
        update(SanctionNotification)
        .where(
            SanctionNotification.id == notification_id,
            SanctionNotification.notified_at.is_(None),
            SanctionNotification.attempts < max_attempts(),
            or_(SanctionNotification.in_flight_at.is_(None), SanctionNotification.in_flight_at < now - STALE_CLAIM),
        )
        .values(in_flight_at=now, attempts=SanctionNotification.attempts + 1)
        # Decided in SQL only: the in-session copies are expired by the commit below.
        .execution_options(synchronize_session=False)
    )
    db.session.commit()
    return result.rowcount == 1


def _finish(notification: SanctionNotification, error: str | None, sent: bool) -> None:
    notification.in_flight_at = None
    notification.last_error = error[:500] if error else None
    if sent:
        notification.notified_at = _now()
    db.session.commit()


def _skip_reason(notification: SanctionNotification, sanction: UserSanction | None, user: User | None) -> str | None:
    if sanction is None or user is None:
        return "skipped: the account or the decision no longer exists"
    if notification.event == "issued" and sanction.revoked_at is not None:
        return "skipped: revoked before it was sent"
    if notification.event == "ended" and sanction.revoked_at is not None:
        return "skipped: revoked, the lifted notice covers it"
    if notification.event == "lifted":
        issued_unsent = db.session.scalar(
            select(func.count(SanctionNotification.id)).where(
                SanctionNotification.sanction_id == sanction.id,
                SanctionNotification.event == "issued",
                SanctionNotification.notified_at.is_(None),
            )
        )
        if issued_unsent:
            return "skipped: the original notice was never sent"
    return None


def _build_content(notification: SanctionNotification, sanction: UserSanction, user: User):
    language = user.preferred_language
    content_type = None
    if sanction.report_id is not None:
        report = db.session.get(ContentReport, sanction.report_id)
        if report is not None and report.status == "resolved_banned":
            content_type = report.content_type
    base = str(current_app.config.get("FRONTEND_URL") or "").rstrip("/")
    return build_sanction_email(
        language,
        event=notification.event,
        kind=sanction.kind,
        username=user.username,
        reason_code=sanction.reason_code,
        rule_ref=sanction.rule_ref,
        facts=sanction.facts,
        issued_at=sanction.issued_at,
        until=sanction.expires_at if sanction.kind == "suspension" else None,
        from_report=sanction.source == "content_report",
        content_type=content_type,
        contact=contact_email(),
        rules_url=f"{base}/{language or 'en'}/rules" if base and sanction.rule_ref else "",
    )


def deliver_notification(notification_id: int) -> bool:
    """Send one queued email. True when it was sent now; False when skipped, failed or not ours."""
    if not _claim(notification_id):
        return False
    notification = db.session.get(SanctionNotification, notification_id)
    if notification is None:
        return False
    try:
        sanction = db.session.get(UserSanction, notification.sanction_id)
        user = db.session.get(User, sanction.user_id) if sanction is not None else None
        skip = _skip_reason(notification, sanction, user)
        if skip:
            _finish(notification, skip, sent=True)
            return False
        send_sanction_email(user, _build_content(notification, sanction, user))
    except Exception as err:
        db.session.rollback()
        notification = db.session.get(SanctionNotification, notification_id)
        if notification is not None:
            _finish(notification, f"{type(err).__name__}: {err}", sent=False)
        logger.warning("Moderation email %s could not be sent (%s); it will be retried", notification_id, err)
        return False
    _finish(notification, None, sent=True)
    return True


def dispatch_notifications(notification_ids: list[int]) -> None:
    """Try the freshly queued emails right after the decision committed (never raises)."""
    if not notification_ids:
        return
    app = current_app._get_current_object()  # type: ignore[attr-defined]

    def _run() -> None:
        with app.app_context():
            try:
                for notification_id in notification_ids:
                    try:
                        deliver_notification(notification_id)
                    except Exception as err:  # the scheduler retries; never break the caller
                        logger.warning("Moderation email dispatch failed: %s", err)
            finally:
                db.session.remove()

    if not app.config.get("SANCTION_EMAIL_ASYNC", True):
        _run()
        return
    threading.Thread(target=_run, name="sanction-email", daemon=True).start()


def queue_ended_notifications() -> int:
    """Queue the 'your suspension has ended' email for suspensions that ran out on their own."""
    now = _now()
    candidates = db.session.scalars(
        select(UserSanction).where(
            UserSanction.kind == "suspension",
            UserSanction.revoked_at.is_(None),
            UserSanction.expires_at.is_not(None),
            UserSanction.expires_at <= now,
            UserSanction.expires_at >= now - ENDED_LOOKBACK,
        )
    ).all()
    queued = 0
    for sanction in candidates:
        events = set(
            db.session.scalars(select(SanctionNotification.event).where(SanctionNotification.sanction_id == sanction.id))
        )
        # Only people who were told about the suspension are told it ended.
        if "issued" not in events or "ended" in events:
            continue
        try:
            with transaction():
                db.session.add(SanctionNotification(sanction_id=sanction.id, event="ended"))
            queued += 1
        except IntegrityError:
            db.session.rollback()
    return queued


def retry_pending_notifications(limit: int = 50) -> int:
    """Scheduler entry point: queue ended notices, then (re)send everything still owed."""
    queue_ended_notifications()
    now = _now()
    ids = list(
        db.session.scalars(
            select(SanctionNotification.id)
            .where(
                SanctionNotification.notified_at.is_(None),
                SanctionNotification.attempts < max_attempts(),
                or_(SanctionNotification.in_flight_at.is_(None), SanctionNotification.in_flight_at < now - STALE_CLAIM),
            )
            .order_by(SanctionNotification.id)
            .limit(limit)
        )
    )
    return sum(1 for notification_id in ids if deliver_notification(notification_id))
