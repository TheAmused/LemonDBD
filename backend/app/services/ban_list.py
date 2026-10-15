# backend/app/services/ban_list.py
"""Ban-evasion e-mail list: keyed hashes of permanently banned accounts' addresses.

What is stored: `HMAC-SHA256(pepper, label + canonical_email)` as 64 hex characters, the pepper
version, the ban it belongs to, the reason code and an expiry. Never the address. The pepper lives in
`BAN_LIST_PEPPERS` (environment), not in the database and not derived from `SECRET_KEY`, so a copy of
the table alone cannot be turned back into addresses by guessing. The hash is still personal data
(a mailbox can be re-hashed by whoever holds the pepper), and the Privacy Policy says so.

Lifecycle:
* a permanent ban adds a row in the same transaction (`record_ban`);
* lifting that ban (revoke or restore) deletes it (`forget_sanction`);
* a row whose account was later deleted keeps standing until `expires_at` (retention setting);
* the scheduler removes expired rows (`purge_expired`).

It is read in exactly one place: when an account is created (`registration_refusal`), by password
sign-up and by the new-account branch of Google sign-in. Signing in, changing an e-mail address and
every other flow never look at it. With `BAN_LIST_ENABLED` off (the default) or no valid pepper,
nothing is hashed, stored or checked.

The table is part of the database export/import (target `banned_email_hashes`, group `users`): the
keyed hashes, their pepper version, reason code and dates travel, the pepper never does. Entries are
imported without a ban behind them (`sanction_id` NULL, as for an account that was deleted), so only
their expiry removes them; an entry made with a pepper version the target does not have configured is
kept but cannot match (`configured_versions`). The export file holds pseudonymised personal data and
is to be handled like the user export.
"""
import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone

from flask import current_app, has_app_context
from sqlalchemy import delete, select

from app.core.config import parse_ban_list_peppers
from app.core.extensions import db
from app.core.transaction import transaction
from app.models.sanction import BannedEmailHash, UserSanction
from app.services.site_settings import ban_list_retention_days, contact_email
from app.utils.email_address import canonical_email

logger = logging.getLogger(__name__)

#: Domain separation: the same pepper can never produce a hash usable for anything else.
LABEL = b"lemondbd:ban-email:v1\0"
REFUSAL = "This e-mail address cannot be used to register."


def _now() -> datetime:
    return datetime.now(timezone.utc)


def is_enabled() -> bool:
    return bool(has_app_context() and current_app.config.get("BAN_LIST_ENABLED"))


def peppers() -> list[tuple[int, bytes]]:
    """Usable peppers, newest first (empty when the list is off or not configured)."""
    if not is_enabled():
        return []
    found, _problems = parse_ban_list_peppers(str(current_app.config.get("BAN_LIST_PEPPERS") or ""))
    return found


def configured_versions() -> set[int]:
    """Pepper versions present in the configuration (whether or not the list is switched on)."""
    if not has_app_context():
        return set()
    found, _problems = parse_ban_list_peppers(str(current_app.config.get("BAN_LIST_PEPPERS") or ""))
    return {version for version, _key in found}


def _digest(key: bytes, canonical: str) -> str:
    return hmac.new(key, LABEL + canonical.encode("utf-8"), hashlib.sha256).hexdigest()


def digests_for(email: str | None) -> list[tuple[int, str]]:
    """The address hashed under every configured pepper version, newest first."""
    canonical = canonical_email(email)
    if canonical is None:
        return []
    return [(version, _digest(key, canonical)) for version, key in peppers()]


def refusal_message() -> str:
    contact = contact_email()
    return f"{REFUSAL} Contact {contact} if you think this is a mistake." if contact else REFUSAL


def is_email_banned(email: str | None) -> bool:
    """True when the address (in canonical form) is on the list and the entry has not expired."""
    hashes = [value for _version, value in digests_for(email)]
    if not hashes:
        return False
    row = db.session.scalar(
        select(BannedEmailHash.id)
        .where(BannedEmailHash.email_hmac.in_(hashes), BannedEmailHash.expires_at > _now())
        .limit(1)
    )
    return row is not None


def registration_refusal(email: str | None) -> str | None:
    """The message to refuse an account creation with, or None when the address may register."""
    return refusal_message() if is_email_banned(email) else None


def record_ban(sanction: UserSanction, email: str | None, now: datetime | None = None) -> bool:
    """Add the address of a permanent ban (inside the caller's transaction). True if a row was added."""
    if sanction.kind != "ban":
        return False
    keys = peppers()
    canonical = canonical_email(email)
    if not keys or canonical is None:
        return False
    version, key = keys[0]
    value = _digest(key, canonical)
    moment = now or _now()
    already = db.session.scalar(
        select(BannedEmailHash.id).where(
            BannedEmailHash.email_hmac == value, BannedEmailHash.sanction_id == sanction.id
        )
    )
    if already is not None:
        return False
    db.session.add(
        BannedEmailHash(
            email_hmac=value,
            key_version=version,
            sanction_id=sanction.id,
            reason_code=sanction.reason_code,
            created_at=moment,
            expires_at=moment + timedelta(days=ban_list_retention_days()),
        )
    )
    return True


def forget_sanction(sanction_id: int) -> None:
    """Remove the entry of a ban that was lifted (a no-op when there is none)."""
    db.session.execute(
        delete(BannedEmailHash)
        .where(BannedEmailHash.sanction_id == sanction_id)
        .execution_options(synchronize_session=False)
    )


def purge_expired(now: datetime | None = None) -> int:
    """Delete entries past their expiry (own transaction); returns how many."""
    with transaction():
        result = db.session.execute(
            delete(BannedEmailHash)
            .where(BannedEmailHash.expires_at <= (now or _now()))
            .execution_options(synchronize_session=False)
        )
    return int(result.rowcount or 0)


def backfill_from_bans(dry_run: bool = False) -> dict[str, int]:
    """Add every running permanent ban that has no entry yet (for bans made while the list was off).

    Returns counts: `bans` running, `missing` without an entry, `added` (0 on a dry run), and
    `skipped` whose account has no usable address. Entries get the full retention from now.
    """
    from app.models.user import User

    moment = _now()
    bans = list(
        db.session.scalars(select(UserSanction).where(UserSanction.kind == "ban", UserSanction.revoked_at.is_(None)))
    )
    covered = set(db.session.scalars(select(BannedEmailHash.sanction_id).where(BannedEmailHash.sanction_id.is_not(None))))
    counts = {"bans": len(bans), "missing": 0, "added": 0, "skipped": 0}
    with transaction():
        for ban in bans:
            if ban.id in covered:
                continue
            user = db.session.get(User, ban.user_id)
            if user is None or canonical_email(user.email) is None:
                counts["skipped"] += 1
                continue
            counts["missing"] += 1
            if not dry_run and record_ban(ban, user.email, moment):
                counts["added"] += 1
    return counts
