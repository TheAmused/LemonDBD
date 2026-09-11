# backend/scripts/export_static_database.py
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import select

from app import create_app
from app.core.extensions import db
from app.models.character import Character
from app.models.perk import Perk, PerkRule
from app.models.equipment import Item, Addon, Offering
from app.models.chapter import Chapter
from app.models.map import MapRealm, Realm
from app.models.user import User
from app.models.smash_or_pass import Roster, Entity, Translation
from app.services.db.serializers import (
    serialize_character, serialize_perk, serialize_item, serialize_addon, serialize_offering,
    serialize_chapter, serialize_realm, serialize_user,
)

OUTPUT_DIR = Path(os.environ.get("EXPORT_DIR", "/app/static_database_export"))


def clean_dict(data):
    """Recursively clean dict to ensure JSON serializable."""
    if isinstance(data, dict):
        return {k: clean_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_dict(v) for v in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    return data


def save_json_file(path: Path, entity_name: str, items: list, extra_meta: dict = None):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source": "LemonDBD",
        "target": entity_name,
        "count": len(items),
        entity_name: items,
    }
    if extra_meta:
        payload.update(extra_meta)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(clean_dict(payload), f, indent=2, ensure_ascii=False)
    print(f"  [Saved] {path.relative_to(OUTPUT_DIR)} ({len(items)} records, {path.stat().st_size:,} bytes)")


def main():
    print(f"Starting static database export to: {OUTPUT_DIR}")
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    app = create_app()
    with app.app_context():
        # 1. CONTENT
        print("\n--- Exporting Content Entities ---")
        characters = [serialize_character(c) for c in db.session.scalars(select(Character).order_by(Character.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "characters.json", "characters", characters)

        perks = [serialize_perk(p) for p in db.session.scalars(select(Perk).order_by(Perk.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "perks.json", "perks", perks)

        items = [serialize_item(i) for i in db.session.scalars(select(Item).order_by(Item.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "items.json", "items", items)

        addons = [serialize_addon(a) for a in db.session.scalars(select(Addon).order_by(Addon.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "addons.json", "addons", addons)

        offerings = [serialize_offering(o) for o in db.session.scalars(select(Offering).order_by(Offering.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "offerings.json", "offerings", offerings)

        chapters = [serialize_chapter(c) for c in db.session.scalars(select(Chapter).order_by(Chapter.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "chapters.json", "chapters", chapters)

        realms = [serialize_realm(r) for r in db.session.scalars(select(Realm).order_by(Realm.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "realms.json", "realms", realms)

        # Maps (with tiles and objectives)
        map_realms = db.session.scalars(select(MapRealm).order_by(MapRealm.id)).all()
        maps_list = []
        for r in map_realms:
            tiles = [
                {
                    "name": t.name,
                    "type": t.type,
                    "x": t.x,
                    "y": t.y,
                    "seed_variant": t.seed_variant,
                    "floor": t.floor,
                    "has_pallet": t.has_pallet,
                    "has_window": t.has_window,
                }
                for t in r.tiles
            ]
            objectives = [
                {
                    "type": o.type,
                    "x": o.x,
                    "y": o.y,
                    "floor": o.floor,
                }
                for o in r.objectives
            ]
            maps_list.append({
                "map_id": r.map_id,
                "name": r.name,
                "realm": r.realm,
                "realm_id": r.realm_id,
                "source": r.source,
                "source_label": r.source_label,
                "layout_type": r.layout_type,
                "jungle_gyms_count": r.jungle_gyms_count,
                "totem_spawns_count": r.totem_spawns_count,
                "pallet_density": r.pallet_density,
                "shack_has_basement": r.shack_has_basement,
                "description": r.description,
                "image_url": r.image_url,
                "callout_image_url": r.callout_image_url,
                "callout_image_local_path": r.callout_image_local_path,
                "translations": r.translations or {},
                "tiles": tiles,
                "objectives": objectives,
            })
        save_json_file(OUTPUT_DIR / "content" / "maps.json", "maps", maps_list)

        # 2. SETTINGS (no scraper_settings — scraper is gone)
        print("\n--- Exporting Settings ---")
        perk_rules = [pr.to_dict() for pr in db.session.scalars(select(PerkRule).order_by(PerkRule.id)).all()]
        save_json_file(OUTPUT_DIR / "settings" / "perk_rules.json", "perk_rules", perk_rules)

        # 3. SMASH OR PASS — individual per-roster files only (no combined rosters.json duplicate)
        print("\n--- Exporting Smash or Pass (Zero Votes) ---")
        rosters_db = db.session.scalars(select(Roster).order_by(Roster.id)).all()
        serialized_rosters = []
        for r in rosters_db:
            roster_dict = {
                "slug": r.slug,
                "name_i18n_key": r.name_i18n_key,
                "description_i18n_key": r.description_i18n_key,
                "cover_image_url": r.cover_image_url,
                "theme_color": r.theme_color,
                "category": r.category,
                "is_nsfw": r.is_nsfw,
                "is_active": r.is_active,
                "entities": [
                    {
                        "slug": e.slug,
                        "name": e.name,
                        "role": e.role,
                        "gender": e.gender,
                        "media_url": e.media_url,
                        "media_type": e.media_type,
                        "metadata_json": e.get_metadata(),
                        "order_index": e.order_index,
                        "is_active": e.is_active,
                        "stat": e.stat.to_dict() if e.stat else None,
                        "votes": [],  # EXPLICITLY NO VOTES
                    }
                    for e in r.entities
                ]
            }
            serialized_rosters.append(roster_dict)
            save_json_file(
                OUTPUT_DIR / "smash_or_pass" / "rosters" / f"{r.slug}.json",
                "rosters",
                [roster_dict],
                extra_meta={"roster_slug": r.slug, "entity_count": len(r.entities)}
            )

        smash_translations = [t.to_dict() for t in db.session.scalars(select(Translation).order_by(Translation.id)).all()]
        save_json_file(OUTPUT_DIR / "smash_or_pass" / "smash_translations.json", "smash_translations", smash_translations)

        # 4. CORE USERS (Admin lemon & default user only)
        print("\n--- Exporting Core Users Only (lemon & user) ---")
        core_users = db.session.scalars(select(User).where(User.username.in_(["lemon", "user"]))).all()
        lemon_user = [serialize_user(u) for u in core_users if u.username == "lemon"]
        default_user = [serialize_user(u) for u in core_users if u.username == "user"]
        if lemon_user:
            save_json_file(OUTPUT_DIR / "users" / "admin_lemon.json", "users", lemon_user)
        if default_user:
            save_json_file(OUTPUT_DIR / "users" / "default_user.json", "users", default_user)

        # 5. README.md Documentation
        readme_content = f"""# LemonDBD - Static Database Export
Exported at: {datetime.now(timezone.utc).isoformat()}

This directory contains clean, modular static database records for LemonDBD.
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
│   ├── characters.json         ({len(characters)} characters with powers, stats, lore, translations)
│   ├── perks.json              ({len(perks)} perks with teachables, descriptions, translations)
│   ├── items.json              ({len(items)} survivor/killer items)
│   ├── addons.json             ({len(addons)} item and power addons)
│   ├── offerings.json          ({len(offerings)} bloodweb offerings)
│   ├── chapters.json           ({len(chapters)} DBD chapters and DLC releases)
│   ├── maps.json               ({len(maps_list)} maps with tiles and callouts)
│   └── realms.json             ({len(realms)} realms and banners)
├── smash_or_pass/
│   ├── smash_translations.json ({len(smash_translations)} UI and archetype translations)
│   └── rosters/                (Individual roster files)
│       ├── canon.json
│       ├── anime_manga.json
│       ├── cyberpunk_2077.json
│       ├── gothic_eldritch.json
│       ├── hooked_on_you.json
│       └── legendary_cosplay.json
├── settings/
│   └── perk_rules.json         ({len(perk_rules)} standard perk slot rule)
└── users/
    ├── admin_lemon.json        (Admin 'lemon' user record)
    └── default_user.json       (Default 'user' record)
```

## How to Import
Each file is formatted with standard LemonDBD export headers (`version`, `target`, `count`, and the entity key),
making them directly importable via:
1. **Admin Panel UI**: Settings -> Database -> Import (upload any individual `.json` file)
2. **API Endpoint**: `POST /api/v1/admin/db/import`
3. **Python Service**: `DatabaseExportImportService.import_database(payload)`
4. **Updates Drop Folder**: Drop any `.json` file into `seeds/updates/` or `data/updates/`
"""
        with open(OUTPUT_DIR / "README.md", "w", encoding="utf-8") as f:
            f.write(readme_content)
        print("  [Saved] README.md")

    print("\nStatic database export complete!")


if __name__ == "__main__":
    main()
