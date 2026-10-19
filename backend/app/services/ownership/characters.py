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
from app.core.transaction import transaction
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
        data = row.to_list_dict(lang=lang)
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
    applied_count = 0
    for perk in perks:
        if not is_owned and perk.is_generic_counterpart:
            continue
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
        applied_count += 1
    return applied_count


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

    with transaction():
        record = _get_or_create(user_id, key, character_id, is_owned)
        cascade_count = _apply_perk_cascade(
            user_id, _teachable_perks(key, character_id), is_owned
        )

    result = record.to_dict()
    result[
        "auto_unlocked_teachable_perks_count" if is_owned
        else "auto_locked_teachable_perks_count"
    ] = cascade_count
    return result


#: More rows than any roster has; a longer list is a malformed (or abusive) request.
MAX_BULK_UPDATES = 1000


def positive_id(value: Any) -> int | None:
    """`7`, `"7"` -> 7; anything else (bools, floats, negatives, junk) -> None."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    if isinstance(value, str) and value.strip().isdigit():
        number = int(value.strip())
        return number if number > 0 else None
    return None


def bulk_mutate_character_ownership(
    user_id: int,
    updates: list[dict[str, Any]],
    summary_fn: Callable[[int | None], dict[str, Any]],
) -> dict[str, Any]:
    """Apply many ownership changes in one transaction, with a fixed number of queries.

    Raises ValueError for a malformed request (not a list of objects, too long). Inside a
    well-formed one, an update without a valid `role` is skipped rather than guessed at (the same
    id exists on both sides), and one naming a character that does not exist is skipped too -- it
    used to be inserted and hit the foreign key as a 500.

    The old loop ran a get-or-create, a teachable-perks query and one query per perk for every
    row (about 500 queries to seed a new account); this loads the user's rows, the characters and
    their perks once per role.
    """
    if not isinstance(updates, list) or len(updates) > MAX_BULK_UPDATES:
        raise ValueError(f"updates must be a list of at most {MAX_BULK_UPDATES} objects.")
    if not all(isinstance(item, dict) for item in updates):
        raise ValueError("Each update must be an object {character_id, role, is_owned}.")

    wanted: dict[tuple[str, int], bool] = {}
    skipped: list[Any] = []
    for item in updates:
        character_id = positive_id(item.get("character_id"))
        if character_id is None:
            continue
        try:
            key = normalize_role(item.get("role"))
        except ValueError:
            skipped.append(item.get("character_id"))
            continue
        wanted[(key, character_id)] = bool(item.get("is_owned", True))  # the last one wins

    existing_ids = {
        role: set(db.session.scalars(
            select(model.id).where(model.id.in_([cid for r, cid in wanted if r == role]))
        ).all())
        for role, model in _MODEL_BY_ROLE.items()
    }
    unknown = [cid for (role, cid) in wanted if cid not in existing_ids[role]]
    wanted = {k: v for k, v in wanted.items() if k[1] in existing_ids[k[0]]}

    updated_count = len(wanted)
    auto_unlocked = 0
    auto_locked = 0
    with transaction():
        if wanted:
            rows = {
                _owned_key(row): row
                for row in db.session.scalars(
                    select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
                ).all()
            }
            for (role, cid), is_owned in wanted.items():
                row = rows.get((role, cid))
                if row is not None:
                    row.is_owned = is_owned
                else:
                    db.session.add(UserCharacterOwnership(
                        user_id=user_id,
                        survivor_id=cid if role == "survivor" else None,
                        killer_id=cid if role == "killer" else None,
                        is_owned=is_owned,
                    ))

            perks: list[tuple[Perk, bool]] = []
            for role, column in (("survivor", Perk.survivor_id), ("killer", Perk.killer_id)):
                ids = [cid for (r, cid) in wanted if r == role]
                if ids:
                    for perk in db.session.scalars(select(Perk).where(column.in_(ids))).all():
                        owner = perk.survivor_id if role == "survivor" else perk.killer_id
                        perks.append((perk, wanted[(role, owner)]))
            perk_rows = {
                row.perk_id: row
                for row in db.session.scalars(
                    select(UserPerkOwnership).where(
                        UserPerkOwnership.user_id == user_id,
                        UserPerkOwnership.perk_id.in_([perk.id for perk, _ in perks]),
                    )
                ).all()
            } if perks else {}
            for perk, is_owned in perks:
                # Same rule as `_apply_perk_cascade`: a generic counterpart is never locked.
                if not is_owned and perk.is_generic_counterpart:
                    continue
                row = perk_rows.get(perk.id)
                if row is not None:
                    row.is_unlocked = is_owned
                else:
                    db.session.add(UserPerkOwnership(user_id=user_id, perk_id=perk.id, is_unlocked=is_owned))
                if is_owned:
                    auto_unlocked += 1
                else:
                    auto_locked += 1

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
    if unknown:
        result["skipped_unknown"] = unknown
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


def _release_key(character: dict[str, Any]):
    release_number = character.get("release_number")
    return release_number if release_number is not None else float("inf")


def get_owned_killers(
    user_id: int,
    ownership_service: Any,
    *,
    shape: str = "ids",
    by_release: bool = False,
) -> Any:
    """The user's owned, non-disabled killers, shared by every killer streak mode.

    `shape`: "ids" -> list of Killer.id, "names" -> list of names,
    "name_to_id" -> {name: id}. `by_release` sorts by release number (killers
    without one last); otherwise the roster's own order is kept.
    """
    owned = [
        c for c in ownership_service.get_user_characters(user_id, role="Killer")
        if c["is_owned"] and not c.get("is_disabled")
    ]
    if by_release:
        owned.sort(key=_release_key)
    if shape == "ids":
        return [c["id"] for c in owned]
    if shape == "names":
        return [c["name"] for c in owned]
    if shape == "name_to_id":
        return {c["name"]: c["id"] for c in owned}
    raise ValueError(f"Unknown shape: {shape}")


def resolve_killer_names_by_ids(ids: list[int]) -> list[str]:
    """Turns a frozen killer id list back into current names, in the order given."""
    if not ids:
        return []
    # These ids are `killers.id`. They used to be `characters.id`, which also
    # covered the 54 survivors a killer mode never meant.
    rows = db.session.scalars(select(Killer).where(Killer.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]
