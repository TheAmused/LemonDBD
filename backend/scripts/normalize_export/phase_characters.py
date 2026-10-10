# backend/scripts/normalize_export/phase_characters.py
"""Phase for survivors and killers: one table per role, power columns inlined on the killer."""
from __future__ import annotations

from typing import Any

from .bootstrap import chapter_key, name_key, parse_movement_speed
from .identity import IdAssigner, by_name
from .rows import ordered, prune
from .state import Conversion
from .translations import strip_moved_translations, tidy_text


def convert_characters(s: Conversion) -> None:
    """Survivors and killers, numbered from 1 within each role."""
    survivors_file = s.survivors_file
    killers_file = s.killers_file
    characters = s.characters
    old_to_chapter = s.old_to_chapter
    chapter_ids_by_key = s.chapter_ids_by_key
    stats = s.stats
    # ---- survivors and killers ---------------------------------------------
    # One table per role, each numbered from 1. On a first conversion the id is
    # the row's position *within its role*, which is exactly what the old
    # `release_number` column held (survivors 1-54, killers 1-44, verified for
    # all 98 rows) -- so `release_number` is dropped as derived, and survivor
    # ids come out unchanged from the single-table numbering.
    survivors_in = [c for c in characters if (c.get("role") or "Survivor").lower() != "killer"]
    killers_in = [c for c in characters if (c.get("role") or "").lower() == "killer"]

    # Seeded from the *target* files, not from the input. Before the split
    # there are no target files, so both assigners fall back to position within
    # the role -- survivors 1-54, killers 1-44 -- which is what the old
    # `release_number` column already said. Seeding from the input instead
    # would have handed the killers back their single-table ids (55-98).
    assign_survivor = IdAssigner(survivors_file, by_name)
    assign_killer = IdAssigner(killers_file, by_name)

    survivor_ids_by_key: dict[str, int] = {}
    killer_ids_by_key: dict[str, int] = {}
    #: Old single-table `characters.id` -> new per-role id, used once to
    #: repoint the files that referenced it. On a re-run the input is already
    #: split, so these maps are the identity and remapping is a no-op.
    old_to_survivor: dict[int, int] = {}
    old_to_killer: dict[int, int] = {}

    new_survivors: list[dict[str, Any]] = []
    new_killers: list[dict[str, Any]] = []

    _SHARED_DROP = (
        "chapter_name", "chapter_number", "dlc_type", "is_licensed",
        "release_year", "release_date", "dlc_counterparts",
        # name respelled three ways: wiki_slug is name with underscores,
        # short_name is a lowercased name, code_prefix is role + release.
        "wiki_slug", "short_name", "code_prefix",
        # the primary key within the role is this number
        "release_number",
        # the table is the role now
        "role", "category",
    )

    def _character_row(character: dict[str, Any], row_id: int) -> dict[str, Any]:
        row = prune(dict(character), *_SHARED_DROP)
        row["id"] = row_id
        existing = character.get("chapter_id")
        row["chapter_id"] = (
            old_to_chapter.get(existing, existing)
            if isinstance(existing, int)
            else chapter_ids_by_key.get(chapter_key(character.get("chapter_name")))
        )
        return row

    for position, character in enumerate(survivors_in, start=1):
        row = _character_row(character, assign_survivor(character, position))
        row = prune(
            row, "killer_profile", "power_name", "power_description",
            "power_icon_url", "power_icon_local_path", "movement_speed",
            "terror_radius", "terror_radius_meters", "height",
        )
        survivor_ids_by_key[name_key(character.get("name"))] = row["id"]
        if isinstance(character.get("id"), int):
            old_to_survivor[character["id"]] = row["id"]
        s.moved_translations += strip_moved_translations(row, "chapter_name")
        p_count, c_count = tidy_text(row, "survivors")
        s.promoted_en += p_count
        s.collapsed_translations += c_count
        new_survivors.append(ordered(row, "id", "name", "chapter_id"))

    for position, character in enumerate(killers_in, start=1):
        row = _character_row(character, assign_killer(character, position))
        # The 1:1 `killer_profiles` child collapses into the killer row: it
        # existed only to keep power columns off the 54 survivors, and there
        # are no survivors in this table.
        profile = character.get("killer_profile")
        if not isinstance(profile, dict):
            # A pre-split row carries the power columns inline as scraped
            # display strings; an already-split row carries them inline as the
            # stored values. Read the stored figure first, so a re-run does not
            # re-parse a `movement_speed` string that is no longer there and
            # null the number it already produced.
            existing_ms = character.get("movement_speed_ms")
            if existing_ms in (None, ""):
                parsed_ms, _ = parse_movement_speed(character.get("movement_speed"))
                speed_ms = format(parsed_ms, "f") if parsed_ms is not None else None
            else:
                speed_ms = str(existing_ms)
            profile = {
                "power_name": character.get("power_name"),
                "power_description": character.get("power_description") or "",
                "power_icon_url": character.get("power_icon_url"),
                "power_icon_local_path": character.get("power_icon_local_path"),
                # Only the m/s figure: the percentage is ms / 4.0 * 100 exactly.
                "movement_speed_ms": speed_ms,
                "terror_radius": character.get("terror_radius"),
                "terror_radius_meters": character.get("terror_radius_meters"),
                "height": character.get("height"),
            }
        row = prune(
            row, "killer_profile", "movement_speed", "movement_speed_percent",
        )
        for field, value in profile.items():
            row.setdefault(field, value)
            row[field] = value
        killer_ids_by_key[name_key(character.get("name"))] = row["id"]
        if isinstance(character.get("id"), int):
            old_to_killer[character["id"]] = row["id"]
        s.moved_translations += strip_moved_translations(row, "chapter_name")
        p_count, c_count = tidy_text(row, "killers")
        s.promoted_en += p_count
        s.collapsed_translations += c_count
        new_killers.append(ordered(row, "id", "name", "chapter_id", "power_name"))

    stats["survivors"] = {
        "count": len(new_survivors),
        "missing_chapter_id": [s["name"] for s in new_survivors if s["chapter_id"] is None],
        "ids_reused": assign_survivor.reused,
    }
    stats["killers"] = {
        "count": len(new_killers),
        "missing_chapter_id": [k["name"] for k in new_killers if k["chapter_id"] is None],
        "missing_power_name": [k["name"] for k in new_killers if not k.get("power_name")],
        "ids_reused": assign_killer.reused,
    }
    s.new_survivors = new_survivors
    s.new_killers = new_killers
    s.survivor_ids_by_key = survivor_ids_by_key
    s.killer_ids_by_key = killer_ids_by_key
    s.old_to_survivor = old_to_survivor
    s.old_to_killer = old_to_killer
