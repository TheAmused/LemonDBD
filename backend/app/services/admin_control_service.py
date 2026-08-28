# backend/app/services/admin_control_service.py
import logging
from typing import Any
from sqlalchemy import desc, func, select

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.models import AdminAuditLog, ChallengeModeSetting, User
from app.models.admin import CHALLENGE_MODES

logger = logging.getLogger(__name__)


def log_admin_action(
    admin_user_id: int | None,
    action: str,
    target_type: str | None = None,
    target_id: Any | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Appends one row to the admin audit log. Never raises exceptions."""
    try:
        db.session.add(AdminAuditLog(
            admin_user_id=admin_user_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=safe_json_dumps(details) if details is not None else None,
        ))
        db.session.commit()
    except Exception as err:
        db.session.rollback()
        logger.error(f"Failed to write admin audit log for action '{action}': {err}")


def get_audit_logs(page: int = 1, per_page: int = 25) -> dict[str, Any]:
    total = db.session.scalar(select(func.count(AdminAuditLog.id))) or 0
    rows = db.session.scalars(
        select(AdminAuditLog)
        .order_by(desc(AdminAuditLog.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()

    admin_ids = {row.admin_user_id for row in rows if row.admin_user_id is not None}
    usernames = {
        u.id: u.username
        for u in db.session.scalars(select(User).where(User.id.in_(admin_ids))).all()
    } if admin_ids else {}

    logs: list[dict[str, Any]] = []
    for row in rows:
        entry = row.to_dict()
        entry["admin_username"] = usernames.get(row.admin_user_id) if row.admin_user_id else None
        logs.append(entry)

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def get_challenge_mode_settings() -> list[dict[str, Any]]:
    """Returns all 4 modes' settings, lazily creating default rows if missing."""
    existing = {
        row.mode: row
        for row in db.session.scalars(select(ChallengeModeSetting)).all()
    }
    missing = [m for m in CHALLENGE_MODES if m not in existing]
    for mode in missing:
        row = ChallengeModeSetting(mode=mode, is_enabled=True)
        db.session.add(row)
        existing[mode] = row
    if missing:
        db.session.commit()

    return [existing[mode].to_dict() for mode in CHALLENGE_MODES]


def set_challenge_mode_enabled(mode: str, is_enabled: bool, reason: str | None = None) -> dict[str, Any]:
    if mode not in CHALLENGE_MODES:
        raise ValueError(f"Unknown challenge mode: {mode}")

    row = db.session.scalars(
        select(ChallengeModeSetting).where(ChallengeModeSetting.mode == mode)
    ).first()
    if row is None:
        row = ChallengeModeSetting(mode=mode)
        db.session.add(row)

    row.is_enabled = is_enabled
    row.disabled_reason = None if is_enabled else (reason or None)
    db.session.commit()
    return row.to_dict()


def assert_challenge_mode_enabled(mode: str) -> None:
    """Raises ValueError if the mode is currently disabled by an admin kill switch."""
    row = db.session.scalars(
        select(ChallengeModeSetting).where(ChallengeModeSetting.mode == mode)
    ).first()
    if row and not row.is_enabled:
        reason = f" ({row.disabled_reason})" if row.disabled_reason else ""
        raise ValueError(f"This challenge is temporarily disabled{reason}. Please check back later.")
