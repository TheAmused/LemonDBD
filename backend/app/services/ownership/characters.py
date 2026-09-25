# backend/app/services/ownership/characters.py
"""Character ownership, across two tables.

A character is identified by a role and an id now, never by an id alone:
survivor 7 (Ace Visconti) and killer 7 (The Doctor) are different rows in
different tables. Every function here takes both, and the roster endpoint
returns `role` on every row so a caller always has it to hand.
"""
from collections.abc import Callable
from typing import Any

from sqlalchemy import select

from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.models import Killer, Perk, Survivor, UserCharacterOwnership, UserPerkOwnership

#: Characters every account owns without buying anything, by primary key
#: within each table.
#:
#: Ids are the stable identity of a content row: they are assigned once in
#: `app/seeds/data/content/{survivors,killers}.json` and preserved across every
#: re-seed by `backend/scripts/normalize_static_export.py`. The names are here
#: as a comment so the list stays readable; nothing matches on them.
#:
#: This was one set of `characters.id` values. The survivor half is unchanged
#: -- survivors kept their ids through the split -- and the killer half is the
#: old value minus the 54 survivors that used to be numbered ahead of them.
FREE_SURVIVOR_IDS: frozenset[int] = frozenset({
    1,   # Dwight Fairfield
    2,   # Meg Thomas
    3,   # Claudette Morel
    4,   # Jake Park
    5,   # Nea Karlsson
    8,   # Bill Overbeck
    10,  # David King
})

FREE_KILLER_IDS: frozenset[int] = frozenset({
    1,  # The Trapper
    2,  # The Wraith
    3,  # The Hillbilly
    4,  # The Nurse
    8,  # The Huntress
})

_MODEL_BY_ROLE = {"survivor": Survivor, "killer": Killer}
_FREE_BY_ROLE = {"survivor": FREE_SURVIVOR_IDS, "killer": FREE_KILLER_IDS}


def normalize_role(role: str | None) -> str:
    """`"Killer"`, `"killers"`, `"KILLER"` -> `"killer"`. Raises on anything else."""
    key = (role or "").strip().rstrip("s").lower()
    if key not in _MODEL_BY_ROLE:
        raise ValueError(
            f"role must be 'survivor' or 'killer', not {role!r}. "
            "A character id alone no longer identifies a character."
        )
    return key


def is_free(role: str, character_id: int) -> bool:
    return character_id in _FREE_BY_ROLE[normalize_role(role)]


def _ownership_filter(role: str, character_id: int):
    """The column that holds this character's key, and the value to match."""
    column = (
        UserCharacterOwnership.survivor_id
        if normalize_role(role) == "survivor"
        else UserCharacterOwnership.killer_id
    )
    return column == character_id


def _owned_key(record: UserCharacterOwnership) -> tuple[str, int]:
    return ("survivor", record.survivor_id) if record.survivor_id else ("killer", record.killer_id)


def fetch_user_characters(
    user_id: int | None = None, role: str | None = None, lang: str | None = None
) -> list[dict[str, Any]]:
    """Every character, annotated with this user's ownership flag.

    With `role` unset this returns both rosters concatenated -- two queries,
    because there is no table that holds both any more. Each row carries its
    own `role`, which is what makes the `id` in it meaningful.
    """
    wanted = (
        list(_MODEL_BY_ROLE.items())
        if not role or role.lower() in ("all", "")
        else [(normalize_role(role), _MODEL_BY_ROLE[normalize_role(role)])]
    )

    rows: list[tuple[str, Any]] = []
    for role_key, model in wanted:
        for row in db.session.scalars(select(model).order_by(model.name.asc())).all():
            rows.append((role_key, row))

    owned: dict[tuple[str, int], bool] = {}
    if user_id:
        owned = {
            _owned_key(record): record.is_owned
            for record in db.session.scalars(
                select(UserCharacterOwnership).where(
                    UserCharacterOwnership.user_id == user_id
                )
            ).all()
        }

    result = []
    for role_key, row in rows:
        data = row.to_dict(lang=lang)
        # No user means the catalogue view, where everything reads as owned.
        data["is_owned"] = owned.get((role_key, row.id), True) if user_id else True
        data["is_free"] = row.id in _FREE_BY_ROLE[role_key]
        result.append(data)
    return result


def _teachable_perks(role: str, character_id: int) -> list[Perk]:
    column = Perk.survivor_id if normalize_role(role) == "survivor" else Perk.killer_id
    return db.session.scalars(select(Perk).where(column == character_id)).all()


def _apply_perk_cascade(user_id: int, perks: list[Perk], is_owned: bool) -> int:
    """Unlock or lock every perk the character teaches, following ownership."""
    for perk in perks:
        record = db.session.scalars(
            select(UserPerkOwnership).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.perk_id == perk.id,
            )
        ).first()
        if not record:
            db.session.add(
                UserPerkOwnership(user_id=user_id, perk_id=perk.id, is_unlocked=is_owned)
            )
        else:
            record.is_unlocked = is_owned
    return len(perks)


def _get_or_create(user_id: int, role: str, character_id: int, is_owned: bool):
    record = db.session.scalars(
        select(UserCharacterOwnership).where(
            UserCharacterOwnership.user_id == user_id,
            _ownership_filter(role, character_id),
        )
    ).first()
    if record:
        record.is_owned = is_owned
        return record

    key = normalize_role(role)
    record = UserCharacterOwnership(
        user_id=user_id,
        survivor_id=character_id if key == "survivor" else None,
        killer_id=character_id if key == "killer" else None,
        is_owned=is_owned,
    )
    db.session.add(record)
    return record


def mutate_character_ownership(
    user_id: int, character_id: int, is_owned: bool, role: str
) -> dict[str, Any]:
    """Set ownership of one character, cascading to the perks it teaches."""
    key = normalize_role(role)
    character = db.session.get(_MODEL_BY_ROLE[key], character_id)
    if not character:
        raise ValueError(f"No {key} with id {character_id}.")

    record = _get_or_create(user_id, key, character_id, is_owned)
    cascade_count = _apply_perk_cascade(
        user_id, _teachable_perks(key, character_id), is_owned
    )

    db.session.commit()
    result = record.to_dict()
    result[
        "auto_unlocked_teachable_perks_count" if is_owned
        else "auto_locked_teachable_perks_count"
    ] = cascade_count
    return result


def bulk_mutate_character_ownership(
    user_id: int,
    updates: list[dict[str, Any]],
    summary_fn: Callable[[int | None], dict[str, Any]],
) -> dict[str, Any]:
    """Apply many ownership changes in one transaction.

    Each update needs `role` alongside `character_id`; an update without one
    is skipped rather than guessed at, because the same id exists on both
    sides and guessing would silently unlock the wrong character.
    """
    updated_count = 0
    auto_unlocked = 0
    auto_locked = 0
    skipped: list[Any] = []

    for item in updates:
        character_id = item.get("character_id")
        if not character_id:
            continue
        try:
            key = normalize_role(item.get("role"))
        except ValueError:
            skipped.append(character_id)
            continue

        is_owned = bool(item.get("is_owned", True))
        _get_or_create(user_id, key, int(character_id), is_owned)
        updated_count += 1

        cascade = _apply_perk_cascade(
            user_id, _teachable_perks(key, int(character_id)), is_owned
        )
        if is_owned:
            auto_unlocked += cascade
        else:
            auto_locked += cascade

    db.session.commit()
    result = {
        "user_id": user_id,
        "updated_count": updated_count,
        "characters_updated_count": updated_count,
        "auto_unlocked_perks_count": auto_unlocked,
        "auto_locked_perks_count": auto_locked,
        "summary": summary_fn(user_id),
    }
    if skipped:
        result["skipped_without_role"] = skipped
    return result


@retry_on_transient_db_error()
def seed_default_character_ownership(user_id: int) -> int:
    """Lock every character except the free ones for a new account, and unlock free ones.

    Retried on a transient connection drop or pool timeout: safe because this
    is a get-or-create per character followed by one commit, so re-running it
    after a dropped connection either creates the rows cleanly or finds them
    already there and re-applies the same flag -- never a duplicate.

    Getting this wrong is expensive in one direction: the predicate used to be
    a single `NOT IN` over one table, and when the column it keyed on was
    dropped it would have silently unlocked the entire roster for every new
    account. It is two explicit queries now, one per table.
    """
    updates: list[dict[str, Any]] = []
    for role_key, model in _MODEL_BY_ROLE.items():
        free = _FREE_BY_ROLE[role_key]
        locked = db.session.scalars(
            select(model.id).where(model.id.notin_(free))
        ).all()
        updates.extend(
            {"character_id": cid, "role": role_key, "is_owned": False} for cid in locked
        )
        free_ids = db.session.scalars(
            select(model.id).where(model.id.in_(free))
        ).all()
        updates.extend(
            {"character_id": cid, "role": role_key, "is_owned": True} for cid in free_ids
        )

    if not updates:
        return 0

    bulk_mutate_character_ownership(user_id, updates, lambda _uid: {})
    return len(updates)
