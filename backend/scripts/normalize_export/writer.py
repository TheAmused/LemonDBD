# backend/scripts/normalize_export/writer.py
"""Writes the converted tables back to the content directory."""
from __future__ import annotations

import json
import pathlib
from datetime import datetime
from typing import Any

from .fileio import dump, dump_many, shard_name
from .state import Conversion


def write_outputs(s: Conversion) -> None:
    """Write every converted table; `dry` runs report without touching disk."""
    content_dir = s.content_dir
    dry = s.dry
    chapters_env = s.chapters_env
    kept_chapters = s.kept_chapters
    realms_env = s.realms_env
    new_realms = s.new_realms
    new_sources = s.new_sources
    new_categories = s.new_categories
    characters_env = s.characters_env
    new_survivors = s.new_survivors
    new_killers = s.new_killers
    perks_env = s.perks_env
    new_perks = s.new_perks
    items_env = s.items_env
    new_items = s.new_items
    killer_addons_env = s.killer_addons_env
    addons_env = s.addons_env
    item_addons_env = s.item_addons_env
    new_killer_addons = s.new_killer_addons
    new_item_addons = s.new_item_addons
    offerings_env = s.offerings_env
    new_offerings = s.new_offerings
    maps_env = s.maps_env
    new_maps = s.new_maps
    # ---- write ---------------------------------------------------------------
    # The two files this script introduces get an envelope of their own. Reuse
    # the one already on disk when there is one: `static_db_seeder` decides
    # whether a seed file changed by hashing it, and a timestamp that moves on
    # every run would make both files look edited on every boot.
    def _envelope(path: pathlib.Path) -> dict[str, Any]:
        if path.exists():
            try:
                existing = json.loads(path.read_text(encoding="utf-8"))
                if existing.get("exported_at"):
                    return {
                        "version": existing.get("version", "3.0"),
                        "source": existing.get("source", "LemonDBD"),
                        "exported_at": existing["exported_at"],
                    }
            except (OSError, ValueError):
                pass
        return {
            "version": "3.0", "source": "LemonDBD",
            "exported_at": datetime.now().astimezone().isoformat(),
        }

    dump(content_dir / "chapters.json", chapters_env, "chapters", kept_chapters, dry)
    dump(content_dir / "realms.json", realms_env, "realms", new_realms, dry)
    dump(content_dir / "map_sources.json", _envelope(content_dir / "map_sources.json"),
         "map_sources", new_sources, dry)
    dump(content_dir / "item_categories.json", _envelope(content_dir / "item_categories.json"),
         "item_categories", new_categories, dry)
    dump(content_dir / "survivors.json", characters_env, "survivors", new_survivors, dry)
    dump(content_dir / "killers.json", _envelope(content_dir / "killers.json"),
         "killers", new_killers, dry)
    dump(content_dir / "perks.json", perks_env, "perks", new_perks, dry)
    dump(content_dir / "items.json", items_env, "items", new_items, dry)
    killer_names = {k["id"]: k["name"] for k in new_killers}
    category_names = {c["id"]: c["name"] for c in new_categories}
    dump_many(
        content_dir / "addons" / "killers",
        killer_addons_env or addons_env,
        "killer_addons",
        new_killer_addons,
        lambda row: shard_name(killer_names.get(row["killer_id"], "unassigned")),
        dry,
    )
    dump_many(
        content_dir / "addons" / "items",
        item_addons_env or addons_env,
        "item_addons",
        new_item_addons,
        lambda row: shard_name(category_names.get(row["item_category_id"], "unassigned")),
        dry,
    )
    # Superseded by the two sharded folders above. Emptied rather than left to
    # be seeded a second time; the file itself can be deleted.
    dump(content_dir / "addons.json", addons_env, "addons", [], dry)
    dump(content_dir / "offerings.json", offerings_env, "offerings", new_offerings, dry)
    dump(content_dir / "maps.json", maps_env, "maps", new_maps, dry)
