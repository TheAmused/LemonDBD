# backend/app/services/admin_control_service.py
import logging
from typing import Any
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.core.redis_cache import bump_catalog_version
from app.core.transaction import transaction
from app.models import (
    AdminAuditLog,
    ChallengeModeSetting,
    Killer,
    Perk,
    Survivor,
    User,
)
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
        with transaction():
            db.session.add(AdminAuditLog(
                admin_user_id=admin_user_id,
                action=action,
                target_type=target_type,
                target_id=str(target_id) if target_id is not None else None,
                details=safe_json_dumps(details) if details is not None else None,
            ))
    except Exception as err:
        logger.error(f"Failed to write admin audit log for action '{action}': {err}")


def get_audit_logs(page: int = 1, per_page: int = 25, target_types: list[str] | None = None) -> dict[str, Any]:
    """Newest first; `target_types` narrows the log to what the actions were about (users, perks...)."""
    stmt = select(AdminAuditLog)
    if target_types:
        stmt = stmt.where(AdminAuditLog.target_type.in_(target_types))
    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.session.scalars(
        stmt.order_by(desc(AdminAuditLog.created_at), desc(AdminAuditLog.id))
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()

    admin_ids = {row.admin_user_id for row in rows if row.admin_user_id is not None}
    usernames = {
        u.id: u.login
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
    """Returns all 4 modes' settings, lazily creating default rows if missing.

    Two first requests can race to create the same rows: the loser's insert hits the unique `mode`
    and it simply reads what the winner wrote.
    """

    def _rows() -> dict[str, ChallengeModeSetting]:
        return {row.mode: row for row in db.session.scalars(select(ChallengeModeSetting)).all()}

    existing = _rows()
    missing = [m for m in CHALLENGE_MODES if m not in existing]
    if missing:
        try:
            with transaction():
                for mode in missing:
                    db.session.add(ChallengeModeSetting(mode=mode, is_enabled=True))
        except IntegrityError:
            db.session.rollback()
        existing = _rows()

    return [existing[mode].to_dict() for mode in CHALLENGE_MODES]


def set_challenge_mode_enabled(mode: str, is_enabled: bool, reason: str | None = None) -> dict[str, Any]:
    if mode not in CHALLENGE_MODES:
        raise ValueError(f"Unknown challenge mode: {mode}")

    with transaction():
        row = db.session.scalars(
            select(ChallengeModeSetting).where(ChallengeModeSetting.mode == mode)
        ).first()
        if row is None:
            row = ChallengeModeSetting(mode=mode)
            db.session.add(row)

        row.is_enabled = is_enabled
        row.disabled_reason = None if is_enabled else (reason or None)

    return row.to_dict()


def assert_challenge_mode_enabled(mode: str) -> None:
    """Raises ValueError if the mode is currently disabled by an admin kill switch."""
    row = db.session.scalars(
        select(ChallengeModeSetting).where(ChallengeModeSetting.mode == mode)
    ).first()
    if row and not row.is_enabled:
        reason = f" ({row.disabled_reason})" if row.disabled_reason else ""
        raise ValueError(f"This challenge is temporarily disabled{reason}. Please check back later.")


def set_character_disabled(
    character_id: int,
    is_disabled: bool,
    reason: str | None = None,
    role: str | None = None,
) -> tuple[Any, str | None]:
    """Enables or disables a character (killer or survivor) atomically."""
    clean_role = (role or "").strip().rstrip("s").lower()
    model = {"survivor": Survivor, "killer": Killer}.get(clean_role)
    if model is not None:
        character = db.session.get(model, character_id)
    else:
        character = db.session.get(Killer, character_id) or db.session.get(Survivor, character_id)

    if not character:
        return None, "Character not found."

    with transaction():
        character.is_disabled = is_disabled
        character.disabled_reason = reason if is_disabled else None

    bump_catalog_version()
    return character, None


def set_perk_disabled(
    perk_id: int,
    is_disabled: bool,
    reason: str | None = None,
) -> tuple[Perk | None, str | None]:
    """Enables or disables a perk atomically."""
    perk = db.session.get(Perk, perk_id)
    if not perk:
        return None, "Perk not found."

    with transaction():
        perk.is_disabled = is_disabled
        perk.disabled_reason = reason if is_disabled else None

    bump_catalog_version()
    return perk, None


def purge_database_tables(targets: list[str]) -> list[str]:
    """Delete every row of the named entities in one transaction; returns them in a fixed order.

    The names are the export/import names (`export_registry.PURGEABLE_TARGETS`), so the admin
    panel offers exactly what can be purged. Raises ValueError for a name that can't be purged, or
    when a table is chosen without the tables that point at it (`PURGE_REQUIRES`).
    """
    from app.services.db.export_import import clear_targets
    from app.services.db.export_registry import PURGEABLE_TARGETS, missing_purge_dependencies, unknown_targets

    unknown = unknown_targets(targets, PURGEABLE_TARGETS)
    if unknown:
        raise ValueError(f"These cannot be purged: {', '.join(unknown)}.")
    missing = missing_purge_dependencies(targets)
    if missing:
        raise ValueError(f"Also select: {', '.join(missing)} (their rows point at what you chose).")
    with transaction():
        clear_targets(set(targets))
    return [target for target in PURGEABLE_TARGETS if target in targets]
