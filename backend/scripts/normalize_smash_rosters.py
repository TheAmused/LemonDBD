# backend/scripts/normalize_smash_rosters.py
"""Rewrites the smash-or-pass roster seed files into the normalized shape.

Offline and idempotent: run it again and it is a byte-for-byte no-op.

What it removes, and why each one is safe (counts verified across all 148
entities in the six roster files before any of this was written):

  i18n                  duplicate of `translations`, differing only at
                        `pl.quote`, where the `i18n` copy was the untranslated
                        English string on 145/148. `translations` wins.
  title                 == `archetype` on 148/148.
  turnOn/redFlags/      camelCase twins of the snake_case keys, equal on
  greenFlags/datingVibe 148/148.
  translations.en       restates the top-level English on 148/148 for every
                        one of the ten fields; the top level becomes a column.
  compatibility_tags    == [archetype, role, gender] on 148/148, all three of
                        which the row already carries.
  metadata_json         itself: its contents are columns now.
  stat.id               a surrogate uuid on a strictly 1:1 table.
  stat.total_votes      == smash + pass + super_smash on 148/148.
  stat.smash_rate       derivable from the same three counts.
  votes                 empty on 148/148; votes are user data, not seed data.
"""
import argparse
import json
import pathlib
from pathlib import Path
from typing import Any

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "app" / "seeds" / "data" / "smash_or_pass" / "rosters"

LOCALES = ("de", "es", "ja", "pl")
FIELDS = (
    "archetype", "bio", "tagline", "quote", "meme",
    "turn_on", "dealbreaker", "dating_vibe", "red_flags", "green_flags",
)


def _clean(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def normalize_entity(entity: dict[str, Any], stats: dict[str, Any]) -> dict[str, Any]:
    # On a legacy file the profile is inside `metadata_json`; on an
    # already-normalized one it is the entity's own keys. Reading the entity as
    # the fallback is what makes a second pass a no-op instead of erasing
    # everything -- the first draft of this script produced empty rows the
    # moment `metadata_json` was gone.
    meta = entity.get("metadata_json") or entity.get("metadata") or entity

    # `translations` over `i18n`: the two are identical except at pl.quote,
    # where `i18n` kept the English string.
    source = meta.get("translations") or meta.get("i18n") or {}

    # English comes from the top level, falling back to the "en" entry -- they
    # agree on 148/148, so this only matters for a hand-edited file.
    english = dict(source.get("en") or {})
    row: dict[str, Any] = {
        "slug": entity["slug"],
        "name": entity["name"],
        "real_name": _clean(entity.get("real_name")),
        "role": entity.get("role") or "Survivor",
        "gender": entity.get("gender") or "female",
        "media_url": entity.get("media_url"),
        "media_type": entity.get("media_type") or "image",
        "watermark_left": _clean(entity.get("watermark_left")),
        "watermark_right": _clean(entity.get("watermark_right")),
        # `title` and `archetype` were the same string stored twice.
        "archetype": _clean(meta.get("archetype") or meta.get("title") or english.get("title")),
    }
    for field in ("bio", "tagline", "quote", "meme", "turn_on", "dealbreaker", "dating_vibe"):
        camel = {"turn_on": "turnOn", "dating_vibe": "datingVibe"}.get(field)
        value = meta.get(field)
        if value is None and camel:
            value = meta.get(camel)
        if value is None:
            value = english.get(field)
        row[field] = _clean(value) or ""

    for field, camel in (("red_flags", "redFlags"), ("green_flags", "greenFlags")):
        value = meta.get(field)
        if value is None:
            value = meta.get(camel)
        if value is None:
            value = english.get(field)
        row[field] = [_clean(v) for v in (value or [])]

    row["chapter"] = _clean(meta.get("chapter"))
    row["danger_level"] = _clean(meta.get("danger_level") or meta.get("dangerLevel"))
    score = meta.get("chaos_score", meta.get("chaosScore"))
    row["chaos_score"] = int(score) if isinstance(score, (int, float)) else None

    # Only the four non-English locales, and within each only the fields that
    # actually differ from the column. A translation blob is a set of
    # *differences*; an entry restating its column is noise that can drift.
    translations: dict[str, dict[str, Any]] = {}
    for locale in LOCALES:
        entry = source.get(locale)
        if not isinstance(entry, dict):
            continue
        kept = {}
        for field in FIELDS:
            # A legacy locale blob spells the archetype `title`; a normalized
            # one already spells it `archetype`. Accepting both is what keeps a
            # second pass from dropping the translated archetype.
            if field == "archetype":
                value = entry.get("archetype") or entry.get("title")
            else:
                value = entry.get(field)
            value = [_clean(v) for v in value] if isinstance(value, list) else _clean(value)
            if value and value != row.get(field):
                kept[field] = value
        if kept:
            translations[locale] = kept
    row["translations"] = translations

    row["order_index"] = entity.get("order_index", 0)
    row["is_active"] = bool(entity.get("is_active", True))

    # Only the three counts survive; the other two are generated columns and
    # `id` was a surrogate key for a row identified by its entity.
    stat = entity.get("stat") or {}
    counts = {
        "smash_count": int(stat.get("smash_count") or 0),
        "pass_count": int(stat.get("pass_count") or 0),
        "super_smash_count": int(stat.get("super_smash_count") or 0),
        "chaos_rating": float(stat.get("chaos_rating") or 50.0),
    }
    if any(counts[k] for k in ("smash_count", "pass_count", "super_smash_count")) or counts["chaos_rating"] != 50.0:
        row["stat"] = counts
        stats["kept"] += 1
    else:
        stats["stat_all_default"] += 1

    return {k: v for k, v in row.items() if v not in (None, "", [], {})}


def normalize(directory: Path, dry_run: bool = False) -> dict[str, Any]:
    stats = {"files": 0, "rosters": 0, "entities": 0, "kept": 0, "stat_all_default": 0,
             "bytes_before": 0, "bytes_after": 0}

    for path in sorted(directory.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        stats["files"] += 1
        stats["bytes_before"] += path.stat().st_size

        rosters = []
        for roster in payload.get("rosters", []):
            entities = [normalize_entity(e, stats) for e in roster.get("entities", [])]
            stats["entities"] += len(entities)
            stats["rosters"] += 1
            rosters.append({
                "slug": roster["slug"],
                "name": roster["name"],
                "description": roster.get("description", ""),
                "translations": roster.get("translations") or {},
                "cover_image_url": roster.get("cover_image_url"),
                "theme_color": roster.get("theme_color") or "#ff0055",
                "category": roster.get("category") or "DBD",
                "is_nsfw": bool(roster.get("is_nsfw", False)),
                "is_active": bool(roster.get("is_active", True)),
                "entities": entities,
            })

        out = {
            "version": "3.0",
            "source": "LemonDBD",
            "target": "rosters",
            # `count`, `roster_slug` and `entity_count` were three restatements
            # of what the array already says. `exported_at` made every rewrite
            # a diff even when nothing changed.
            "rosters": rosters,
        }
        text = json.dumps(out, ensure_ascii=False, indent=2) + "\n"
        stats["bytes_after"] += len(text.encode("utf-8"))
        if not dry_run:
            path.write_text(text, encoding="utf-8")

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rosters-dir", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    stats = normalize(args.rosters_dir, args.dry_run)
    before, after = stats["bytes_before"], stats["bytes_after"]
    stats["shrank_by"] = f"{(1 - after / before) * 100:.1f}%" if before else "n/a"
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
