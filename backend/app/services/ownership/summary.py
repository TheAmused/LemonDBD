# backend/app/services/ownership/summary.py
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.models import Killer, Perk, Survivor, User, UserCharacterOwnership, UserPerkOwnership


@retry_on_transient_db_error()
def calculate_ownership_summary(user_id: int | None = None) -> dict[str, Any]:
    """Calculate aggregated ownership statistics and identifiers for characters and perks."""
    # Two tables, so two queries. A character is a (role, id) pair everywhere
    # below: survivor 7 and killer 7 are different characters.
    survivors = db.session.scalars(select(Survivor)).all()
    killers = db.session.scalars(select(Killer)).all()
    all_characters = [*survivors, *killers]
    char_map = {
        **{("survivor", c.id): c for c in survivors},
        **{("killer", c.id): c for c in killers},
    }
    all_perks = db.session.scalars(
        select(Perk).options(joinedload(Perk.survivor), joinedload(Perk.killer))
    ).all()

    total_surv_chars = len(survivors)
    total_kill_chars = len(killers)
    total_surv_perks = sum(1 for p in all_perks if p.role.lower() == "survivor")
    total_kill_perks = sum(1 for p in all_perks if p.role.lower() == "killer")

    if not user_id:
        all_perk_names: list[str] = []
        for p in all_perks:
            all_perk_names.append(p.name)
            if p.alternate_name and p.alternate_name not in all_perk_names:
                all_perk_names.append(p.alternate_name)

        return {
            "user_id": None,
            "total_perks_count": len(all_perks),
            "owned_perks_count": len(all_perks),
            "total_survivor_perks_count": total_surv_perks,
            "owned_survivor_perks_count": total_surv_perks,
            "total_killer_perks_count": total_kill_perks,
            "owned_killer_perks_count": total_kill_perks,
            "total_characters_count": len(all_characters),
            "owned_characters_count": len(all_characters),
            "total_survivor_characters_count": total_surv_chars,
            "owned_survivor_characters_count": total_surv_chars,
            "total_killer_characters_count": total_kill_chars,
            "owned_killer_characters_count": total_kill_chars,
            "killers": {"owned": total_kill_chars, "total": total_kill_chars, "percentage": 100.0 if total_kill_chars > 0 else 0.0},
            "survivors": {"owned": total_surv_chars, "total": total_surv_chars, "percentage": 100.0 if total_surv_chars > 0 else 0.0},
            "perks": {"owned": len(all_perks), "unlocked": len(all_perks), "total": len(all_perks), "percentage": 100.0 if len(all_perks) > 0 else 0.0},
            "characters": {"owned": len(all_characters), "total": len(all_characters), "percentage": 100.0 if len(all_characters) > 0 else 0.0},
            "owned_perk_ids": [p.id for p in all_perks],
            "owned_perk_names": all_perk_names,
            # Role-scoped, because a bare character id stopped being unique
            # when the table was split. Names still are, and stay.
            "owned_survivor_ids": [c.id for c in survivors],
            "owned_killer_ids": [c.id for c in killers],
            "owned_character_names": [c.name for c in all_characters],
        }

    user = db.session.get(User, user_id)
    if not user:
        return calculate_ownership_summary(None)

    char_ownership_rows = db.session.scalars(
        select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
    ).all()
    deactivated = {
        (("survivor", co.survivor_id) if co.survivor_id else ("killer", co.killer_id))
        for co in char_ownership_rows
        if not co.is_owned
    }
    owned_keys = {key for key in char_map if key not in deactivated}
    owned_character_names = [char_map[key].name for key in owned_keys]

    perk_ownership_rows = db.session.scalars(
        select(UserPerkOwnership).where(UserPerkOwnership.user_id == user_id)
    ).all()
    explicit_perk_unlocked = {po.perk_id for po in perk_ownership_rows if po.is_unlocked}
    explicit_perk_locked = {po.perk_id for po in perk_ownership_rows if not po.is_unlocked}

    owned_perk_ids: list[int] = []
    owned_perk_names: list[str] = []
    owned_surv_perks = 0
    owned_kill_perks = 0

    for perk in all_perks:
        is_surv = perk.role.lower() == "survivor"
        owner_key = (
            ("survivor", perk.survivor_id) if perk.survivor_id
            else ("killer", perk.killer_id) if perk.killer_id
            else None
        )
        is_general = owner_key is None or perk.is_generic_counterpart

        if is_general:
            is_owned = True
        elif perk.id in explicit_perk_locked:
            is_owned = False
        elif perk.id in explicit_perk_unlocked:
            is_owned = True
        else:
            is_owned = (owner_key in owned_keys) if owner_key else True

        if is_owned:
            owned_perk_ids.append(perk.id)
            owned_perk_names.append(perk.name)
            if perk.alternate_name and perk.alternate_name not in owned_perk_names:
                owned_perk_names.append(perk.alternate_name)
            if is_surv:
                owned_surv_perks += 1
            else:
                owned_kill_perks += 1

    owned_surv_chars = sum(1 for role, _ in owned_keys if role == "survivor")
    owned_kill_chars = sum(1 for role, _ in owned_keys if role == "killer")

    surv_percent = round((owned_surv_chars / total_surv_chars) * 100, 1) if total_surv_chars > 0 else 0.0
    killer_percent = round((owned_kill_chars / total_kill_chars) * 100, 1) if total_kill_chars > 0 else 0.0
    perk_percent = round((len(owned_perk_ids) / len(all_perks)) * 100, 1) if len(all_perks) > 0 else 0.0
    char_percent = round((len(owned_keys) / len(all_characters)) * 100, 1) if len(all_characters) > 0 else 0.0

    return {
        "user_id": user_id,
        "total_perks_count": len(all_perks),
        "owned_perks_count": len(owned_perk_ids),
        "total_survivor_perks_count": total_surv_perks,
        "owned_survivor_perks_count": owned_surv_perks,
        "total_killer_perks_count": total_kill_perks,
        "owned_killer_perks_count": owned_kill_perks,
        "total_characters_count": len(all_characters),
        "owned_characters_count": len(owned_keys),
        "total_survivor_characters_count": total_surv_chars,
        "owned_survivor_characters_count": owned_surv_chars,
        "total_killer_characters_count": total_kill_chars,
        "owned_killer_characters_count": owned_kill_chars,
        "killers": {"owned": owned_kill_chars, "total": total_kill_chars, "percentage": killer_percent},
        "survivors": {"owned": owned_surv_chars, "total": total_surv_chars, "percentage": surv_percent},
        "perks": {"owned": len(owned_perk_ids), "unlocked": len(owned_perk_ids), "total": len(all_perks), "percentage": perk_percent},
        "characters": {"owned": len(owned_keys), "total": len(all_characters), "percentage": char_percent},
        "owned_perk_ids": owned_perk_ids,
        "owned_perk_names": owned_perk_names,
        "owned_survivor_ids": sorted(i for role, i in owned_keys if role == "survivor"),
        "owned_killer_ids": sorted(i for role, i in owned_keys if role == "killer"),
        "owned_character_names": owned_character_names,
    }
