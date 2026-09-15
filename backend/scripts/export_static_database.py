# backend/scripts/export_static_database.py
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import select

from app import create_app
from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.equipment import Item, ItemAddon, ItemCategory, KillerAddon, Offering
from app.models.chapter import Chapter
from app.models.map import MapRealm, MapSource, Realm
from app.models.user import User
from app.models.smash_or_pass import Roster, Entity
from app.services.db.serializers import (
    serialize_addon, serialize_chapter, serialize_killer, serialize_survivor,
    serialize_item,
    serialize_item_category, serialize_killer_addon,
    serialize_item_addon, serialize_offering, serialize_perk, serialize_realm,
    serialize_user,
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
        # Two tables, two files. Their ids are numbered separately, so a
        # single `characters.json` could not say which one a row belonged to.
        survivors = [
            serialize_survivor(c)
            for c in db.session.scalars(select(Survivor).order_by(Survivor.id)).all()
        ]
        save_json_file(OUTPUT_DIR / "content" / "survivors.json", "survivors", survivors)

        killers = [
            serialize_killer(c)
            for c in db.session.scalars(select(Killer).order_by(Killer.id)).all()
        ]
        save_json_file(OUTPUT_DIR / "content" / "killers.json", "killers", killers)
        characters = survivors + killers

        perks = [serialize_perk(p) for p in db.session.scalars(select(Perk).order_by(Perk.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "perks.json", "perks", perks)

        items = [serialize_item(i) for i in db.session.scalars(select(Item).order_by(Item.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "items.json", "items", items)

        # One file per owner, matching the seed layout: an add-on belongs to a
        # killer or to an item class, and those are two tables now.
        killer_addons = [
            serialize_killer_addon(a)
            for a in db.session.scalars(select(KillerAddon).order_by(KillerAddon.id)).all()
        ]
        save_json_file(
            OUTPUT_DIR / "content" / "killer_addons.json", "killer_addons", killer_addons
        )

        item_addons = [
            serialize_item_addon(a)
            for a in db.session.scalars(select(ItemAddon).order_by(ItemAddon.id)).all()
        ]
        save_json_file(
            OUTPUT_DIR / "content" / "item_addons.json", "item_addons", item_addons
        )
        addons = killer_addons + item_addons

        offerings = [serialize_offering(o) for o in db.session.scalars(select(Offering).order_by(Offering.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "offerings.json", "offerings", offerings)

        chapters = [serialize_chapter(c) for c in db.session.scalars(select(Chapter).order_by(Chapter.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "chapters.json", "chapters", chapters)

        realms = [serialize_realm(r) for r in db.session.scalars(select(Realm).order_by(Realm.id)).all()]
        save_json_file(OUTPUT_DIR / "content" / "realms.json", "realms", realms)

        # The two lookup tables the foreign keys above point at. Without them
        # an export cannot be re-imported: `items.category_id` and
        # `map_realms.source_id` would reference rows that are not in the file
        # set.
        item_categories = [
            serialize_item_category(c)
            for c in db.session.scalars(select(ItemCategory).order_by(ItemCategory.id)).all()
        ]
        save_json_file(
            OUTPUT_DIR / "content" / "item_categories.json", "item_categories", item_categories
        )

        map_sources = [
            {"id": s.id, "code": s.code, "label": s.label}
            for s in db.session.scalars(select(MapSource).order_by(MapSource.id)).all()
        ]
        save_json_file(OUTPUT_DIR / "content" / "map_sources.json", "map_sources", map_sources)

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
            # Two integer foreign keys, and nothing copied out of the rows they
            # point at. `realm` (the realm's display name), `source` and
            # `source_label` are read through `realm_id` / `source_id`; the five
            # layout figures are model defaults, not columns.
            maps_list.append({
                "id": r.id,
                "map_id": r.map_id,
                "name": r.name,
                "realm_id": r.realm_id,
                "source_id": r.source_id,
                "description": r.description,
                "image_url": r.image_url,
                "callout_image_url": r.callout_image_url,
                "callout_image_local_path": r.callout_image_local_path,
                "translations": r.translations or {},
                "tiles": tiles,
                "objectives": objectives,
            })
        save_json_file(OUTPUT_DIR / "content" / "maps.json", "maps", maps_list)

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
                        # The profile is columns now; `metadata_json` was one
                        # blob restating them, so it exports as columns too.
                        "archetype": e.archetype,
                        "bio": e.bio,
                        "tagline": e.tagline,
                        "quote": e.quote,
                        "meme": e.meme,
                        "turn_on": e.turn_on,
                        "dealbreaker": e.dealbreaker,
                        "dating_vibe": e.dating_vibe,
                        "red_flags": list(e.red_flags or []),
                        "green_flags": list(e.green_flags or []),
                        "chapter": e.chapter,
                        "danger_level": e.danger_level,
                        "chaos_score": e.chaos_score,
                        "translations": e.translations or {},
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
│   ├── survivors.json          ({len(survivors)} survivors with lore and translations)
│   ├── killers.json            ({len(killers)} killers with powers, stats, lore, translations)
│   ├── perks.json              ({len(perks)} perks with teachables, descriptions, translations)
│   ├── items.json              ({len(items)} survivor/killer items)
│   ├── addons.json             ({len(addons)} item and power addons)
│   ├── offerings.json          ({len(offerings)} bloodweb offerings)
│   ├── chapters.json           ({len(chapters)} DBD chapters and DLC releases)
│   ├── maps.json               ({len(maps_list)} maps with tiles and callouts)
│   └── realms.json             ({len(realms)} realms and banners)
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
