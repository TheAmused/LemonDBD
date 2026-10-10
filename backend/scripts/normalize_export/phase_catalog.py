# backend/scripts/normalize_export/phase_catalog.py
"""Phases for items, add-ons, offerings and perks."""
from __future__ import annotations

from typing import Any

from .bootstrap import name_key, normalize_rarity
from .fileio import load_many
from .identity import IdAssigner, by_name, fk
from .phase_reference import match_category
from .rows import drop_null_keys, ordered, prune
from .state import Conversion
from .translations import tidy_text


def convert_items(s: Conversion) -> None:
    """Items, pointing at their category by id."""
    items = s.items
    category_ids_by_key = s.category_ids_by_key
    stats = s.stats
    # ---- items -----------------------------------------------------------
    assign_item = IdAssigner(items, by_name)
    new_items = []
    for position, item in enumerate(items, start=1):
        row = prune(dict(item), "category", "role")
        row["id"] = assign_item(item, position)
        row["category_id"] = fk(
            item, "category_id", lambda: category_ids_by_key.get(name_key(item.get("category")))
        )
        row["rarity"] = normalize_rarity(item.get("rarity"))
        promoted, collapsed = tidy_text(row, "items")
        s.promoted_en += promoted
        s.collapsed_translations += collapsed
        new_items.append(ordered(row, "id", "name", "category_id"))
    stats["items"] = {
        "count": len(new_items),
        "missing_category_id": sum(1 for i in new_items if i["category_id"] is None),
    }
    s.new_items = new_items


def convert_addons(s: Conversion) -> None:
    """Add-ons, split into one table per owner kind (killer / item class)."""
    addons = s.addons
    content_dir = s.content_dir
    killer_ids_by_key = s.killer_ids_by_key
    old_to_killer = s.old_to_killer
    category_ids_by_key = s.category_ids_by_key
    category_rows = s.category_rows
    stats = s.stats
    def remap_killer(value: int | None) -> int | None:
        """A pre-split `characters.id` becomes the killer's own id; a killer id
        maps to itself, so re-running changes nothing."""
        if value is None:
            return None
        return old_to_killer.get(value, value)

    # ---- add-ons ------------------------------------------------------------
    # Two tables, each with one mandatory owner. They were one `addons` table
    # with two nullable keys and a CHECK that only one was ever set -- which
    # left `item_category_id` null on all 880 killer add-ons and `killer_id`
    # null on all 51 item ones, and stopped either key being NOT NULL where it
    # belonged. Ids restart at 1 in each table.
    prior_killer_addons, killer_addons_env = load_many(content_dir / "addons" / "killers")
    prior_item_addons, item_addons_env = load_many(content_dir / "addons" / "items")
    if prior_killer_addons or prior_item_addons:
        addons = [*prior_killer_addons, *prior_item_addons]

    assign_killer_addon = IdAssigner(prior_killer_addons, by_name)
    assign_item_addon = IdAssigner(prior_item_addons, by_name)
    new_killer_addons: list[dict[str, Any]] = []
    new_item_addons: list[dict[str, Any]] = []
    orphans: list[tuple[str, str]] = []
    rarity_fixed = 0

    for addon in addons:
        row = prune(dict(addon), "associated_target", "category", "id")

        target = addon.get("associated_target")
        key = name_key(target) if target else ""
        # `killer_id` held a `characters.id` before the character split; map it
        # onto the killer's own id. Already-split input maps to itself.
        killer_id = remap_killer(fk(addon, "killer_id", lambda: killer_ids_by_key.get(key)))
        item_category_id = fk(
            addon, "item_category_id",
            lambda: None if killer_id
            else category_ids_by_key.get(match_category(key, category_rows) or key),
        )

        cleaned = normalize_rarity(addon.get("rarity"))
        rarity_fixed += cleaned != addon.get("rarity")
        row["rarity"] = cleaned
        promoted, collapsed = tidy_text(row, "addons")
        s.promoted_en += promoted
        s.collapsed_translations += collapsed

        if killer_id:
            # A row in `killer_addons` has no item-class key at all; it is not
            # a null, it is a column that does not exist on this table.
            row = prune(row, "item_category_id")
            row["killer_id"] = killer_id
            row["id"] = assign_killer_addon(addon, len(new_killer_addons) + 1)
            new_killer_addons.append(ordered(row, "id", "name", "killer_id"))
        elif item_category_id:
            row = prune(row, "killer_id")
            row["item_category_id"] = item_category_id
            row["id"] = assign_item_addon(addon, len(new_item_addons) + 1)
            new_item_addons.append(ordered(row, "id", "name", "item_category_id"))
        else:
            # Neither table can take it: both owner keys are NOT NULL, and
            # guessing an owner would be inventing data. These four rows are a
            # known upstream scrape failure -- their descriptions belong to
            # other add-ons entirely ("Rubber Gloves" is described as "A wooden
            # stamp with a crosshatched rubber pad") -- so they are reported
            # rather than filed somewhere wrong.
            orphans.append((addon.get("name"), target or ""))

    stats["killer_addons"] = {
        "count": len(new_killer_addons),
        "killers_covered": len({a["killer_id"] for a in new_killer_addons}),
    }
    stats["item_addons"] = {
        "count": len(new_item_addons),
        "categories_covered": len({a["item_category_id"] for a in new_item_addons}),
    }
    stats["addons_dropped_with_no_owner"] = orphans
    stats["addon_rarities_cleaned"] = rarity_fixed
    s.new_killer_addons = new_killer_addons
    s.new_item_addons = new_item_addons
    s.killer_addons_env = killer_addons_env
    s.item_addons_env = item_addons_env


def convert_offerings(s: Conversion) -> None:
    """Offerings, linked to a realm when their description names exactly one."""
    offerings = s.offerings
    realms = s.realms
    realm_ids_by_key = s.realm_ids_by_key
    stats = s.stats
    # ---- offerings --------------------------------------------------------
    assign_offering = IdAssigner(offerings, by_name)
    realm_by_name = [(r.get("name"), realm_ids_by_key[name_key(r.get("name"))])
                     for r in realms if r.get("name")]
    new_offerings = []
    role_conflicts = []
    for position, offering in enumerate(offerings, start=1):
        expected = {
            "SurvivorOfferings": "Survivor",
            "KillerOfferings": "Killer",
            "CommonOfferings": "All",
        }.get(offering.get("category"))
        if expected and expected != offering.get("role"):
            role_conflicts.append({
                "name": offering.get("name"),
                "category": offering.get("category"),
                "role": offering.get("role"),
            })

        # A realm offering names its realm in its own description and nowhere
        # else. Assigned only on an unambiguous single match -- offline, here.
        description = (offering.get("description") or "").lower()
        matches = [rid for rname, rid in realm_by_name if rname.lower() in description]

        row = prune(dict(offering), "category")
        row["id"] = assign_offering(offering, position)
        row["realm_id"] = fk(
            offering, "realm_id", lambda: matches[0] if len(matches) == 1 else None
        )
        row["rarity"] = normalize_rarity(offering.get("rarity"))
        promoted, collapsed = tidy_text(row, "offerings")
        s.promoted_en += promoted
        s.collapsed_translations += collapsed
        new_offerings.append(
            drop_null_keys(ordered(row, "id", "name", "role", "realm_id"), "realm_id")
        )

    stats["offerings"] = {
        "count": len(new_offerings),
        "realm_linked": sum(1 for o in new_offerings if o.get("realm_id")),
        "category_role_conflicts_resolved": role_conflicts,
    }
    s.new_offerings = new_offerings


def convert_perks(s: Conversion) -> None:
    """Perks, owned by at most one survivor or killer."""
    perks = s.perks
    old_to_survivor = s.old_to_survivor
    old_to_killer = s.old_to_killer
    survivor_ids_by_key = s.survivor_ids_by_key
    killer_ids_by_key = s.killer_ids_by_key
    stats = s.stats
    # ---- perks -------------------------------------------------------------
    # `character_id` pointed at one table; there are two now. A perk carries at
    # most one owner key, plus `role` -- which is not derivable from the keys,
    # because the 27 general perks have no owner and still belong to a side.
    assign_perk = IdAssigner(perks, by_name)
    new_perks = []
    missing_character = []
    for position, perk in enumerate(perks, start=1):
        row = prune(dict(perk), "character_name", "category", "character_id")
        row["id"] = assign_perk(perk, position)
        row["role"] = (perk.get("role") or perk.get("category") or "Survivor").strip().title()

        owner = perk.get("character_name")
        legacy_owner_id = perk.get("character_id")
        survivor_id = perk.get("survivor_id")
        killer_id = perk.get("killer_id")

        if not isinstance(survivor_id, int) and not isinstance(killer_id, int):
            if isinstance(legacy_owner_id, int):
                survivor_id = old_to_survivor.get(legacy_owner_id)
                killer_id = old_to_killer.get(legacy_owner_id)
            elif owner:
                key = name_key(owner)
                survivor_id = survivor_ids_by_key.get(key)
                killer_id = killer_ids_by_key.get(key)

        # The role decides which side may hold the key, so a killer perk can
        # never end up owned by a survivor of the same name.
        row["survivor_id"] = survivor_id if row["role"] == "Survivor" else None
        row["killer_id"] = killer_id if row["role"] == "Killer" else None

        if (owner or isinstance(legacy_owner_id, int)) and not (
            row["survivor_id"] or row["killer_id"]
        ):
            missing_character.append(owner or f"character {legacy_owner_id}")

        promoted, collapsed = tidy_text(row, "perks")
        s.promoted_en += promoted
        s.collapsed_translations += collapsed
        new_perks.append(
            # `alternate_name` is set on 9 of 321 perks; the other 312 carried
            # `"alternate_name": null`. It is a plain nullable column, so an
            # absent key and an explicit null mean the same thing to the
            # importer -- one of them just says it 312 times.
            drop_null_keys(ordered(row, "id", "name", "role", "survivor_id", "killer_id"),
                           "survivor_id", "killer_id", "alternate_name")
        )

    stats["perks"] = {
        "count": len(new_perks),
        "survivor_perks": sum(1 for p in new_perks if p.get("survivor_id")),
        "killer_perks": sum(1 for p in new_perks if p.get("killer_id")),
        "general": sum(1 for p in new_perks if not p.get("survivor_id") and not p.get("killer_id")),
        "unresolved_characters": sorted(set(missing_character)),
    }
    s.new_perks = new_perks
