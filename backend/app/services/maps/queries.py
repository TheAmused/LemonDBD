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


# `fetch_map_by_id` lived here, backing `GET /api/v1/maps/<map_id>`. develop
# removed that endpoint in the same pass that deleted `utils/mapLandmarks.ts`,
# and it is consistent: the detail it returned was `tiles` and `objectives`,
# both of which are permanently empty now that `map_tiles` and `map_objectives`
# are dropped. Nothing in the frontend called it. `fetch_maps` already returns
# every field a single map has.
