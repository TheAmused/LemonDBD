# backend/app/services/db/import_content.py
"""Import of the static catalog: chapters, characters, perks, equipment, maps and tier lists."""
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.equipment import Item, ItemAddon, ItemCategory, KillerAddon, Offering
from app.models.map import MapRealm, MapSource, Realm
from app.models.perk import Perk
from app.services.db._common import parse_datetime
from app.services.db.asset_bundling import write_asset_base64
from app.services.db.import_upserts import import_tier_lists, upsert_by_id
from app.services.db.parsing import parse_release_date


def _import_reference_data(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    static_dir: Path,
) -> None:
    """Chapters, realms, map sources and item categories: the parents everything else points at."""
    def _release_date(chapter_obj: Chapter, row: dict[str, Any]) -> None:
        if "release_date" in row:
            chapter_obj.release_date = parse_release_date(row.get("release_date"))

    upsert_by_id(
        data, target_keys, summary, "chapters", Chapter,
        update_fields=[
            "name", "release_year", "is_licensed", "dlc_type",
            "banner_url", "banner_local_path", "translations",
        ],
        defaults=lambda row: {"name": row.get("name") or ""},
        post_process=_release_date,
        asset_fields=["banner_local_path"], static_dir=static_dir,
    )

    if "maps" in target_keys or "realms" in target_keys:
        # Gated by "maps" OR "realms" because an old backup may carry
        # realm banners only under the "maps" target.
        upsert_by_id(
            data, {"realms"}, summary, "realms", Realm,
            update_fields=["name", "image_url", "image_local_path", "translations"],
            defaults=lambda row: {"name": row.get("name") or ""},
            asset_fields=["image_local_path"], static_dir=static_dir,
        )

    upsert_by_id(
        data, target_keys, summary, "map_sources", MapSource,
        update_fields=["code", "label"],
        defaults=lambda row: {
            "code": row.get("code") or "", "label": row.get("label") or "",
        },
    )

    upsert_by_id(
        data, target_keys, summary, "item_categories", ItemCategory,
        update_fields=["name", "addon_target_label", "role"],
        defaults=lambda row: {
            "name": row.get("name") or "",
            "addon_target_label": row.get("addon_target_label") or row.get("name") or "",
        },
    )

    db.session.flush()


def _import_characters(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    static_dir: Path,
) -> None:
    """Survivors, then killers (the power columns live on the killer row)."""
    _SHARED_CHARACTER_FIELDS = [
        "name", "chapter_id", "portrait_url", "real_name",
        "avatar_local_path", "gender", "emoji_riddle",
        "is_disabled", "disabled_reason",
        "lore", "translations",
    ]

    def _character_defaults(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": row.get("name") or "",
            "chapter_id": row.get("chapter_id"),
        }

    def _set_created_at(char_obj: Survivor | Killer, row: dict[str, Any]) -> None:
        if row.get("created_at"):
            parsed_dt = parse_datetime(row["created_at"])
            if parsed_dt:
                char_obj.created_at = parsed_dt

    upsert_by_id(
        data, target_keys, summary, "survivors", Survivor,
        update_fields=_SHARED_CHARACTER_FIELDS + ["height"],
        defaults=_character_defaults,
        post_process=_set_created_at,
        asset_fields=["avatar_local_path"], static_dir=static_dir,
    )

    def _decimal_speed(killer_obj: Killer, row: dict[str, Any]) -> None:
        """`movement_speed_ms` arrives as a string; the column is NUMERIC.

        Only the m/s figure is carried: the percentage the source
        printed beside it is ms / 4.0 * 100, the survivor baseline,
        exactly, for all 44 killers.
        """
        if "movement_speed_ms" not in row:
            return
        value = row.get("movement_speed_ms")
        killer_obj.movement_speed_ms = (
            Decimal(str(value)) if value not in (None, "") else None
        )

    def _killer_post_process(killer_obj: Killer, row: dict[str, Any]) -> None:
        _decimal_speed(killer_obj, row)
        _set_created_at(killer_obj, row)

    # The power columns are on this row now. They used to be a 1:1
    # `killer_profiles` child, nested one level deeper in the payload,
    # which existed only to keep them off the 54 survivors.
    upsert_by_id(
        data, target_keys, summary, "killers", Killer,
        update_fields=_SHARED_CHARACTER_FIELDS + [
            "power_name", "power_description", "power_icon_url",
            "power_icon_local_path", "terror_radius",
            "terror_radius_meters", "height",
            "chase_music_url", "chase_music_local_path",
        ],
        defaults=lambda row: {
            **_character_defaults(row),
            "power_name": row.get("power_name") or "",
        },
        post_process=_killer_post_process,
        asset_fields=["avatar_local_path", "power_icon_local_path"],
        static_dir=static_dir,
    )

    db.session.flush()


def _import_equipment(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    static_dir: Path,
) -> None:
    """Perks, items, add-ons and offerings."""
    def _perk_owner(perk_obj: Perk, row: dict[str, Any]) -> None:
        """Same rule as add-ons: at most one owner, absent means none.

        The 27 general perks have neither key, so the seed files carry
        neither, and `role` is what still places them on a side.
        """
        if "survivor_id" in row or "killer_id" in row:
            perk_obj.survivor_id = row.get("survivor_id")
            perk_obj.killer_id = row.get("killer_id")

    upsert_by_id(
        data, target_keys, summary, "perks", Perk,
        post_process=_perk_owner,
        update_fields=[
            "name", "survivor_id", "killer_id", "alternate_name",
            "is_generic_counterpart", "is_teachable", "role",
            "description", "icon_url", "icon_local_path", "translations",
            "perk_type",
        ],
        defaults=lambda row: {
            "name": row.get("name") or "",
            # `category` is the pre-split spelling; an older backup
            # still carries it.
            "role": row.get("role") or row.get("category") or "Survivor",
        },
        asset_fields=["icon_local_path"], static_dir=static_dir,
    )

    upsert_by_id(
        data, target_keys, summary, "items", Item,
        update_fields=[
            "name", "category_id", "description", "icon_url",
            "icon_local_path", "rarity", "translations",
        ],
        defaults=lambda row: {
            "name": row.get("name") or "", "category_id": row.get("category_id"),
        },
        asset_fields=["icon_local_path"], static_dir=static_dir,
    )

    # One table per owner, each key NOT NULL, so there is no
    # exclusivity to police on the way in any more -- the table an
    # add-on lands in *is* which kind it is.
    upsert_by_id(
        data, target_keys, summary, "killer_addons", KillerAddon,
        update_fields=[
            "name", "killer_id", "description", "icon_url",
            "icon_local_path", "rarity", "translations",
        ],
        defaults=lambda row: {
            "name": row.get("name") or "", "killer_id": row.get("killer_id"),
        },
        asset_fields=["icon_local_path"], static_dir=static_dir,
    )

    upsert_by_id(
        data, target_keys, summary, "item_addons", ItemAddon,
        update_fields=[
            "name", "item_category_id", "description", "icon_url",
            "icon_local_path", "rarity", "translations",
        ],
        defaults=lambda row: {
            "name": row.get("name") or "",
            "item_category_id": row.get("item_category_id"),
        },
        asset_fields=["icon_local_path"], static_dir=static_dir,
    )

    upsert_by_id(
        data, target_keys, summary, "offerings", Offering,
        update_fields=[
            "name", "role", "realm_id", "description", "icon_url",
            "icon_local_path", "rarity", "translations",
        ],
        defaults=lambda row: {"name": row.get("name") or ""},
        asset_fields=["icon_local_path"], static_dir=static_dir,
    )


def _import_maps(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    static_dir: Path,
) -> None:
    """Maps, addressed by id with a name fallback for older backups."""
    if "maps" in target_keys and "maps" in data:
        created = updated = 0
        for mdata in data["maps"]:
            # The primary key is the only identity a map has now.
            # `map_id` -- `hens_autohaven_wreckers_azarovs_resting_place`
            # -- spelled out the provider, the realm and the name, all
            # three of which are columns on this row, and the tables
            # that referenced it are gone. An older backup still
            # carries it, and the name it held is matched as a
            # fallback so such a backup still restores.
            row_id = mdata.get("id")
            map_obj = (
                db.session.get(MapRealm, row_id) if isinstance(row_id, int) else None
            )
            if map_obj is None:
                name = mdata.get("name") or mdata.get("map_id")
                if not name:
                    continue
                map_obj = db.session.scalar(
                    select(MapRealm).where(MapRealm.name == name)
                )
            if not map_obj:
                map_obj = MapRealm(
                    name=mdata.get("name") or mdata.get("map_id"),
                    realm_id=mdata.get("realm_id"),
                    source_id=mdata.get("source_id"),
                )
                if isinstance(row_id, int):
                    map_obj.id = row_id
                db.session.add(map_obj)
                created += 1
            else:
                updated += 1

            for k in [
                "name", "realm_id", "source_id", "description",
                "callout_image_url", "callout_image_local_path", "translations",
                "layout_type", "pallet_density", "jungle_gyms_count",
                "is_shack", "is_main_building",
                "size_sq_tiles", "size_sq_meters",
            ]:
                if k in mdata:
                    setattr(map_obj, k, mdata[k])

            # `tiles` and `objectives` in an older backup are read
            # and discarded: neither table exists. `map_objectives` was
            # empty for all 58 maps, and the 290 `map_tiles` rows were
            # five generic placeholder names copied onto every map,
            # which the frontend's own utils/mapLandmarks.ts supersedes
            # with real per-map callouts.

            write_asset_base64(
                static_dir,
                mdata.get("callout_image_local_path"),
                mdata.get("callout_image_local_path_data"),
            )
        db.session.flush()
        summary["maps"] = {"created": created, "updated": updated}


def import_content(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    static_dir: Path,
) -> None:
    """Import the static catalog, parents first.

    Every row is addressed by its own integer id and every cross-entity reference in the
    payload is an integer foreign key. Parents still go first so the foreign keys they
    satisfy exist by the time the children are flushed.

    The old order (characters -> perks -> items -> addons -> offerings -> chapters -> maps
    -> realms) only worked because nothing referenced anything: every link was a copied
    string.
    """
    _import_reference_data(data, target_keys, summary, static_dir)
    _import_characters(data, target_keys, summary, static_dir)
    _import_equipment(data, target_keys, summary, static_dir)
    _import_maps(data, target_keys, summary, static_dir)
    import_tier_lists(data, target_keys, summary)
