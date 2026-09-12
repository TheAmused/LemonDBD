# backend/app/services/maps/queries.py
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import MapRealm, MapSource, Realm
from app.models.map import (
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_SHACK_HAS_BASEMENT,
    DEFAULT_SOURCE_LABEL,
    DEFAULT_SOURCE_CODE,
    DEFAULT_TOTEM_SPAWNS,
)

logger = logging.getLogger(__name__)


def fetch_maps(
    use_sqlalchemy: bool,
    db_service: Any,
    realm: str | None = None,
    search: str | None = None,
    source: str | None = None,
    lang: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve maps list with optional realm, search, and source filtering."""
    if use_sqlalchemy:
        try:
            if current_app:
                stmt = select(MapRealm)
                # `realm` and `search` match on the realms table itself now,
                # not on a name copied into every map row.
                if (realm and realm.lower() != "all") or (search and search.strip()):
                    stmt = stmt.join(Realm, MapRealm.realm_id == Realm.id)
                if realm and realm.lower() != "all":
                    stmt = stmt.where(func.lower(Realm.name) == realm.lower())
                if source and source.lower() != "all":
                    stmt = stmt.join(MapSource, MapRealm.source_id == MapSource.id).where(
                        MapSource.code == source.lower()
                    )
                if search and search.strip():
                    term = f"%{search.strip().lower()}%"
                    stmt = stmt.where(
                        or_(
                            func.lower(MapRealm.name).ilike(term),
                            func.lower(Realm.name).ilike(term),
                        )
                    )
                stmt = stmt.order_by(MapRealm.name.asc())
                rows = db.session.scalars(stmt).unique().all()
                # Only fall through to the legacy seed path if the table is fully unseeded.
                table_has_any_rows = rows or db.session.scalar(select(MapRealm.id).limit(1)) is not None
                if table_has_any_rows:
                    return [r.to_dict(lang=lang) for r in rows]
        except Exception as e:
            logger.debug(f"SQLAlchemy get_maps fallback: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass

    # No seeding on the read path: an empty table means the static seeder has
    # not run yet, and inventing six placeholder maps to fill the gap is what
    # used to collide with the real ids in maps.json.
    conn = db_service.get_connection()
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(map_realms);")
    cols = {row[1] for row in cursor.fetchall()}

    # The realm name lives in `realms` now; the raw path joins for it instead
    # of reading a copy off each map row.
    query = (
        "SELECT mr.*, r.name AS realm_name, "
        "ms.code AS source_code, ms.label AS source_label "
        "FROM map_realms mr "
        "LEFT JOIN realms r ON r.id = mr.realm_id "
        "LEFT JOIN map_sources ms ON ms.id = mr.source_id WHERE 1=1"
    )
    params = []

    if realm and realm != "All":
        query += " AND LOWER(r.name) = LOWER(?)"
        params.append(realm)
    if source and source != "all" and "source_id" in cols:
        query += " AND ms.code = LOWER(?)"
        params.append(source)
    if search:
        query += " AND (LOWER(mr.name) LIKE ? OR LOWER(r.name) LIKE ?)"
        term = f"%{search.lower()}%"
        params.extend([term, term])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    maps = []
    for r in rows:
        maps.append({
            # `map_realms.map_id` is gone; `id` on the wire is the integer
            # primary key, the same key name the payload always used.
            "id": r["id"],
            "name": r["name"],
            "realm": r["realm_name"] if "realm_name" in r.keys() else "",
            "realm_id": r["realm_id"],
            "source_id": r["source_id"],
            "source": r["source_code"] or DEFAULT_SOURCE_CODE,
            "source_label": r["source_label"] or DEFAULT_SOURCE_LABEL,
            # Not columns any more -- they held one value each across all 58
            # rows. Same values, served from the model's defaults.
            "layout_type": DEFAULT_LAYOUT_TYPE,
            "jungle_gyms_count": DEFAULT_JUNGLE_GYMS,
            "totem_spawns_count": DEFAULT_TOTEM_SPAWNS,
            "pallet_density": DEFAULT_PALLET_DENSITY,
            "shack_has_basement": DEFAULT_SHACK_HAS_BASEMENT,
            "description": r["description"],
            # `image_url` is no longer stored: it was a byte-identical copy of
            # `callout_image_url` on all 58 rows. The key stays on the wire,
            # served from the one column that survived.
            "image_url": r["callout_image_url"],
        })
    return maps


def fetch_realms(lang: str | None = None) -> list[dict[str, Any]]:
    """Retrieve all realm banner images, keyed by realm name for client-side matching."""
    try:
        if current_app:
            rows = db.session.scalars(select(Realm)).all()
            return [r.to_dict(lang=lang) for r in rows]
    except Exception as e:
        logger.debug(f"fetch_realms fallback: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
    return []


def fetch_map_by_id(
    use_sqlalchemy: bool,
    db_service: Any,
    map_id: str,
    seed_variant: str = "seed_a",
    floor: int = 1,
    lang: str | None = None,
) -> dict[str, Any] | None:
    """Retrieve detailed map info for one map.

    `map_id` keeps its name because it is the route parameter, but the string
    key it used to hold is gone: `map_realms.map_id` spelled out the callout
    provider, the realm and the map name, all three of which are columns on the
    same row. A value that parses as an integer is the primary key; anything
    else is matched against `name`, case-insensitively and with underscores or
    hyphens read as spaces, because the 58 map names are unique and are the
    only human-readable handle left.

    `seed_variant` and `floor` are echoed back untouched. They used to select a
    row set out of `map_tiles`/`map_objectives`; those tables are gone, so they
    now only travel through to the response so its shape is unchanged.
    """
    clean_id = (map_id or "").strip()
    try:
        map_pk: int | None = int(clean_id)
    except (TypeError, ValueError):
        map_pk = None
    spaced_name = clean_id.lower().replace("_", " ").replace("-", " ").strip()

    if use_sqlalchemy:
        try:
            if current_app:
                if map_pk is not None:
                    stmt = select(MapRealm).where(MapRealm.id == map_pk)
                else:
                    stmt = select(MapRealm).where(
                        or_(
                            func.lower(MapRealm.name) == clean_id.lower(),
                            func.lower(MapRealm.name) == spaced_name,
                        )
                    )
                m = db.session.scalars(stmt).unique().first()
                if m:
                    d = m.to_dict(lang=lang)
                    d["seed_variant"] = seed_variant
                    d["floor"] = floor
                    return d
        except Exception as e:
            logger.debug(f"SQLAlchemy get_map_by_id fallback: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass

    # No seeding on the read path: an empty table means the static seeder has
    # not run yet, and inventing six placeholder maps to fill the gap is what
    # used to collide with the real ids in maps.json.
    conn = db_service.get_connection()
    cursor = conn.cursor()

    # Same join the list query above does: the realm name and the source code
    # and label are rows in `realms` / `map_sources` now, not columns on the map.
    # `map_realms.map_id` is gone, so the lookup keys off the primary key when
    # the route parameter is numeric and off the unique map name otherwise.
    base_query = (
        "SELECT mr.*, r.name AS realm_name, "
        "ms.code AS source_code, ms.label AS source_label "
        "FROM map_realms mr "
        "LEFT JOIN realms r ON r.id = mr.realm_id "
        "LEFT JOIN map_sources ms ON ms.id = mr.source_id "
    )
    if map_pk is not None:
        cursor.execute(base_query + "WHERE mr.id = ?", (map_pk,))
    else:
        cursor.execute(
            base_query + "WHERE LOWER(mr.name) IN (?, ?)",
            (clean_id.lower(), spaced_name),
        )
    realm_row = cursor.fetchone()
    conn.close()

    if not realm_row:
        # No placeholder fallback: a map that is not in the table does not
        # exist, and pretending otherwise is what put six invented maps in
        # front of users whenever seeding had not finished.
        return None
    else:
        map_info = {
            # `map_realms.map_id` is gone; `id` on the wire is the integer
            # primary key, the same key name the payload always used.
            "id": realm_row["id"],
            "name": realm_row["name"],
            "realm": realm_row["realm_name"] or "",
            "realm_id": realm_row["realm_id"],
            "source_id": realm_row["source_id"],
            "source": realm_row["source_code"] or DEFAULT_SOURCE_CODE,
            "source_label": realm_row["source_label"] or DEFAULT_SOURCE_LABEL,
            # Not columns any more -- they held one value each across all 58
            # rows. Same values, served from the model's defaults.
            "layout_type": DEFAULT_LAYOUT_TYPE,
            "jungle_gyms_count": DEFAULT_JUNGLE_GYMS,
            "totem_spawns_count": DEFAULT_TOTEM_SPAWNS,
            "pallet_density": DEFAULT_PALLET_DENSITY,
            "shack_has_basement": DEFAULT_SHACK_HAS_BASEMENT,
            "description": realm_row["description"],
            # One stored URL, two names on the wire.
            "image_url": realm_row["callout_image_url"],
        }

    result = dict(map_info)
    result["seed_variant"] = seed_variant
    result["floor"] = floor
    # `map_tiles` and `map_objectives` are gone, and with them the seed-variant
    # and floor lookups that used to fill these four keys. Neither table held
    # anything: `map_objectives` was empty for all 58 maps, and the 290
    # `map_tiles` rows were five generic placeholder names copied onto every
    # map, which the frontend's own `utils/mapLandmarks.ts` supersedes. The keys
    # stay, empty, because `MapRealm.to_dict` emits them and clients read them.
    result["tiles"] = []
    result["objectives"] = []
    result["totem_spawns"] = []
    result["key_tiles"] = []

    return result
