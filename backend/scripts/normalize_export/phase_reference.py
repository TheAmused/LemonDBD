# backend/scripts/normalize_export/phase_reference.py
"""Phases for the tables everything else points at: chapters, realms, map sources, item categories."""
from __future__ import annotations

from typing import Any

from .bootstrap import (
    BASE_GAME_NAME, DEFAULT_SOURCE_CODE, DEFAULT_SOURCE_LABEL, chapter_key, name_key,
    normalize_dlc_type, parse_release_date,
)
from .identity import IdAssigner, by_name
from .rows import ordered
from .state import Conversion


def match_category(key: str, categories: dict[str, dict[str, Any]]) -> str | None:
    """Resolve "toolboxes" -> toolbox, "med_kits" -> med_kit, "event" -> event."""
    if not key:
        return None
    for candidate in (key,
                      key[:-2] if key.endswith("es") else None,
                      key[:-1] if key.endswith("s") else None,
                      f"{key}s"):
        if candidate and candidate in categories:
            return candidate
    return None




def convert_chapters(s: Conversion) -> None:
    """Chapters, numbered in release order; the cosmetic-DLC rows are dropped."""
    chapters = s.chapters
    characters = s.characters
    stats = s.stats
    # ---- chapters ------------------------------------------------------
    # release_date / release_year / is_licensed / dlc_type sit on every
    # character today and are identical for every character in a chapter.
    chapter_attrs: dict[str, dict[str, Any]] = {}
    chapter_translations: dict[str, dict[str, Any]] = {}

    # Already-converted input: the chapter rows carry these themselves.
    for chapter in chapters:
        key = chapter_key(chapter.get("name"))
        if key and "dlc_type" in chapter:
            chapter_attrs[key] = {
                "release_date": chapter.get("release_date"),
                "release_year": chapter.get("release_year"),
                "is_licensed": bool(chapter.get("is_licensed")),
                "dlc_type": normalize_dlc_type(chapter.get("dlc_type")),
            }
            if chapter.get("translations"):
                chapter_translations[key] = chapter["translations"]

    for character in characters:
        key = chapter_key(character.get("chapter_name"))
        if not key:
            continue
        release = parse_release_date(character.get("release_date"))
        chapter_attrs.setdefault(key, {
            "release_date": release.isoformat() if release else None,
            "release_year": character.get("release_year"),
            "is_licensed": bool(character.get("is_licensed")),
            "dlc_type": normalize_dlc_type(character.get("dlc_type")),
        })
        if key not in chapter_translations:
            localized = {
                lang: {"name": payload["chapter_name"]}
                for lang, payload in (character.get("translations") or {}).items()
                if isinstance(payload, dict) and payload.get("chapter_name")
            }
            if localized:
                chapter_translations[key] = localized

    chapter_ids_in_use = {c["chapter_id"] for c in characters if isinstance(c.get("chapter_id"), int)}
    referenced = set(chapter_attrs) | {
        chapter_key(c.get("name")) for c in chapters if c.get("id") in chapter_ids_in_use
    }
    referenced.discard("")
    kept_chapters: list[dict[str, Any]] = []
    dropped_chapters: list[str] = []
    for chapter in chapters:
        key = chapter_key(chapter.get("name"))
        if key not in referenced:
            # Not a chapter: an outfit pack, the soundtrack, or a bundle.
            dropped_chapters.append(chapter.get("name"))
            continue
        kept_chapters.append({
            "name": chapter.get("name"),
            **chapter_attrs[key],
            "banner_url": chapter.get("banner_url"),
            "banner_local_path": chapter.get("banner_local_path"),
            "translations": chapter_translations.get(key, {}),
        })
    for key in referenced - {chapter_key(c["name"]) for c in kept_chapters}:
        # The base game has no DLC banner row, but seven characters come from
        # it, so it needs one for `characters.chapter_id` to point somewhere.
        kept_chapters.append({
            "name": BASE_GAME_NAME if key == "base_game" else key.replace("_", " ").title(),
            **chapter_attrs[key],
            "banner_url": None,
            "banner_local_path": None,
            "translations": chapter_translations.get(key, {}),
        })
    # Chapters are numbered in release order, contiguously from 1.
    #
    # They used to be numbered by position in the input file, which is how Base
    # Game -- the earliest release of the lot, 14 June 2016 -- ended up as id
    # 70: it has no DLC row of its own, so it was appended, took the next
    # sequence value after the original 69 rows, and then the 18 cosmetic-DLC
    # rows were deleted, leaving a 52-69 hole behind it.
    #
    # Release order is stable and append-only, because a chapter that does not
    # exist yet cannot have been released earlier than one that does: a new
    # chapter always sorts last and always takes the next id. So this is a pure
    # function of the data, it reproduces itself on every run, and it repairs
    # the numbering rather than preserving whatever the sequence happened to
    # hand out. Ties -- and rows with no date -- fall back to the name, so the
    # order never depends on dict iteration.
    def _release_sort_key(chapter: dict[str, Any]) -> tuple[str, str]:
        return (chapter.get("release_date") or "9999-12-31", chapter.get("name") or "")

    kept_chapters.sort(key=_release_sort_key)
    chapter_ids_by_key: dict[str, int] = {}
    for position, chapter in enumerate(kept_chapters, start=1):
        chapter["id"] = position
        chapter_ids_by_key[chapter_key(chapter["name"])] = position
    kept_chapters = [ordered(c, "id", "name") for c in kept_chapters]
    # Whatever id a chapter held on the way in, mapped to the one release
    # order just gave it, so the characters pointing at it follow. On a re-run
    # this is the identity, because the input already carries the new numbering.
    old_to_chapter: dict[int, int] = {}
    for chapter in chapters:
        new_id = chapter_ids_by_key.get(chapter_key(chapter.get("name")))
        if isinstance(chapter.get("id"), int) and new_id:
            old_to_chapter[chapter["id"]] = new_id

    stats["chapters"] = {
        "count": len(kept_chapters),
        "first": kept_chapters[0]["name"] if kept_chapters else None,
        "renumbered": sum(1 for old, new in old_to_chapter.items() if old != new),
        "dropped_cosmetic_dlc": len(dropped_chapters),
        "dropped_names": sorted(n for n in dropped_chapters if n),
    }
    s.kept_chapters = kept_chapters
    s.chapter_ids_by_key = chapter_ids_by_key
    s.old_to_chapter = old_to_chapter


def convert_realms(s: Conversion) -> None:
    """Realms get stable ids."""
    realms = s.realms
    stats = s.stats
    # ---- realms --------------------------------------------------------
    assign_realm = IdAssigner(realms, by_name)
    realm_ids_by_key: dict[str, int] = {}
    new_realms = []
    for position, realm in enumerate(realms, start=1):
        row = dict(realm)
        row["id"] = assign_realm(realm, position)
        realm_ids_by_key[name_key(realm.get("name"))] = row["id"]
        new_realms.append(ordered(row, "id", "name"))
    stats["realms"] = {"count": len(new_realms)}
    s.new_realms = new_realms
    s.realm_ids_by_key = realm_ids_by_key


def convert_map_sources(s: Conversion) -> None:
    """Map sources: one row per callout provider instead of a string on every map."""
    prior_sources = s.prior_sources
    maps = s.maps
    stats = s.stats
    # ---- map sources ----------------------------------------------------
    # `source` / `source_label` were strings on all 58 maps: 58 copies of one
    # label, for a value the API exposes as a `?source=` filter.
    source_rows: dict[str, dict[str, Any]] = {}
    for existing in prior_sources:
        code = str(existing.get("code") or "").strip().lower()
        if code:
            source_rows[code] = {"code": code, "label": existing.get("label") or code}
    for m in maps:
        if m.get("source") is None:
            continue
        code = (m.get("source") or DEFAULT_SOURCE_CODE).strip().lower()
        source_rows.setdefault(code, {
            "code": code,
            "label": m.get("source_label") or DEFAULT_SOURCE_LABEL,
        })
    if not source_rows:
        source_rows[DEFAULT_SOURCE_CODE] = {
            "code": DEFAULT_SOURCE_CODE, "label": DEFAULT_SOURCE_LABEL
        }
    assign_source = IdAssigner(prior_sources, lambda r: str(r.get("code") or "").lower())
    source_ids_by_code: dict[str, int] = {}
    new_sources = []
    for position, code in enumerate(sorted(source_rows), start=1):
        row = source_rows[code]
        row["id"] = assign_source(row, position)
        source_ids_by_code[code] = row["id"]
        new_sources.append(ordered(row, "id", "code"))
    stats["map_sources"] = {"count": len(new_sources), "codes": sorted(source_ids_by_code)}
    s.new_sources = new_sources
    s.source_ids_by_code = source_ids_by_code


def convert_item_categories(s: Conversion) -> None:
    """Item categories, with the plural labels add-ons use to point at them."""
    prior_categories = s.prior_categories
    items = s.items
    characters = s.characters
    addons = s.addons
    stats = s.stats
    # ---- item categories -------------------------------------------------
    # `items.category` spelled these singular ("Flashlight"),
    # `addons.associated_target` plural ("Flashlights"); nothing could join.
    category_rows: dict[str, dict[str, Any]] = {}
    for existing in prior_categories:
        key = name_key(existing.get("name"))
        if key:
            category_rows[key] = {
                "name": existing.get("name"),
                "addon_target_label": existing.get("addon_target_label") or existing.get("name"),
                "role": existing.get("role") or "Survivor",
            }
    for item in items:
        name = item.get("category")
        if not name:
            continue
        category_rows.setdefault(name_key(name), {
            "name": name, "addon_target_label": name, "role": "Survivor",
        })

    character_name_keys = {name_key(c.get("name")) for c in characters}
    unresolved_targets: dict[str, int] = {}
    for addon in addons:
        target = addon.get("associated_target")
        if not target:
            continue
        key = name_key(target)
        if key in character_name_keys:
            continue
        match = match_category(key, category_rows)
        if match:
            category_rows[match]["addon_target_label"] = target
        else:
            unresolved_targets[target] = unresolved_targets.get(target, 0) + 1

    assign_category = IdAssigner(prior_categories, by_name)
    category_ids_by_key: dict[str, int] = {}
    new_categories = []
    for position, key in enumerate(sorted(category_rows), start=1):
        row = category_rows[key]
        row["id"] = assign_category(row, position)
        category_ids_by_key[key] = row["id"]
        # The plural label resolves an add-on target to this same row.
        category_ids_by_key.setdefault(name_key(row["addon_target_label"]), row["id"])
        new_categories.append(ordered(row, "id", "name"))
    stats["item_categories"] = {
        "count": len(new_categories),
        "labels": {r["name"]: r["addon_target_label"] for r in new_categories},
    }
    s.category_rows = category_rows
    s.category_ids_by_key = category_ids_by_key
    s.new_categories = new_categories
    s.unresolved_targets = unresolved_targets
