# backend/app/services/maps/queries.py
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models import MapRealm, Realm
from app.services.maps.data import SAMPLE_MAPS
from app.services.maps.seeder import seed_maps_if_empty
from app.services.translations.translation_service import SUPPORTED_LOCALES

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
                    conditions = [
                        func.lower(MapRealm.name).ilike(term),
                        func.lower(MapRealm.realm).ilike(term),
                    ]
                    for translated_lang in SUPPORTED_LOCALES:
                        if translated_lang == "en":
                            continue
                        conditions.append(
                            func.lower(MapRealm.translations[translated_lang]["name"].astext).ilike(term)
                        )
                        conditions.append(
                            func.lower(MapRealm.translations[translated_lang]["realm"].astext).ilike(term)
                        )
                    stmt = stmt.where(or_(*conditions))
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


def fetch_map_by_id(
    use_sqlalchemy: bool,
    db_service: Any,
    map_id: str,
    seed_variant: str = "seed_a",
    floor: int = 1,
    lang: str | None = None,
) -> dict[str, Any] | None:
    """Retrieve detailed map info including tiles and objective coordinates."""
    if use_sqlalchemy:
        try:
            if current_app:
                clean_id = (map_id or "").strip()
                stmt = (
                    select(MapRealm)
                    .options(
                        joinedload(MapRealm.tiles),
                        joinedload(MapRealm.objectives),
                    )
                    .where(
                        or_(
                            MapRealm.map_id == clean_id,
                            func.lower(MapRealm.map_id) == clean_id.lower(),
                            func.lower(MapRealm.name) == clean_id.lower().replace("_", " "),
                        )
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

    conn = db_service.get_connection()
    seed_maps_if_empty(conn, db_service)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM map_realms WHERE map_id = ?", (map_id,))
    realm_row = cursor.fetchone()

    if not realm_row:
        map_info = next((m for m in SAMPLE_MAPS if m["id"] == map_id), None)
        if not map_info:
            conn.close()
            return None
    else:
        map_info = {
            "id": realm_row["map_id"],
            "name": realm_row["name"],
            "realm": realm_row["realm"],
            "source": realm_row["source"] if "source" in realm_row.keys() else "hens333",
            "source_label": realm_row["source_label"] if "source_label" in realm_row.keys() else "Hens333 12-Clock Callouts",
            "layout_type": realm_row["layout_type"],
            "jungle_gyms_count": realm_row["jungle_gyms_count"],
            "totem_spawns_count": realm_row["totem_spawns_count"],
            "pallet_density": realm_row["pallet_density"],
            "shack_has_basement": bool(realm_row["shack_has_basement"]),
            "description": realm_row["description"],
            "image_url": realm_row["image_url"],
        }

    cursor.execute(
        "SELECT * FROM map_tiles WHERE map_id = ? AND seed_variant = ? AND floor = ?",
        (map_id, seed_variant, floor),
    )
    tile_rows = cursor.fetchall()
    if not tile_rows:
        cursor.execute("SELECT * FROM map_tiles WHERE map_id = ?", (map_id,))
        tile_rows = cursor.fetchall()

    tiles = []
    for r in tile_rows:
        v_dirs = safe_json_loads(r["vault_directions"], default=[]) if isinstance(r["vault_directions"], str) else (r["vault_directions"] or [])
        tiles.append({
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "x": r["x"],
            "y": r["y"],
            "has_pallet": bool(r["has_pallet"]),
            "pallet_safety_rating": r["pallet_safety_rating"],
            "has_window": bool(r["has_window"]),
            "vault_directions": v_dirs,
            "looping_tips": r["looping_tips"] or "",
            "mindgame_counter": r["mindgame_counter"] or "",
            "seed_variant": r["seed_variant"],
            "floor": r["floor"],
        })

    cursor.execute(
        "SELECT * FROM map_objectives WHERE map_id = ? AND seed_variant = ? AND floor = ?",
        (map_id, seed_variant, floor),
    )
    obj_rows = cursor.fetchall()
    if not obj_rows:
        cursor.execute("SELECT * FROM map_objectives WHERE map_id = ?", (map_id,))
        obj_rows = cursor.fetchall()

    objectives = []
    for r in obj_rows:
        objectives.append({
            "id": r["id"],
            "type": r["type"],
            "x": r["x"],
            "y": r["y"],
            "location_description": r["location_description"],
            "seed_variant": r["seed_variant"],
            "floor": r["floor"],
        })

    conn.close()

    result = dict(map_info)
    result["seed_variant"] = seed_variant
    result["floor"] = floor
    result["tiles"] = tiles
    result["objectives"] = objectives

    totems = [obj for obj in objectives if obj["type"] == "totem"]
    result["totem_spawns"] = [
        {"id": t["id"], "x": t["x"], "y": t["y"], "location": t["location_description"]}
        for t in totems
    ]
    result["key_tiles"] = [
        {
            "name": t["name"],
            "type": t["type"],
            "x": t["x"],
            "y": t["y"],
            "has_pallet": t["has_pallet"],
            "has_window": t["has_window"],
        }
        for t in tiles
    ]

    return result
