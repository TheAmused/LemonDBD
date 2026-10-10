#!/usr/bin/env python3
# backend/scripts/normalize_static_export.py
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
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # the `normalize_export` package

from normalize_export.bootstrap import DEFAULT_CONTENT_DIR  # noqa: E402
from normalize_export.convert import normalize  # noqa: E402


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
