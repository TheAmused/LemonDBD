#!/usr/bin/env python3
"""Rewrite the baseline seed content JSON into the normalized, id-keyed shape.

Identity
--------
Every row carries an explicit integer `id`, and every cross-entity reference is
that integer: `chapter_id`, `killer_id`, `item_category_id`, `realm_id`,
`source_id`, `character_id`. Nothing in the import path matches on a name, a
slug, or any other string.

Ids are assigned here, once, and are **stable**: re-running this script reads
the ids already present in the target files and keeps them, so a re-scrape that
adds The Whatever gets `max(id) + 1` and leaves all 98 existing characters
alone. That stability is the whole contract -- `user_character_ownership`,
`user_perk_ownership` and every hand-written patch under `data/updates/` point
at these numbers.

Ids also line up with an existing database: `export_database()` emits rows
`ORDER BY id`, so position N in a file it produced is id N. Assigning ids by
position reproduces the ids a database seeded from these files already has.

What this converts
------------------
* `chapters.json`   gains `id`, `release_date`, `release_year`, `is_licensed`
                    and `dlc_type` (all lifted off characters, where every
                    character in a chapter carried the same four values); loses
                    the 18 cosmetic-DLC rows; gains a Base Game row.
* `characters.json` gains `id` and `chapter_id`; loses `chapter_name`,
                    `chapter_number`, `dlc_type`, `is_licensed`,
                    `release_year`, `release_date`, `dlc_counterparts`,
                    `wiki_slug`, `short_name`, `code_prefix`; nests the
                    killer-only fields under `killer_profile`.
* `addons.json`     gains `id` and exactly one of `killer_id` /
                    `item_category_id`, replacing `associated_target` -- one
                    string column that named a killer for 880 rows and an item
                    class for 55.
* `items.json`      gains `id`, `category_id`; loses `category`, `role`.
* `offerings.json`  gains `id`, `realm_id`; loses `category`.
* `perks.json`      gains `id`, `character_id`; loses `character_name`.
* `maps.json`       gains `realm_id`, `source_id`; loses `realm`, `realm_id`
                    (a slug string), `source`, `source_label` and the five
                    layout figures that held one value across all 58 rows.
* `realms.json`     gains `id`.
* new `item_categories.json` and `map_sources.json`.

Idempotent
----------
Running this twice is a no-op, not a second conversion. Every reference is read
from the normalized integer column when the input already has one, and resolved
from the legacy string only when it does not -- so a fresh scrape (string
references, no ids) converts, and an already-converted file passes through with
its ids and foreign keys untouched.

Usage:
    python backend/scripts/normalize_static_export.py [--content-dir DIR] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))


def _load_module(module_name: str, relative_path: str):
    """Load one module by path, without importing the `app` package.

    `app/__init__.py` builds the whole Flask application. This is an offline
    data script; loading the two leaf modules it needs directly keeps it
    runnable with nothing but the standard library installed.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(module_name, BACKEND_ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


_matching = _load_module("_lemon_matching", "app/services/db/matching.py")
_parsing = _load_module("_lemon_parsing", "app/services/db/parsing.py")

chapter_key = _matching.chapter_key
name_key = _matching.name_key
normalize_dlc_type = _parsing.normalize_dlc_type
normalize_rarity = _parsing.normalize_rarity
parse_movement_speed = _parsing.parse_movement_speed
parse_release_date = _parsing.parse_release_date

#: The one copy of the baseline seed data that reaches the container.
#: `backend/Dockerfile` builds from the `backend/` directory alone, so nothing
#: under the repository root -- `data/static_export/` included -- is ever in the
#: image, and `/app/data` is an empty named volume. `static_db_seeder` reads
#: this directory (`SEEDS_DATA_DIR`), so this is the file set that is actually
#: seeded. Editing a copy anywhere else changes nothing.
DEFAULT_CONTENT_DIR = BACKEND_ROOT / "app" / "seeds" / "data" / "content"

BASE_GAME_NAME = "Base Game"
DEFAULT_SOURCE_CODE = "hens333"
DEFAULT_SOURCE_LABEL = "Hens333 12-Clock Callouts"

EXPORT_META = ("version", "exported_at", "source", "target", "count")


# ---------------------------------------------------------------- file I/O

def load(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Return (rows, envelope). The envelope is the version/source wrapper."""
    if not path.exists():
        return [], {}
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)
    key = payload.get("target") or path.stem
    return list(payload.get(key) or []), payload


def load_many(folder: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Every row across a folder of shard files, in file-name order.

    Add-ons are sharded one file per owner -- `addons/killers/the_trapper.json`
    holds exactly The Trapper's twenty -- so a change to one killer's add-ons
    is a twenty-line diff instead of a hunk buried in a 2 MB file. The seeder
    reads them the same way: `load_static_seed_payload` walks `content/`
    recursively and concatenates every file that declares the same `target`.
    """
    rows: list[dict[str, Any]] = []
    envelope: dict[str, Any] = {}
    if not folder.is_dir():
        return rows, envelope
    for path in sorted(folder.glob("*.json")):
        shard, shard_env = load(path)
        rows.extend(shard)
        envelope = envelope or shard_env
    return rows, envelope


def shard_name(label: str) -> str:
    """`"The Trapper"` -> `"the_trapper"`, for a shard file name."""
    return name_key(label).replace(" ", "_") or "unassigned"


def dump_many(
    folder: Path,
    envelope: dict[str, Any],
    key: str,
    rows: list[dict[str, Any]],
    shard_of,
    dry: bool,
) -> None:
    """Write `rows` into one file per owner, and say what was written."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(shard_of(row), []).append(row)

    if dry:
        print(f"[dry-run] {folder}/: {len(grouped)} file(s), {len(rows)} row(s)")
        return

    folder.mkdir(parents=True, exist_ok=True)
    written = set()
    for shard, shard_rows in sorted(grouped.items()):
        dump(folder / f"{shard}.json", envelope, key, shard_rows, dry)
        written.add(f"{shard}.json")
    # An owner that lost all of its rows leaves a file behind that would keep
    # seeding them; empty it rather than leave a stale shard.
    for stale in folder.glob("*.json"):
        if stale.name not in written:
            dump(stale, envelope, key, [], dry)


def dump(path: Path, envelope: dict[str, Any], key: str, rows: list[dict[str, Any]], dry: bool) -> None:
    out = {k: envelope.get(k) for k in EXPORT_META if k in envelope}
    out["version"] = "3.0"
    out["target"] = key
    out[key] = rows
    out.pop("count", None)  # derivable from the array; one fewer thing to keep true
    if dry:
        return
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def drop_null_keys(row: dict[str, Any], *keys: str) -> dict[str, Any]:
    """Remove a foreign key that is null because it does not apply.

    An add-on points at a killer or at an item class -- 880 of the 935 at a
    killer -- so one of the two keys is always null, and writing
    `"item_category_id": null` onto every killer add-on states the same
    not-applicable 880 times. The importer reads both keys with `.get()`, so an
    absent key means null; the CHECK constraint is what actually guarantees
    only one is ever set.
    """
    for key in keys:
        if row.get(key) is None:
            row.pop(key, None)
    return row


def prune(row: dict[str, Any], *drop: str) -> dict[str, Any]:
    return {k: v for k, v in row.items() if k not in drop}


def ordered(row: dict[str, Any], *first: str) -> dict[str, Any]:
    """Put `id` and the foreign keys at the top of each record."""
    head = {k: row[k] for k in first if k in row}
    return {**head, **{k: v for k, v in row.items() if k not in head}}


# ---------------------------------------------------------------- identity

class IdAssigner:
    """Hands out stable integer ids for one entity.

    Seeded from whatever the target file already contains, so ids survive a
    re-run: a row that was id 42 last time is id 42 again, and anything new
    starts after the highest id ever issued. Rows are identified for this
    purpose by a normalized natural key (a character's name, a map's map_id) --
    that key is used *here*, offline, to decide what number a row gets, and
    never at import time, where the id itself is the only thing consulted.
    """

    def __init__(self, existing_rows: list[dict[str, Any]], key_of) -> None:
        self._key_of = key_of
        self._assigned: dict[str, int] = {}
        self._next = 1
        #: True once any prior id has been read. On a first conversion nothing
        #: has been seeded, and ids come from `position` -- which is what a
        #: database built from the pre-conversion file already holds.
        self._seeded = False
        for row in existing_rows:
            row_id = row.get("id")
            if not isinstance(row_id, int):
                continue
            key = key_of(row)
            if key and key not in self._assigned:
                self._assigned[key] = row_id
            self._next = max(self._next, row_id + 1)
            self._seeded = True

    def __call__(self, row: dict[str, Any], position: int) -> int:
        """Id for `row`. Falls back to 1-based position on a first run, which
        reproduces the ids a database seeded from these files already holds."""
        key = self._key_of(row)
        if key and key in self._assigned:
            return self._assigned[key]
        # `position` on a first conversion, so ids match a database built from
        # the pre-conversion file; `_next` once ids exist, so a re-scrape
        # appends rather than renumbering.
        assigned = self._next if self._seeded else position
        self._next = max(self._next, assigned + 1)
        if key:
            self._assigned[key] = assigned
        return assigned

    @property
    def reused(self) -> int:
        return len(self._assigned)


def by_name(row: dict[str, Any]) -> str:
    return name_key(row.get("name"))


def by_map_id(row: dict[str, Any]) -> str:
    """A map's natural key for id assignment: its name.

    Used here, offline, only to decide which integer a map keeps across a
    re-run. `map_realms` has no string key any more -- it was
    `hens_autohaven_wreckers_azarovs_resting_place`, which spelled out the
    callout provider, the realm and the name, all three of which are columns on
    the same row.
    """
    return name_key(row.get("name"))


def fk(row: dict[str, Any], column: str, resolve) -> int | None:
    """The row's existing integer foreign key, or one resolved from legacy text.

    This is what makes the script idempotent: an already-converted file carries
    `chapter_id` / `killer_id` / `realm_id` and keeps them; a fresh scrape
    carries `chapter_name` / `associated_target` / `realm` and gets them
    resolved once.
    """
    existing = row.get(column)
    if isinstance(existing, int):
        return existing
    return resolve()


# --------------------------------------------------------- translations

def strip_moved_translations(row: dict[str, Any], *moved: str) -> int:
    """Remove translation keys that now live on the parent row.

    `chapter_name` (characters) and `realm` (maps) were copied into every
    child's translations blob -- 490 and 232 copies of 52 and 21 names.
    """
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return 0
    removed = 0
    for lang, payload in list(translations.items()):
        if not isinstance(payload, dict):
            continue
        for key in moved:
            if key in payload:
                del payload[key]
                removed += 1
        if not payload:
            del translations[lang]
    return removed


#: Free-text fields whose English lived in two places: the column (scraped
#: wiki markup) and `translations.en` (the clean in-game text). The in-game
#: text wins and becomes the column, so English is stored exactly once, like
#: every other language.
PROMOTE_EN = {
    "perks": ("description",),
    "survivors": ("lore",),
    "killers": ("lore", "power_description"),
    "items": ("description",),
    "addons": ("description",),
    "offerings": ("description",),
}

#: Every translatable field, checked for overrides that merely restate the
#: column. `name` is deliberately not promoted -- there the English override is
#: a genuinely different string (the in-game name vs the wiki page title:
#: "Kinship" vs "Camaraderie", "Aestri Yazar" vs "The Troupe") and replacing
#: the column would rename characters.
TRANSLATABLE = {
    "perks": ("name", "description"),
    "survivors": ("name", "lore"),
    "killers": ("name", "lore", "power_name", "power_description"),
    "items": ("name", "description"),
    "addons": ("name", "description"),
    "offerings": ("name", "description"),
    "maps": ("name", "description"),
    "chapters": ("name",),
    "realms": ("name",),
}


def promote_english(row: dict[str, Any], *fields: str) -> int:
    """Move `translations.en.<field>` onto the column it duplicates."""
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return 0
    english = translations.get("en")
    if not isinstance(english, dict):
        return 0
    promoted = 0
    for field in fields:
        value = english.get(field)
        if value is None:
            continue
        row[field] = value
        del english[field]
        promoted += 1
    if not english:
        translations.pop("en", None)
    return promoted


def collapse_translations(row: dict[str, Any], *fields: str) -> int:
    """Drop every override that is byte-identical to the column it overrides.

    A translations blob is a set of *differences*; an entry equal to the base
    value is noise. This removed the English copies of all 58 item
    descriptions, 934 of 935 add-on descriptions and all 96 offering
    descriptions, plus the same restatements in de/es/ja/pl.
    """
    translations = row.get("translations")
    if not isinstance(translations, dict):
        return 0
    dropped = 0
    for lang, payload in list(translations.items()):
        if not isinstance(payload, dict):
            continue
        for field in fields:
            if field not in payload:
                continue
            base = row.get(field)
            if (payload.get(field) or "").strip() == (base or "").strip():
                del payload[field]
                dropped += 1
        if not payload:
            del translations[lang]
    return dropped


def tidy_text(row: dict[str, Any], entity: str) -> tuple[int, int]:
    promoted = promote_english(row, *PROMOTE_EN.get(entity, ()))
    dropped = collapse_translations(row, *TRANSLATABLE.get(entity, ()))
    return promoted, dropped


# ----------------------------------------------------------- conversion

def normalize(content_dir: Path, dry: bool) -> dict[str, Any]:
    stats: dict[str, Any] = {}

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
        match = _match_category(key, category_rows)
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

    def remap_killer(value: int | None) -> int | None:
        """A pre-split `characters.id` becomes the killer's own id; a killer id
        maps to itself, so re-running changes nothing."""
        if value is None:
            return None
        return old_to_killer.get(value, value)
    new_survivors: list[dict[str, Any]] = []
    new_killers: list[dict[str, Any]] = []
    moved_translations = 0
    promoted_en = 0
    collapsed_translations = 0

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
        moved_translations += strip_moved_translations(row, "chapter_name")
        p_count, c_count = tidy_text(row, "survivors")
        promoted_en += p_count
        collapsed_translations += c_count
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
        moved_translations += strip_moved_translations(row, "chapter_name")
        p_count, c_count = tidy_text(row, "killers")
        promoted_en += p_count
        collapsed_translations += c_count
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
        promoted_en += promoted
        collapsed_translations += collapsed
        new_items.append(ordered(row, "id", "name", "category_id"))
    stats["items"] = {
        "count": len(new_items),
        "missing_category_id": sum(1 for i in new_items if i["category_id"] is None),
    }

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
            else category_ids_by_key.get(_match_category(key, category_rows) or key),
        )

        cleaned = normalize_rarity(addon.get("rarity"))
        rarity_fixed += cleaned != addon.get("rarity")
        row["rarity"] = cleaned
        promoted, collapsed = tidy_text(row, "addons")
        promoted_en += promoted
        collapsed_translations += collapsed

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
        promoted_en += promoted
        collapsed_translations += collapsed
        new_offerings.append(
            drop_null_keys(ordered(row, "id", "name", "role", "realm_id"), "realm_id")
        )

    stats["offerings"] = {
        "count": len(new_offerings),
        "realm_linked": sum(1 for o in new_offerings if o.get("realm_id")),
        "category_role_conflicts_resolved": role_conflicts,
    }

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
        promoted_en += promoted
        collapsed_translations += collapsed
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

    # ---- maps ---------------------------------------------------------------
    assign_map = IdAssigner(maps, by_map_id)
    new_maps = []
    unresolved_realms = []
    for position, m in enumerate(maps, start=1):
        row = prune(
            dict(m), "realm", "realm_id", "source", "source_label",
            "layout_type", "pallet_density", "jungle_gyms_count",
            "totem_spawns_count", "shack_has_basement",
            # A byte-identical copy of callout_image_url on all 58 rows.
            "image_url",
            # `objectives` was empty on all 58 maps. `tiles` was 290 rows made
            # of five generic placeholder names repeated onto every map, which
            # the frontend's own mapLandmarks.ts supersedes with real per-map
            # callouts. Neither is a table any more.
            "tiles", "objectives",
        )
        row["id"] = assign_map(m, position)
        realm_id = fk(m, "realm_id", lambda: realm_ids_by_key.get(name_key(m.get("realm"))))
        if realm_id is None:
            unresolved_realms.append(m.get("realm") or m.get("map_id"))
        row["realm_id"] = realm_id
        # `map_id` is gone: a second identity on a table that already had a
        # primary key, spelling out the provider, the realm and the name --
        # which are `source_id`, `realm_id` and `name` on this same row.
        row.pop("map_id", None)
        row["source_id"] = fk(
            m, "source_id",
            lambda: source_ids_by_code.get((m.get("source") or DEFAULT_SOURCE_CODE).strip().lower()),
        )
        moved_translations += strip_moved_translations(row, "realm")
        promoted, collapsed = tidy_text(row, "maps")
        promoted_en += promoted
        collapsed_translations += collapsed
        new_maps.append(ordered(row, "id", "name", "realm_id", "source_id"))
    stats["maps"] = {
        "count": len(new_maps),
        "realm_linked": sum(1 for m in new_maps if m.get("realm_id")),
        "unresolved_realms": sorted({r for r in unresolved_realms if r}),
    }

    stats["translation_entries_moved_to_parent"] = moved_translations
    stats["english_promoted_to_column"] = promoted_en
    stats["duplicate_translation_entries_dropped"] = collapsed_translations
    if unresolved_targets:
        stats["unresolved_addon_targets"] = unresolved_targets

    # ---- integrity ----------------------------------------------------------
    problems = check_referential_integrity({
        "chapters": kept_chapters, "realms": new_realms, "map_sources": new_sources,
        "item_categories": new_categories, "survivors": new_survivors,
        "killers": new_killers, "perks": new_perks, "items": new_items,
        "killer_addons": new_killer_addons, "item_addons": new_item_addons,
        "offerings": new_offerings, "maps": new_maps,
    })
    stats["integrity"] = problems or "every foreign key resolves; no duplicate ids"

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

    return stats


def check_referential_integrity(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """Every foreign key points at a row that exists; no id is used twice."""
    ids = {name: {r["id"] for r in rows} for name, rows in tables.items()}
    problems = []

    for name, rows in tables.items():
        seen: set[int] = set()
        for row in rows:
            if row["id"] in seen:
                problems.append(f"{name}: duplicate id {row['id']}")
            seen.add(row["id"])

    references = [
        ("survivors", "chapter_id", "chapters"),
        ("killers", "chapter_id", "chapters"),
        ("perks", "survivor_id", "survivors"),
        ("perks", "killer_id", "killers"),
        ("items", "category_id", "item_categories"),
        ("killer_addons", "killer_id", "killers"),
        ("item_addons", "item_category_id", "item_categories"),
        ("offerings", "realm_id", "realms"),
        ("maps", "realm_id", "realms"),
        ("maps", "source_id", "map_sources"),
    ]
    for table, column, target in references:
        dangling = [r["id"] for r in tables[table]
                    if r.get(column) is not None and r[column] not in ids[target]]
        if dangling:
            problems.append(f"{table}.{column} -> {target}: {len(dangling)} dangling ({dangling[:5]})")

    for table, column in (("killer_addons", "killer_id"), ("item_addons", "item_category_id")):
        missing = [r["id"] for r in tables[table] if not r.get(column)]
        if missing:
            problems.append(f"{table}: {len(missing)} rows with no {column}")
    return problems


def _match_category(key: str, categories: dict[str, dict[str, Any]]) -> str | None:
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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--content-dir", type=Path, default=DEFAULT_CONTENT_DIR)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    args = parser.parse_args()

    stats = normalize(args.content_dir, args.dry_run)
    print(json.dumps(stats, indent=2, ensure_ascii=False))
    return 1 if isinstance(stats.get("integrity"), list) else 0


if __name__ == "__main__":
    raise SystemExit(main())
