# LemonDBD - Static Database Export
Exported at: 2026-09-10T12:16:35.644310+00:00

This directory contains clean, static database records for LemonDBD.
It completely excludes:
- User-generated accounts (only admin `lemon` and default `user` are retained)
- User perk and character ownerships (0 ownerships)
- Smash or Pass votes (0 votes)
- Minigame and challenge runs / logs (gauntlet, chaos, history, page streaks)
- User bug reports and audit logs

## Directory Structure

```text
static_export/
├── content/
│   ├── characters.json         (98 characters with powers, stats, lore, translations)
│   ├── perks.json              (321 perks with teachables, descriptions, translations)
│   ├── items.json              (58 survivor/killer items)
│   ├── addons.json             (936 item and power addons)
│   ├── offerings.json          (96 bloodweb offerings)
│   ├── chapters.json           (69 DBD chapters and DLC releases)
│   ├── maps.json               (58 maps with tiles and callouts)
│   └── realms.json             (21 realms and banners)
├── smash_or_pass/
│   └── rosters/                (Individual roster files)
│       ├── canon.json
│       ├── anime_manga.json
│       ├── cyberpunk_2077.json
│       ├── gothic_eldritch.json
│       ├── hooked_on_you.json
│       └── legendary_characters.json
└── users/
    ├── admin_lemon.json        (Admin 'lemon' user record)
    └── default_user.json       (Default 'user' record)
```

## How to Import
Each file is formatted with standard LemonDBD export headers (`version`, `target`, `count`, `data`),
making them directly importable via:
1. **Admin Panel UI**: Settings -> Database -> Import (upload any individual `.json` file)
2. **API Endpoint**: `POST /api/v1/admin/db/import`
3. **Python Service**: `DatabaseExportImportService.import_database(payload)`

## Official tier lists (`content/tier_lists.json`)

Every list on `/tier-lists` is one row here -- the five built-ins included. To
add a new one, append a row with the next free `id` and restart the backend:
`apply_pending_updates()` sees the file's hash change, upserts it by id and
bumps the catalog version, so `/api/v1/tier-lists` is fresh immediately.

| field | required | meaning |
|---|---|---|
| `id` | yes | Next free integer. Never reuse one. |
| `slug` | yes | URL + localStorage key (`/tier-lists/<slug>`). Lowercase, digits, dashes. Never recycle a slug: users' saved rankings are keyed on it. `custom`, `new`, `import`, `shared` are reserved. |
| `kind` | yes | `survivor_perks`, `killer_perks`, `survivors`, `killers`, `maps` or `custom` |
| `title`, `description` | yes | English copy; other languages under `translations.<lang>` |
| `tiers` | no | `[{"id": "s", "label": "S", "color": "s"}]` top first. `color` is a token (`s a b c d e f neutral`) or `#rrggbb`. Omit for S/A/B/C/D/F. |
| `item_ids` | no | Catalog ids to rank (survivor ids for `survivors`, etc). Omit for the whole catalog. Not allowed on `custom`. |
| `custom_items` | `custom` only | `[{"id": "x", "name": "X", "image_url": "https://…" or "image_local_path": "tier-lists/x.webp"}]` |
| `default_placements` | no | Official ranking the list opens with: `{"s": ["survivor:7", "survivor:12"]}`. Keys: `perk:<id>`, `survivor:<id>`, `killer:<id>`, `map:<id>`, or a custom item's `id`. |
| `translations` | no | `{"pl": {"title": "…", "description": "…", "tiers": {"s": "…"}, "items": {"x": "…"}}}` |
| `is_featured`, `is_active`, `sort_order` | no | Hub ordering; `is_active: false` retires a list (404). |

Example -- a themed list over a subset of survivors, with its own tiers:

```json
{
  "id": 6,
  "slug": "survivor-style",
  "kind": "survivors",
  "title": "Survivor Style Tier List",
  "description": "Purely on looks.",
  "item_ids": [1, 2, 3, 5, 7],
  "tiers": [
    {"id": "iconic", "label": "Iconic", "color": "s"},
    {"id": "fine", "label": "Fine", "color": "c"},
    {"id": "no", "label": "No", "color": "#6b7280"}
  ],
  "sort_order": 60
}
```

A row the model rejects (bad slug, unknown color, a `custom` list without
items) is skipped with a warning in the backend log; the rest of the file
still imports.
