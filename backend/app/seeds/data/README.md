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
│       └── legendary_cosplay.json
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
