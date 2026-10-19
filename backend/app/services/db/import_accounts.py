# backend/app/services/db/import_accounts.py
"""Import of users and the per-user rows that hang off them (ownership, showcases)."""
from dataclasses import dataclass
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.sanction import BannedEmailHash
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership, UserShowcase
from app.services.db._common import parse_datetime
from app.services import ban_list
from app.services.db.asset_bundling import write_asset_base64

logger = logging.getLogger(__name__)

_HMAC_HEX = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class AccountLookups:
    """Lookups built once after users are imported."""

    user_map: dict[str, int]
    perk_map: dict[str, int]
    char_map: dict[str, tuple[str, int]]


def import_users(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    static_dir: Path,
) -> None:
    """Upsert users by login (older files carry it as `username`), resolving email clashes."""
    if "users" in target_keys and "users" in data:
        u_created, u_updated = 0, 0
        for row in data["users"]:
            login = row.get("login") or row.get("username")
            if not login:
                continue
            username = row.get("username") or login
            user_obj = db.session.scalar(select(User).where(User.login == login))
            candidate_email = row.get("email") or f"{login}@lemondbd.com"
            email_conflict = db.session.scalar(
                select(User).where(User.email == candidate_email, User.login != login)
            )

            if not user_obj:
                final_email = candidate_email
                if email_conflict:
                    final_email = f"{login}_{int(datetime.now(timezone.utc).timestamp())}@lemondbd.com"
                user_obj = User(
                    login=login,
                    username=username,
                    email=final_email,
                    password_hash=row.get("password_hash", ""),
                    role=row.get("role", "user"),
                    avatar_url=row.get("avatar_url", "default_avatar"),
                    is_active=row.get("is_active", True),
                    is_verified=row.get("is_verified", True if login in ("lemon", "user") else False),
                )
                db.session.add(user_obj)
                u_created += 1
            else:
                if not email_conflict:
                    user_obj.email = candidate_email
                previous_hash = user_obj.password_hash
                for field in ["password_hash", "role", "avatar_url", "is_active", "is_verified"]:
                    if field in row and row[field] is not None:
                        setattr(user_obj, field, row[field])
                if user_obj.password_hash != previous_hash:
                    # A new password signs out every session issued under the old one, as a reset does.
                    user_obj.token_version = int(user_obj.token_version or 0) + 1
                if row.get("login") and row.get("username"):
                    user_obj.username = row["username"]
                if login in ("lemon", "user"):
                    user_obj.is_verified = True
                u_updated += 1

            if row.get("created_at"):
                parsed_dt = parse_datetime(row["created_at"])
                if parsed_dt:
                    user_obj.created_at = parsed_dt

            write_asset_base64(static_dir, row.get("avatar_relative_path"), row.get("avatar_relative_path_data"))

        db.session.flush()
        summary["users"] = {"created": u_created, "updated": u_updated}


def build_account_lookups() -> AccountLookups:
    """Name -> id maps the ownership, showcase and run-family imports resolve through."""
    user_map: dict[str, int] = {u.login: u.id for u in db.session.scalars(select(User)).all()}
    perk_map: dict[str, int] = {p.name.strip().lower(): p.id for p in db.session.scalars(select(Perk)).all()}
    # Ownership rows name their character. An id alone would not
    # identify one any more -- survivor 7 and killer 7 both exist -- so
    # the map carries the side with it. `char_map` was referenced here
    # without ever being built, which made any ownerships import raise
    # NameError.
    char_map: dict[str, tuple[str, int]] = {
        **{s_.name.strip().lower(): ("Survivor", s_.id)
           for s_ in db.session.scalars(select(Survivor)).all()},
        **{k_.name.strip().lower(): ("Killer", k_.id)
           for k_ in db.session.scalars(select(Killer)).all()},
    }
    return AccountLookups(user_map=user_map, perk_map=perk_map, char_map=char_map)


def import_ownerships(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    lookups: AccountLookups,
) -> None:
    """Character and perk ownership rows, matched by login and name."""
    user_map, perk_map, char_map = lookups.user_map, lookups.perk_map, lookups.char_map
    if "ownerships" in target_keys and "ownerships" in data:
        raw_owns = data["ownerships"]
        char_created, char_updated = 0, 0
        perk_created, perk_updated = 0, 0

        existing_char_owns: dict[tuple[int, str, int], UserCharacterOwnership] = {
            (co.user_id, "Survivor" if co.survivor_id else "Killer",
             co.survivor_id or co.killer_id): co
            for co in db.session.scalars(select(UserCharacterOwnership)).all()
        }
        for co_data in raw_owns.get("characters", []):
            uname = co_data.get("login") or co_data.get("username")
            cname = co_data.get("character_name")
            u_id = user_map.get(uname) if uname else None
            found = char_map.get(cname.strip().lower()) if cname else None
            if u_id and found:
                role, c_id = found
                co = existing_char_owns.get((u_id, role, c_id))
                if not co:
                    co = UserCharacterOwnership(
                        user_id=u_id,
                        survivor_id=c_id if role == "Survivor" else None,
                        killer_id=c_id if role == "Killer" else None,
                    )
                    db.session.add(co)
                    existing_char_owns[(u_id, role, c_id)] = co
                    char_created += 1
                else:
                    char_updated += 1
                co.is_owned = co_data.get("is_owned", True)

        existing_perk_owns: dict[tuple[int, int], UserPerkOwnership] = {
            (po.user_id, po.perk_id): po
            for po in db.session.scalars(select(UserPerkOwnership)).all()
        }
        for po_data in raw_owns.get("perks", []):
            uname = po_data.get("login") or po_data.get("username")
            pname = po_data.get("perk_name")
            u_id = user_map.get(uname) if uname else None
            p_id = perk_map.get(pname.strip().lower()) if pname else None
            if u_id and p_id:
                po = existing_perk_owns.get((u_id, p_id))
                if not po:
                    po = UserPerkOwnership(user_id=u_id, perk_id=p_id)
                    db.session.add(po)
                    existing_perk_owns[(u_id, p_id)] = po
                    perk_created += 1
                else:
                    perk_updated += 1
                po.is_unlocked = po_data.get("is_unlocked", True)

        db.session.flush()
        summary["character_ownerships"] = {"created": char_created, "updated": char_updated}
        summary["perk_ownerships"] = {"created": perk_created, "updated": perk_updated}


def import_user_showcases(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    lookups: AccountLookups,
) -> None:
    """Profile showcases, one per user."""
    user_map, char_map = lookups.user_map, lookups.char_map
    if "user_showcases" in target_keys and "user_showcases" in data:
        sc_created = sc_updated = 0
        for row in data["user_showcases"]:
            u_id = user_map.get(row.get("login") or row.get("username"))
            if not u_id:
                continue
            existing_showcase = db.session.scalar(select(UserShowcase).where(UserShowcase.user_id == u_id))
            if not existing_showcase:
                existing_showcase = UserShowcase(user_id=u_id)
                db.session.add(existing_showcase)
                sc_created += 1
            else:
                sc_updated += 1
            for field in [
                "player_title", "devotion_level", "grade_rank",
                "survivor_main_id", "survivor_main_prestige", "survivor_perk_ids",
                "killer_main_id", "killer_main_prestige", "killer_perk_ids",
            ]:
                if field in row:
                    setattr(existing_showcase, field, row[field])

            # A backup written before the mains became foreign keys
            # carries the character's name instead. Resolve it, so an
            # old export still restores a showcase.
            for legacy, column, want_role in (
                ("survivor_main_character", "survivor_main_id", "Survivor"),
                ("killer_main_character", "killer_main_id", "Killer"),
            ):
                if legacy not in row or row.get(column) is not None:
                    continue
                found = char_map.get(str(row[legacy] or "").strip().lower())
                if found and found[0] == want_role:
                    setattr(existing_showcase, column, found[1])
        db.session.flush()
        summary["user_showcases"] = {"created": sc_created, "updated": sc_updated}


def import_banned_email_hashes(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
) -> None:
    """Restore ban-evasion list entries.

    Entries come back without a ban behind them (`sanction_id` NULL): the sanctions are not part of an
    export, so only the entry's own expiry can remove it. One entry per hash: a hash that is already
    listed keeps its row and only has its expiry extended. Rows that are malformed or already expired
    are skipped. `unverifiable` counts imported rows made with a pepper version that is not configured
    here: they are kept (the pepper may be added later) but cannot match anyone until then.
    """
    if "banned_email_hashes" not in target_keys or "banned_email_hashes" not in data:
        return
    now = datetime.now(timezone.utc)
    known = ban_list.configured_versions()
    by_hash: dict[str, BannedEmailHash] = {
        row.email_hmac: row for row in db.session.scalars(select(BannedEmailHash))
    }
    created = updated = skipped = unverifiable = 0
    for row in data["banned_email_hashes"]:
        value = str(row.get("email_hmac") or "").strip().lower()
        version, reason = row.get("key_version"), str(row.get("reason_code") or "").strip()[:32]
        expires_at = parse_datetime(row.get("expires_at"))
        if (
            not _HMAC_HEX.match(value)
            or isinstance(version, bool) or not isinstance(version, int) or not 0 < version < 32768
            or not reason
            or expires_at is None
        ):
            skipped += 1
            continue
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            skipped += 1
            continue
        if version not in known:
            unverifiable += 1
        existing = by_hash.get(value)
        if existing is not None:
            current = existing.expires_at
            if current.tzinfo is None:
                current = current.replace(tzinfo=timezone.utc)
            if expires_at > current:
                existing.expires_at = expires_at
                updated += 1
            continue
        entry = BannedEmailHash(
            email_hmac=value,
            key_version=version,
            sanction_id=None,
            reason_code=reason,
            created_at=parse_datetime(row.get("created_at")) or now,
            expires_at=expires_at,
        )
        db.session.add(entry)
        by_hash[value] = entry
        created += 1
    db.session.flush()
    if unverifiable:
        logger.warning(
            "Imported %d ban-list entries made with a pepper version that is not configured here", unverifiable
        )
    summary["banned_email_hashes"] = {
        "created": created, "updated": updated, "skipped": skipped, "unverifiable": unverifiable,
    }
