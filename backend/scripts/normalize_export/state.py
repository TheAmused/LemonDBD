# backend/scripts/normalize_export/state.py
"""The working state the conversion phases read from and add to, and its loader."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .fileio import load


@dataclass
class Conversion:
    """Everything one run reads (`chapters` ... `prior_sources`), the id maps the phases hand
    to each other, the converted tables (`new_*`) and the running statistics."""

    content_dir: Path
    dry: bool
    stats: dict[str, Any] = field(default_factory=dict)
    chapters: list[dict[str, Any]] = field(default_factory=list)
    survivors_file: list[dict[str, Any]] = field(default_factory=list)
    killers_file: list[dict[str, Any]] = field(default_factory=list)
    characters: list[dict[str, Any]] = field(default_factory=list)
    realms: list[dict[str, Any]] = field(default_factory=list)
    maps: list[dict[str, Any]] = field(default_factory=list)
    items: list[dict[str, Any]] = field(default_factory=list)
    addons: list[dict[str, Any]] = field(default_factory=list)
    offerings: list[dict[str, Any]] = field(default_factory=list)
    perks: list[dict[str, Any]] = field(default_factory=list)
    prior_categories: list[dict[str, Any]] = field(default_factory=list)
    prior_sources: list[dict[str, Any]] = field(default_factory=list)
    kept_chapters: list[dict[str, Any]] = field(default_factory=list)
    new_realms: list[dict[str, Any]] = field(default_factory=list)
    new_sources: list[dict[str, Any]] = field(default_factory=list)
    new_categories: list[dict[str, Any]] = field(default_factory=list)
    new_survivors: list[dict[str, Any]] = field(default_factory=list)
    new_killers: list[dict[str, Any]] = field(default_factory=list)
    new_items: list[dict[str, Any]] = field(default_factory=list)
    new_killer_addons: list[dict[str, Any]] = field(default_factory=list)
    new_item_addons: list[dict[str, Any]] = field(default_factory=list)
    new_offerings: list[dict[str, Any]] = field(default_factory=list)
    new_perks: list[dict[str, Any]] = field(default_factory=list)
    new_maps: list[dict[str, Any]] = field(default_factory=list)
    chapter_ids_by_key: dict[Any, Any] = field(default_factory=dict)
    old_to_chapter: dict[Any, Any] = field(default_factory=dict)
    realm_ids_by_key: dict[Any, Any] = field(default_factory=dict)
    source_ids_by_code: dict[Any, Any] = field(default_factory=dict)
    category_rows: dict[Any, Any] = field(default_factory=dict)
    category_ids_by_key: dict[Any, Any] = field(default_factory=dict)
    survivor_ids_by_key: dict[Any, Any] = field(default_factory=dict)
    killer_ids_by_key: dict[Any, Any] = field(default_factory=dict)
    old_to_survivor: dict[Any, Any] = field(default_factory=dict)
    old_to_killer: dict[Any, Any] = field(default_factory=dict)
    unresolved_targets: dict[Any, Any] = field(default_factory=dict)
    chapters_env: dict[str, Any] = field(default_factory=dict)
    characters_env: dict[str, Any] = field(default_factory=dict)
    realms_env: dict[str, Any] = field(default_factory=dict)
    maps_env: dict[str, Any] = field(default_factory=dict)
    items_env: dict[str, Any] = field(default_factory=dict)
    addons_env: dict[str, Any] = field(default_factory=dict)
    offerings_env: dict[str, Any] = field(default_factory=dict)
    perks_env: dict[str, Any] = field(default_factory=dict)
    killer_addons_env: dict[str, Any] = field(default_factory=dict)
    item_addons_env: dict[str, Any] = field(default_factory=dict)
    moved_translations: int = 0
    promoted_en: int = 0
    collapsed_translations: int = 0


def load_inputs(content_dir: Path, dry: bool) -> Conversion:
    """Read every input file into a fresh `Conversion`."""

    chapters, chapters_env = load(content_dir / "chapters.json")
    # Survivors and killers are two files now. Before the split there was one
    # `characters.json` with a `role` column; read whichever exists, tag each
    # row with its role, and let the conversion below deal in one list.
    survivors_file, characters_env = load(content_dir / "survivors.json")
    killers_file, _ = load(content_dir / "killers.json")
    if survivors_file or killers_file:
        characters = [
            *({**r, "role": "Survivor"} for r in survivors_file),
            *({**r, "role": "Killer"} for r in killers_file),
        ]
    else:
        characters, characters_env = load(content_dir / "characters.json")
    realms, realms_env = load(content_dir / "realms.json")
    maps, maps_env = load(content_dir / "maps.json")
    items, items_env = load(content_dir / "items.json")
    addons, addons_env = load(content_dir / "addons.json")
    offerings, offerings_env = load(content_dir / "offerings.json")
    perks, perks_env = load(content_dir / "perks.json")

    # Existing ids, so a re-run is additive rather than a renumbering.
    prior_categories, _ = load(content_dir / "item_categories.json")
    prior_sources, _ = load(content_dir / "map_sources.json")

    return Conversion(
        content_dir=content_dir, dry=dry,
        chapters=chapters,
        survivors_file=survivors_file,
        killers_file=killers_file,
        characters=characters,
        realms=realms,
        maps=maps,
        items=items,
        addons=addons,
        offerings=offerings,
        perks=perks,
        prior_categories=prior_categories,
        prior_sources=prior_sources,
        chapters_env=chapters_env,
        characters_env=characters_env,
        realms_env=realms_env,
        maps_env=maps_env,
        items_env=items_env,
        addons_env=addons_env,
        offerings_env=offerings_env,
        perks_env=perks_env,
    )
