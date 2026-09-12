# backend/app/services/perks/queries_equipment.py
from typing import Any

from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import Item, ItemAddon, ItemCategory, Killer, KillerAddon
from app.services.perks.utils import HEADER_EXCLUSIONS


def fetch_items(
    service,
    category: str | None = None,
    search: str | None = None,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve survivor items with category filtering and header exclusions.

    The category filter used to try three spellings of the same string against
    two denormalized columns -- `items.category` as given, as its own
    singular/plural flip, and `items.role` -- because nothing guaranteed which
    form was stored. It is one join on `item_categories` now.
    """
    try:
        stmt = select(Item).where(~Item.name.ilike("% items"))
        if category and category.lower() != "all":
            wanted = category.strip().lower()
            stmt = stmt.join(ItemCategory, Item.category_id == ItemCategory.id).where(
                or_(
                    func.lower(ItemCategory.name) == wanted,
                    func.lower(ItemCategory.addon_target_label) == wanted,
                    func.lower(ItemCategory.role) == wanted,
                )
            )
        items = db.session.scalars(stmt).all()
        result = [i.to_dict(lang=lang) for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
        if search:
            q = search.strip().lower()
            filtered = []
            for it in result:
                name_m = q in it.get("name", "").lower() or q in it.get("raw_name", "").lower()
                desc_m = q in it.get("description", "").lower()
                cat_m = q in it.get("category", "").lower() or q in it.get("role", "").lower()
                if name_m or desc_m or cat_m:
                    filtered.append(it)
            return filtered
        return result
    except Exception:
        return []


def fetch_addons(
    service,
    category: str | None = None,
    target: str | None = None,
    search: str | None = None,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve add-ons filtered by side of the trial and by target.

    `/api/v1/addons` still answers with one combined list, but it is now built
    from two tables: `killer_addons` (880 rows) and `item_addons` (51). There
    is no base class to select, so the two queries run separately and their
    results are concatenated, killer add-ons first. Neither query has ever had
    an ORDER BY, so the endpoint keeps returning each table in its own natural
    order, as it did when the rows shared one table.

    `category` ("Killer" / "Survivor") is no longer a stored string nor a test
    of which foreign key is null: it picks the table to read.

    `target` used to be compared against `associated_target` in four spellings
    at once ("keys", "key", "the key", ...) because that column held killer
    names and pluralized item-class labels in the same field. It now resolves
    to one id first, and because a killer id can only be a `killer_addons` row
    and an item-category id only an `item_addons` row, resolving the target
    also picks the table -- so "Key" and "Keys" select the same rows, and a
    target that matches nothing returns nothing instead of everything.
    """
    try:
        # "Killers" and "Killer" both arrive from the UI. Unset, "all", or any
        # value naming neither side reads both tables -- the old code only ever
        # narrowed on an exact "killer"/"survivor" match and left everything
        # else unfiltered, and that is the behaviour kept here.
        side = category.strip().lower().rstrip("s") if category else "all"
        want_killer = side != "survivor"
        want_item = side != "killer"

        killer_stmt = select(KillerAddon)
        item_stmt = select(ItemAddon)

        if target and target.lower() != "all":
            # `target` is a query-string value, so it arrives as text. It is
            # resolved to an id once, here, and the filter itself is an integer
            # comparison against an indexed foreign key. Both the singular
            # ("Flashlight", as items spell it) and the plural ("Flashlights",
            # as the old add-on column spelled it) are real columns.
            wanted = target.strip().lower()
            # `killers` is searched first: a killer name can only name a
            # `killer_addons` row, so a match there rules the item table out
            # entirely rather than merely adding a predicate to it.
            killer_id = db.session.scalar(
                select(Killer.id).where(func.lower(Killer.name) == wanted)
            )
            if killer_id is not None:
                killer_stmt = killer_stmt.where(KillerAddon.killer_id == killer_id)
                want_item = False
            else:
                category_id = db.session.scalar(
                    select(ItemCategory.id).where(
                        or_(
                            func.lower(ItemCategory.name) == wanted,
                            func.lower(ItemCategory.addon_target_label) == wanted,
                        )
                    )
                )
                if category_id is None:
                    return []
                item_stmt = item_stmt.where(ItemAddon.item_category_id == category_id)
                want_killer = False

        addons: list[Any] = []
        if want_killer:
            addons.extend(db.session.scalars(killer_stmt).unique().all())
        if want_item:
            addons.extend(db.session.scalars(item_stmt).unique().all())

        result = [a.to_dict(lang=lang) for a in addons]
        if search:
            q = search.strip().lower()
            filtered = []
            for ad in result:
                name_m = q in ad.get("name", "").lower() or q in ad.get("raw_name", "").lower()
                desc_m = q in ad.get("description", "").lower()
                cat_m = q in ad.get("category", "").lower()
                target_m = q in ad.get("associated_target", "").lower()
                if name_m or desc_m or cat_m or target_m:
                    filtered.append(ad)
            return filtered
        return result
    except Exception:
        return []
