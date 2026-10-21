# backend/app/services/retention.py
"""Re-dating records when an admin changes how long they last.

A warning and a ban-list entry store their end date when they are created, and every check reads
that stored date. Without this, a new "Warning lifetime" or "Ban-list retention" only reached
records created afterwards, while the Privacy page already quoted the new period to everyone. When
either setting is saved, each record that is still in force is re-dated from its own start:
shortening ends old records early, lengthening extends the ones still running. A record that has
already run out stays expired: lengthening never brings it back.
"""
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.account_state import as_utc
from app.core.extensions import db
from app.models.sanction import BannedEmailHash, UserSanction


def redate_warnings(days: int, now: datetime) -> int:
    """Active, unrevoked warnings end ``days`` after they were issued. Returns how many changed."""
    rows = db.session.scalars(
        select(UserSanction).where(
            UserSanction.kind == "warning",
            UserSanction.revoked_at.is_(None),
            UserSanction.expires_at.is_not(None),
            UserSanction.expires_at > now,
        )
    ).all()
    changed = 0
    for row in rows:
        new_end = as_utc(row.issued_at) + timedelta(days=days)
        if as_utc(row.expires_at) != new_end:
            row.expires_at = new_end
            changed += 1
    return changed


def redate_ban_list(days: int, now: datetime) -> int:
    """Ban-list entries still standing end ``days`` after they were listed. Returns how many changed."""
    rows = db.session.scalars(select(BannedEmailHash).where(BannedEmailHash.expires_at > now)).all()
    changed = 0
    for row in rows:
        new_end = as_utc(row.created_at) + timedelta(days=days)
        if as_utc(row.expires_at) != new_end:
            row.expires_at = new_end
            changed += 1
    return changed
