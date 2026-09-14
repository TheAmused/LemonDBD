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
                table_has_any_rows = rows or db.session.scalar(select(MapRealm.id).limit(1)) is not None
                if table_has_any_rows:
                    return [r.to_dict(lang=lang) for r in rows]
        except Exception as e:
            logger.debug(f"SQLAlchemy get_maps fallback: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass

    conn = db_service.get_connection()
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(map_realms);")
    cols = {row[1] for row in cursor.fetchall()}

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
        row_keys = r.keys()
        maps.append({
            "id": r["id"],
            "name": r["name"],
            "realm": r["realm_name"] if "realm_name" in row_keys else "",
            "realm_id": r["realm_id"],
            "source_id": r["source_id"],
            "source": r["source_code"] or DEFAULT_SOURCE_CODE,
            "source_label": r["source_label"] or DEFAULT_SOURCE_LABEL,
            "layout_type": (
                r["layout_type"]
                if "layout_type" in row_keys and r["layout_type"] is not None
                else DEFAULT_LAYOUT_TYPE
            ),
            "jungle_gyms_count": (
                r["jungle_gyms_count"]
                if "jungle_gyms_count" in row_keys and r["jungle_gyms_count"] is not None
                else DEFAULT_JUNGLE_GYMS
            ),
            "totem_spawns_count": (
                r["totem_spawns_count"]
                if "totem_spawns_count" in row_keys and r["totem_spawns_count"] is not None
                else DEFAULT_TOTEM_SPAWNS
            ),
            "pallet_density": (
                r["pallet_density"]
                if "pallet_density" in row_keys and r["pallet_density"] is not None
                else DEFAULT_PALLET_DENSITY
            ),
            "shack_has_basement": (
                bool(r["shack_has_basement"])
                if "shack_has_basement" in row_keys and r["shack_has_basement"] is not None
                else DEFAULT_SHACK_HAS_BASEMENT
            ),
            "size_sq_tiles": r["size_sq_tiles"] if "size_sq_tiles" in row_keys else None,
            "size_sq_meters": r["size_sq_meters"] if "size_sq_meters" in row_keys else None,
            "description": r["description"],
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