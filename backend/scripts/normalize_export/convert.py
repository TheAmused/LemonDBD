# backend/scripts/normalize_export/convert.py
"""The conversion pipeline: load, run each phase in dependency order, check, write."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .integrity import check_referential_integrity
from .phase_catalog import convert_addons, convert_items, convert_offerings, convert_perks
from .phase_characters import convert_characters
from .phase_maps import convert_maps
from .phase_reference import (
    convert_chapters, convert_item_categories, convert_map_sources, convert_realms,
)
from .state import load_inputs
from .writer import write_outputs


def normalize(content_dir: Path, dry: bool) -> dict[str, Any]:
    s = load_inputs(content_dir, dry)

    # Order matters: each phase reads the id maps the earlier ones produce.
    convert_chapters(s)
    convert_realms(s)
    convert_map_sources(s)
    convert_item_categories(s)
    convert_characters(s)
    convert_items(s)
    convert_addons(s)
    convert_offerings(s)
    convert_perks(s)
    convert_maps(s)

    stats = s.stats
    unresolved_targets = s.unresolved_targets
    stats["translation_entries_moved_to_parent"] = s.moved_translations
    stats["english_promoted_to_column"] = s.promoted_en
    stats["duplicate_translation_entries_dropped"] = s.collapsed_translations
    if unresolved_targets:
        stats["unresolved_addon_targets"] = unresolved_targets

    # ---- integrity ----------------------------------------------------------
    problems = check_referential_integrity({
        "chapters": s.kept_chapters, "realms": s.new_realms, "map_sources": s.new_sources,
        "item_categories": s.new_categories, "survivors": s.new_survivors,
        "killers": s.new_killers, "perks": s.new_perks, "items": s.new_items,
        "killer_addons": s.new_killer_addons, "item_addons": s.new_item_addons,
        "offerings": s.new_offerings, "maps": s.new_maps,
    })
    stats["integrity"] = problems or "every foreign key resolves; no duplicate ids"

    write_outputs(s)
    return stats
