import json
from app.services.db_service import DatabaseService

SAMPLE_MAPS = [
    {
        "id": "coal_tower",
        "name": "Coal Tower",
        "realm": "The MacMillan Estate",
        "layout_type": "Asymmetrical Open",
        "jungle_gyms_count": 4,
        "totem_spawns_count": 5,
        "pallet_density": "High (12-14 Pallets)",
        "shack_has_basement": True,
        "description": "A classic balanced map featuring a two-story central tower main building and strong Jungle Gym loops.",
        "image_url": "/static/maps/coal_tower.png"
    },
    {
        "id": "azarov_resting_place",
        "name": "Azarov's Resting Place",
        "realm": "Autohaven Wreckers",
        "layout_type": "Dumbbell Narrow",
        "jungle_gyms_count": 5,
        "totem_spawns_count": 5,
        "pallet_density": "High (14-16 Pallets)",
        "shack_has_basement": False,
        "description": "Iconic dumbbell-shaped map with narrow middle choke point separating main garage and killer shack.",
        "image_url": "/static/maps/azarov.png"
    },
    {
        "id": "thompson_house",
        "name": "Thompson House",
        "realm": "Coldwind Farm",
        "layout_type": "Open Cornfield",
        "jungle_gyms_count": 4,
        "totem_spawns_count": 5,
        "pallet_density": "Medium (11-13 Pallets)",
        "shack_has_basement": True,
        "description": "Massive central house surrounded by tall cornfield tiles offering high line-of-sight concealment.",
        "image_url": "/static/maps/thompson_house.png"
    },
    {
        "id": "treatment_theatre",
        "name": "Treatment Theatre",
        "realm": "Léry's Memorial Institute",
        "layout_type": "Indoor Grid",
        "jungle_gyms_count": 6,
        "totem_spawns_count": 5,
        "pallet_density": "Very High (16-18 Pallets)",
        "shack_has_basement": False,
        "description": "Dense indoor hospital grid with high vault window density and central shock treatment operating room.",
        "image_url": "/static/maps/lerys.png"
    },
    {
        "id": "rpd_east",
        "name": "RPD East Wing",
        "realm": "Raccoon City Police Station",
        "layout_type": "Indoor Two-Story",
        "jungle_gyms_count": 3,
        "totem_spawns_count": 5,
        "pallet_density": "High (13-15 Pallets)",
        "shack_has_basement": False,
        "description": "Intricate multi-story police department featuring main hall, helicopter crash site, and narrow corridors.",
        "image_url": "/static/maps/rpd.png"
    },
    {
        "id": "midwich",
        "name": "Midwich Elementary School",
        "realm": "Silent Hill",
        "layout_type": "Indoor Square Courtyard",
        "jungle_gyms_count": 4,
        "totem_spawns_count": 5,
        "pallet_density": "Medium (10-12 Pallets)",
        "shack_has_basement": False,
        "description": "Square two-story nightmare school surrounding a central courtyard with secret clocktower hatch logic.",
        "image_url": "/static/maps/midwich.png"
    }
]

DEFAULT_TILES_SEED_A = [
    {
        "name": "Killer Shack",
        "type": "shack",
        "x": 22.0,
        "y": 28.0,
        "has_pallet": True,
        "pallet_safety_rating": "god",
        "has_window": True,
        "vault_directions": json.dumps(["East"]),
        "looping_tips": "Hug outer wall tightly. Fast-vault window to reset distance, and only drop the Shack Pallet when committed by killer.",
        "mindgame_counter": "Killer can hide red stain inside doorway to fake a window vault check."
    },
    {
        "name": "Main Building (Coal Tower)",
        "type": "main",
        "x": 70.0,
        "y": 30.0,
        "has_pallet": True,
        "pallet_safety_rating": "safe",
        "has_window": True,
        "vault_directions": json.dumps(["North", "West"]),
        "looping_tips": "Utilize 2nd floor iron walkway vault. Drop to ground floor to break line of sight and chain to jungle gyms.",
        "mindgame_counter": "Listen carefully to footsteps on iron stairs and watch for moonwalks near outer doorway."
    },
    {
        "name": "Jungle Gym Alpha",
        "type": "gym",
        "x": 45.0,
        "y": 75.0,
        "has_pallet": True,
        "pallet_safety_rating": "safe",
        "has_window": True,
        "vault_directions": json.dumps(["South"]),
        "looping_tips": "Run outer long wall counter-clockwise to ensure perpendicular fast-vault angle.",
        "mindgame_counter": "Killer can hide red stain behind center high wall pillar."
    },
    {
        "name": "LT Wall Beta",
        "type": "lt_wall",
        "x": 20.0,
        "y": 65.0,
        "has_pallet": False,
        "pallet_safety_rating": None,
        "has_window": True,
        "vault_directions": json.dumps(["West", "East"]),
        "looping_tips": "React to killer red stain at corner junction before selecting L-window or T-window.",
        "mindgame_counter": "Killer can fake direction at corner to catch vault animation."
    },
    {
        "name": "Outer Debris Loop",
        "type": "filler",
        "x": 80.0,
        "y": 70.0,
        "has_pallet": True,
        "pallet_safety_rating": "mindgameable",
        "has_window": False,
        "vault_directions": json.dumps([]),
        "looping_tips": "Short wood pile loop. Pre-drop pallet if killer is gaining Bloodlust.",
        "mindgame_counter": "Killer can double-back over low crate pile."
    },
    {
        "name": "Wrecked Truck",
        "type": "filler",
        "x": 50.0,
        "y": 20.0,
        "has_pallet": True,
        "pallet_safety_rating": "unsafe",
        "has_window": False,
        "vault_directions": json.dumps([]),
        "looping_tips": "Very short loop with low vision blocking. Drop quickly for stun or abandon tile.",
        "mindgame_counter": "Killer can lunge easily over short hood wall."
    }
]

DEFAULT_OBJECTIVES_SEED_A = [
    {"type": "totem", "x": 20.0, "y": 30.0, "location_description": "Killer Shack Corner"},
    {"type": "totem", "x": 75.0, "y": 25.0, "location_description": "Main Building Stairwell"},
    {"type": "totem", "x": 50.0, "y": 80.0, "location_description": "Jungle Gym B Behind Tree"},
    {"type": "totem", "x": 15.0, "y": 70.0, "location_description": "LT Wall Debris"},
    {"type": "totem", "x": 85.0, "y": 65.0, "location_description": "Outer Perimeter Bush"},
    {"type": "generator", "x": 70.0, "y": 32.0, "location_description": "Main Building Ground Floor"},
    {"type": "generator", "x": 22.0, "y": 30.0, "location_description": "Shack Outside Wall"},
    {"type": "generator", "x": 45.0, "y": 70.0, "location_description": "Jungle Gym Alpha Center"},
    {"type": "generator", "x": 85.0, "y": 80.0, "location_description": "Perimeter Fence Hill"},
    {"type": "generator", "x": 15.0, "y": 15.0, "location_description": "North Corner Water Tower"},
    {"type": "generator", "x": 55.0, "y": 45.0, "location_description": "Central Field Debris"},
    {"type": "generator", "x": 85.0, "y": 20.0, "location_description": "East Gate Rocks"},
    {"type": "exit_gate", "x": 5.0, "y": 50.0, "location_description": "West Exit Gate"},
    {"type": "exit_gate", "x": 95.0, "y": 50.0, "location_description": "East Exit Gate"},
    {"type": "hatch", "x": 48.0, "y": 52.0, "location_description": "Center Field Hatch Spawn"},
    {"type": "chest", "x": 72.0, "y": 28.0, "location_description": "Main Building 2nd Floor Chest"},
    {"type": "chest", "x": 21.0, "y": 27.0, "location_description": "Basement Chest"},
    {"type": "chest", "x": 46.0, "y": 76.0, "location_description": "Jungle Gym Chest"},
    {"type": "basement", "x": 21.0, "y": 28.0, "location_description": "Killer Shack Basement"}
]


import logging
from typing import Optional, List, Dict, Any
from flask import current_app
from sqlalchemy import select, or_, func
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models import MapRealm, MapTile, MapObjective

logger = logging.getLogger(__name__)


class MapService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = (db_service is None)
        self.db_service = db_service or DatabaseService()

    def _seed_db_if_empty(self, conn):
        self.db_service.init_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM map_realms")
        count = cursor.fetchone()[0]

        if count == 0:
            for m in SAMPLE_MAPS:
                cursor.execute("""
                    INSERT INTO map_realms (map_id, name, realm, layout_type, jungle_gyms_count, totem_spawns_count, pallet_density, shack_has_basement, description, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    m["id"], m["name"], m["realm"], m.get("layout_type", ""),
                    m.get("jungle_gyms_count", 4), m.get("totem_spawns_count", 5),
                    m.get("pallet_density", ""), m.get("shack_has_basement", True),
                    m.get("description", ""), m.get("image_url", "")
                ))

                for seed in ["seed_a", "seed_b", "seed_c"]:
                    floors = [1, 2] if m["id"] in ["rpd_east", "midwich"] else [1]
                    for fl in floors:
                        for tile in DEFAULT_TILES_SEED_A:
                            cursor.execute("""
                                INSERT INTO map_tiles (map_id, seed_variant, floor, name, type, x, y, has_pallet, pallet_safety_rating, has_window, vault_directions, looping_tips, mindgame_counter)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                m["id"], seed, fl, tile["name"], tile["type"],
                                tile["x"], tile["y"], tile["has_pallet"], tile["pallet_safety_rating"],
                                tile["has_window"], tile["vault_directions"], tile["looping_tips"], tile["mindgame_counter"]
                            ))

                        for obj in DEFAULT_OBJECTIVES_SEED_A:
                            cursor.execute("""
                                INSERT INTO map_objectives (map_id, seed_variant, floor, type, x, y, location_description)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, (
                                m["id"], seed, fl, obj["type"], obj["x"], obj["y"], obj["location_description"]
                            ))

            conn.commit()

    def get_maps(self, realm=None, search=None, source=None) -> List[Dict[str, Any]]:
        if self._use_sqlalchemy:
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
                    if rows:
                        return [r.to_dict() for r in rows]
            except Exception as e:
                logger.debug(f"SQLAlchemy get_maps fallback: {e}")

        conn = self.db_service.get_connection()
        self._seed_db_if_empty(conn)
        cursor = conn.cursor()

        query = "SELECT * FROM map_realms WHERE 1=1"
        params = []

        if realm and realm != 'All':
            query += " AND LOWER(realm) = LOWER(?)"
            params.append(realm)
        if source and source != 'all':
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
                "source": r.get("source") if hasattr(r, "keys") and "source" in r.keys() else "hens333",
                "source_label": r.get("source_label") if hasattr(r, "keys") and "source_label" in r.keys() else "Hens333 12-Clock Callouts",
                "layout_type": r["layout_type"],
                "jungle_gyms_count": r["jungle_gyms_count"],
                "totem_spawns_count": r["totem_spawns_count"],
                "pallet_density": r["pallet_density"],
                "shack_has_basement": bool(r["shack_has_basement"]),
                "description": r["description"],
                "image_url": r["image_url"]
            })
        return maps

    def get_map_by_id(self, map_id, seed_variant="seed_a", floor=1):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    clean_id = (map_id or "").strip()
                    stmt = select(MapRealm).options(
                        joinedload(MapRealm.tiles),
                        joinedload(MapRealm.objectives),
                    ).where(
                        or_(
                            MapRealm.map_id == clean_id,
                            func.lower(MapRealm.map_id) == clean_id.lower(),
                            func.lower(MapRealm.name) == clean_id.lower().replace("_", " "),
                        )
                    )
                    m = db.session.scalars(stmt).unique().first()
                    if m:
                        d = m.to_dict()
                        d["seed_variant"] = seed_variant
                        d["floor"] = floor
                        return d
            except Exception as e:
                logger.debug(f"SQLAlchemy get_map_by_id fallback: {e}")

        conn = self.db_service.get_connection()
        self._seed_db_if_empty(conn)
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
                "source": realm_row.get("source") if hasattr(realm_row, "keys") and "source" in realm_row.keys() else "hens333",
                "source_label": realm_row.get("source_label") if hasattr(realm_row, "keys") and "source_label" in realm_row.keys() else "Hens333 12-Clock Callouts",
                "layout_type": realm_row["layout_type"],
                "jungle_gyms_count": realm_row["jungle_gyms_count"],
                "totem_spawns_count": realm_row["totem_spawns_count"],
                "pallet_density": realm_row["pallet_density"],
                "shack_has_basement": bool(realm_row["shack_has_basement"]),
                "description": realm_row["description"],
                "image_url": realm_row["image_url"]
            }

        # Query map_tiles
        cursor.execute(
            "SELECT * FROM map_tiles WHERE map_id = ? AND seed_variant = ? AND floor = ?",
            (map_id, seed_variant, floor)
        )
        tile_rows = cursor.fetchall()
        if not tile_rows:
            cursor.execute("SELECT * FROM map_tiles WHERE map_id = ?", (map_id,))
            tile_rows = cursor.fetchall()

        tiles = []
        for r in tile_rows:
            v_dirs = r["vault_directions"]
            if isinstance(v_dirs, str):
                try:
                    v_dirs = json.loads(v_dirs)
                except Exception:
                    v_dirs = []
            tiles.append({
                "id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "x": r["x"],
                "y": r["y"],
                "has_pallet": bool(r["has_pallet"]),
                "pallet_safety_rating": r["pallet_safety_rating"],
                "has_window": bool(r["has_window"]),
                "vault_directions": v_dirs if v_dirs is not None else [],
                "looping_tips": r["looping_tips"] or "",
                "mindgame_counter": r["mindgame_counter"] or "",
                "seed_variant": r["seed_variant"],
                "floor": r["floor"]
            })

        # Query map_objectives
        cursor.execute(
            "SELECT * FROM map_objectives WHERE map_id = ? AND seed_variant = ? AND floor = ?",
            (map_id, seed_variant, floor)
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
                "floor": r["floor"]
            })

        conn.close()

        result = dict(map_info)
        result["seed_variant"] = seed_variant
        result["floor"] = floor
        result["tiles"] = tiles
        result["objectives"] = objectives

        # Compatibility fields
        totems = [obj for obj in objectives if obj["type"] == "totem"]
        result["totem_spawns"] = [
            {"id": t["id"], "x": t["x"], "y": t["y"], "location": t["location_description"]}
            for t in totems
        ]
        result["key_tiles"] = [
            {"name": t["name"], "type": t["type"], "x": t["x"], "y": t["y"], "has_pallet": t["has_pallet"], "has_window": t["has_window"]}
            for t in tiles
        ]

        return result
