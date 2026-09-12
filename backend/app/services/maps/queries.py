# backend/app/services/maps/queries.py
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import MapRealm, Realm
from app.services.maps.seeder import seed_maps_if_empty

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
                stmt = select(MapRealm).options(
                    joinedload(MapRealm.tiles),
                    joinedload(MapRealm.objectives),
                )
                if realm and realm.lower() != "all":
                    stmt = stmt.where(func.lower(MapRealm.realm) == realm.lower())
                if source and source.lower() != "all":
                    stmt = stmt.where(func.lower(MapRealm.source) == source.lower())
                if search and search.strip():
                    term = f"%{search.strip().lower()}%"
                    stmt = stmt.where(
                        or_(
                            func.lower(MapRealm.name).ilike(term),
                            func.lower(MapRealm.realm).ilike(term),
                        )
                    )
                stmt = stmt.order_by(MapRealm.name.asc())
                rows = db.session.scalars(stmt).unique().all()
                # Only fall through to the legacy seed path if the table is fully unseeded.
                table_has_any_rows = rows or db.session.scalar(select(MapRealm.map_id).limit(1)) is not None
                if table_has_any_rows:
                    return [r.to_dict(lang=lang) for r in rows]
        except Exception as e:
            logger.debug(f"SQLAlchemy get_maps fallback: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass

    conn = db_service.get_connection()
    seed_maps_if_empty(conn, db_service)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(map_realms);")
    cols = {row[1] for row in cursor.fetchall()}

    query = "SELECT * FROM map_realms WHERE 1=1"
    params = []

    if realm and realm != "All":
        query += " AND LOWER(realm) = LOWER(?)"
        params.append(realm)
    if source and source != "all" and "source" in cols:
        query += " AND LOWER(source) = LOWER(?)"
        params.append(source)
    if search:
        query += " AND (LOWER(name) LIKE ? OR LOWER(realm) LIKE ?)"
        term = f"%{search.lower()}%"
        params.extend([term, term])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    maps = []
    for r in rows:
        maps.append({
            "id": r["map_id"],
            "name": r["name"],
            "realm": r["realm"],
            "source": r["source"] if "source" in r.keys() else "hens333",
            "source_label": r["source_label"] if "source_label" in r.keys() else "Hens333 12-Clock Callouts",
            "layout_type": r["layout_type"],
            "jungle_gyms_count": r["jungle_gyms_count"],
            "totem_spawns_count": r["totem_spawns_count"],
            "pallet_density": r["pallet_density"],
            "shack_has_basement": bool(r["shack_has_basement"]),
            "description": r["description"],
            "image_url": r["image_url"],
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

