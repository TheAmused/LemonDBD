# backend/app/services/db/import_accounts.py
"""Import of users and the per-user rows that hang off them (ownership, showcases)."""
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership, UserShowcase
from app.services.db._common import parse_datetime
from app.services.db.asset_bundling import write_asset_base64


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
    """Upsert users by username, resolving email clashes."""
    if "users" in target_keys and "users" in data:
        u_created, u_updated = 0, 0
        for row in data["users"]:
            username = row.get("username")
            if not username:
                continue
            user_obj = db.session.scalar(select(User).where(User.username == username))
            candidate_email = row.get("email") or f"{username}@lemondbd.com"
            email_conflict = db.session.scalar(
                select(User).where(User.email == candidate_email, User.username != username)
            )

            if not user_obj:
                final_email = candidate_email
                if email_conflict:
                    final_email = f"{username}_{int(datetime.now(timezone.utc).timestamp())}@lemondbd.com"
                user_obj = User(
                    username=username,
                    email=final_email,
                    password_hash=row.get("password_hash", ""),
                    role=row.get("role", "user"),
                    avatar_url=row.get("avatar_url", "default_avatar"),
                    is_active=row.get("is_active", True),
                    is_verified=row.get("is_verified", True if username in ("lemon", "user") else False),
                )
                db.session.add(user_obj)
                u_created += 1
            else:
                if not email_conflict:
                    user_obj.email = candidate_email
                for field in ["password_hash", "role", "avatar_url", "is_active", "is_verified"]:
                    if field in row and row[field] is not None:
                        setattr(user_obj, field, row[field])
                if username in ("lemon", "user"):
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
    user_map: dict[str, int] = {u.username: u.id for u in db.session.scalars(select(User)).all()}
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
    """Character and perk ownership rows, matched by username and name."""
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
            uname = co_data.get("username")
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
            uname = po_data.get("username")
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
            u_id = user_map.get(row.get("username"))
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
