### backend/app/services/history/__init__.py
```python
from app.services.history.stats import fetch_history_user_stats

__all__ = [
    "fetch_history_user_stats",
]
```

### backend/app/services/history/roster.py
```python
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.ownership_service import OwnershipService

ROW_SIZE = 5


def build_rows(owned_killer_names: list[str]) -> list[list[str]]:
    return [
        owned_killer_names[i:i + ROW_SIZE]
        for i in range(0, len(owned_killer_names), ROW_SIZE)
    ]


def _release_key(character: dict[str, Any]):
    release_number = character.get("release_number")
    return release_number if release_number is not None else float("inf")


def get_owned_killer_names_by_release(user_id: int, ownership_service: OwnershipService) -> list[str]:
    owned = [
        c for c in ownership_service.get_user_characters(user_id, role="Killer")
        if c["is_owned"] and not c.get("is_disabled")
    ]
    owned.sort(key=_release_key)
    return [c["name"] for c in owned]


def get_owned_killer_ids_by_release(user_id: int, ownership_service: OwnershipService) -> list[int]:
    """Same release-order filtering as get_owned_killer_names_by_release,
    but keyed by the killer's stable id."""
    owned = [
        c for c in ownership_service.get_user_characters(user_id, role="Killer")
        if c["is_owned"] and not c.get("is_disabled")
    ]
    owned.sort(key=_release_key)
    return [c["id"] for c in owned]


def resolve_killer_names_by_ids(ids: list[int]) -> list[str]:
    """Turns a frozen killer id list back into current names, in release order."""
    if not ids:
        return []
    rows = db.session.scalars(select(Character).where(Character.id.in_(ids))).all()
    by_id = {c.id: c.name for c in rows}
    return [by_id[i] for i in ids if i in by_id]


def get_general_killer_perk_names() -> list[str]:
    stmt = select(Perk.name).where(
        Perk.category == "Killer",
        (Perk.character_id.is_(None)) | (Perk.is_generic_counterpart.is_(True)),
        Perk.is_disabled.is_(False),
    )
    return list(db.session.scalars(stmt).all())


def get_killer_teachable_perk_names(killer_name: str) -> list[str]:
    character = db.session.scalars(
        select(Character).where(Character.name == killer_name)
    ).first()
    if not character:
        return []
    stmt = select(Perk.name).where(
        Perk.character_id == character.id, Perk.is_teachable.is_(True), Perk.is_disabled.is_(False)
    )
    return list(db.session.scalars(stmt).all())
```

### backend/app/services/history/stats.py
```python
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.models import HistoryMatchLog, HistoryRun
from app.services.streak_stats import fetch_streak_stats


def fetch_history_user_stats(user_id: int, mode: str) -> dict[str, Any]:
    run_ids = db.session.scalars(
        select(HistoryRun.id).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
    ).all()
    return fetch_streak_stats(run_ids, HistoryMatchLog)
```

### backend/app/services/maps/__init__.py
```python
from app.services.maps.data import (
    DEFAULT_OBJECTIVES_SEED_A,
    DEFAULT_TILES_SEED_A,
    SAMPLE_MAPS,
)
from app.services.maps.queries import fetch_map_by_id, fetch_maps
from app.services.maps.seeder import seed_maps_if_empty

__all__ = [
    "SAMPLE_MAPS",
    "DEFAULT_TILES_SEED_A",
    "DEFAULT_OBJECTIVES_SEED_A",
    "seed_maps_if_empty",
    "fetch_maps",
    "fetch_map_by_id",
]
```

### backend/app/services/maps/data.py
```python
from typing import Any
from app.core.json_provider import safe_json_dumps

SAMPLE_MAPS: list[dict[str, Any]] = [
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
        "image_url": "/static/maps/coal_tower.png",
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
        "image_url": "/static/maps/azarov.png",
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
        "image_url": "/static/maps/thompson_house.png",
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
        "image_url": "/static/maps/lerys.png",
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
        "image_url": "/static/maps/rpd.png",
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
        "image_url": "/static/maps/midwich.png",
    },
]

DEFAULT_TILES_SEED_A: list[dict[str, Any]] = [
    {
        "name": "Killer Shack",
        "type": "shack",
        "x": 22.0,
        "y": 28.0,
        "has_pallet": True,
        "pallet_safety_rating": "god",
        "has_window": True,
        "vault_directions": safe_json_dumps(["East"]),
        "looping_tips": "Hug outer wall tightly. Fast-vault window to reset distance, and only drop the Shack Pallet when committed by killer.",
        "mindgame_counter": "Killer can hide red stain inside doorway to fake a window vault check.",
    },
    {
        "name": "Main Building (Coal Tower)",
        "type": "main",
        "x": 70.0,
        "y": 30.0,
        "has_pallet": True,
        "pallet_safety_rating": "safe",
        "has_window": True,
        "vault_directions": safe_json_dumps(["North", "West"]),
        "looping_tips": "Utilize 2nd floor iron walkway vault. Drop to ground floor to break line of sight and chain to jungle gyms.",
        "mindgame_counter": "Listen carefully to footsteps on iron stairs and watch for moonwalks near outer doorway.",
    },
    {
        "name": "Jungle Gym Alpha",
        "type": "gym",
        "x": 45.0,
        "y": 75.0,
        "has_pallet": True,
        "pallet_safety_rating": "safe",
        "has_window": True,
        "vault_directions": safe_json_dumps(["South"]),
        "looping_tips": "Run outer long wall counter-clockwise to ensure perpendicular fast-vault angle.",
        "mindgame_counter": "Killer can hide red stain behind center high wall pillar.",
    },
    {
        "name": "LT Wall Beta",
        "type": "lt_wall",
        "x": 20.0,
        "y": 65.0,
        "has_pallet": False,
        "pallet_safety_rating": None,
        "has_window": True,
        "vault_directions": safe_json_dumps(["West", "East"]),
        "looping_tips": "React to killer red stain at corner junction before selecting L-window or T-window.",
        "mindgame_counter": "Killer can fake direction at corner to catch vault animation.",
    },
    {
        "name": "Outer Debris Loop",
        "type": "filler",
        "x": 80.0,
        "y": 70.0,
        "has_pallet": True,
        "pallet_safety_rating": "mindgameable",
        "has_window": False,
        "vault_directions": safe_json_dumps([]),
        "looping_tips": "Short wood pile loop. Pre-drop pallet if killer is gaining Bloodlust.",
        "mindgame_counter": "Killer can double-back over low crate pile.",
    },
    {
        "name": "Wrecked Truck",
        "type": "filler",
        "x": 50.0,
        "y": 20.0,
        "has_pallet": True,
        "pallet_safety_rating": "unsafe",
        "has_window": False,
        "vault_directions": safe_json_dumps([]),
        "looping_tips": "Very short loop with low vision blocking. Drop quickly for stun or abandon tile.",
        "mindgame_counter": "Killer can lunge easily over short hood wall.",
    },
]

DEFAULT_OBJECTIVES_SEED_A: list[dict[str, Any]] = [
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
    {"type": "basement", "x": 21.0, "y": 28.0, "location_description": "Killer Shack Basement"},
]
```

### backend/app/services/maps/queries.py
```python
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models import MapRealm
from app.services.maps.data import SAMPLE_MAPS
from app.services.maps.seeder import seed_maps_if_empty

logger = logging.getLogger(__name__)


def fetch_maps(
    use_sqlalchemy: bool,
    db_service: Any,
    realm: str | None = None,
    search: str | None = None,
    source: str | None = None,
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
                if rows:
                    return [r.to_dict() for r in rows]
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


def fetch_map_by_id(
    use_sqlalchemy: bool,
    db_service: Any,
    map_id: str,
    seed_variant: str = "seed_a",
    floor: int = 1,
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
                    d = m.to_dict()
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
```

### backend/app/services/maps/seeder.py
```python
import sqlite3
from typing import Any
from app.services.maps.data import (
    DEFAULT_OBJECTIVES_SEED_A,
    DEFAULT_TILES_SEED_A,
    SAMPLE_MAPS,
)


def seed_maps_if_empty(conn: sqlite3.Connection, db_service: Any) -> None:
    """Seeds baseline maps, multi-seed tiles, and landmark objectives into SQLite if empty."""
    db_service.init_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM map_realms")
    count = cursor.fetchone()[0]

    if count == 0:
        for m in SAMPLE_MAPS:
            cursor.execute(
                """
                INSERT INTO map_realms (map_id, name, realm, source, source_label, layout_type, jungle_gyms_count, totem_spawns_count, pallet_density, shack_has_basement, description, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    m["id"],
                    m["name"],
                    m["realm"],
                    m.get("source", "hens333"),
                    m.get("source_label", "Hens333 12-Clock Callouts"),
                    m.get("layout_type", ""),
                    m.get("jungle_gyms_count", 4),
                    m.get("totem_spawns_count", 5),
                    m.get("pallet_density", ""),
                    m.get("shack_has_basement", True),
                    m.get("description", ""),
                    m.get("image_url", ""),
                ),
            )

            for seed in ["seed_a", "seed_b", "seed_c"]:
                floors = [1, 2] if m["id"] in ["rpd_east", "midwich"] else [1]
                for fl in floors:
                    for tile in DEFAULT_TILES_SEED_A:
                        cursor.execute(
                            """
                            INSERT INTO map_tiles (map_id, seed_variant, floor, name, type, x, y, has_pallet, pallet_safety_rating, has_window, vault_directions, looping_tips, mindgame_counter)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                m["id"],
                                seed,
                                fl,
                                tile["name"],
                                tile["type"],
                                tile["x"],
                                tile["y"],
                                tile["has_pallet"],
                                tile["pallet_safety_rating"],
                                tile["has_window"],
                                tile["vault_directions"],
                                tile["looping_tips"],
                                tile["mindgame_counter"],
                            ),
                        )

                    for obj in DEFAULT_OBJECTIVES_SEED_A:
                        cursor.execute(
                            """
                            INSERT INTO map_objectives (map_id, seed_variant, floor, type, x, y, location_description)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                m["id"],
                                seed,
                                fl,
                                obj["type"],
                                obj["x"],
                                obj["y"],
                                obj["location_description"],
                            ),
                        )

        conn.commit()
```

### backend/app/services/others/__init__.py
```python
from .draft_service import DraftService
from .quest_service import QuestService
from .killer_calc_service import KillerCalcService, calculate_killer_calc
from .build_service import BuildService
from .custom_perk_service import CustomPerkService
from .guesser_service import GuesserService

__all__ = [
    "DraftService",
    "QuestService",
    "KillerCalcService",
    "calculate_killer_calc",
    "BuildService",
    "CustomPerkService",
    "GuesserService",
]
```

### backend/app/services/others/build_service.py
```python
import logging
from flask import current_app
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps, safe_json_loads
from app.models import CommunityBuild
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)

DEFAULT_BUILDS = [
    {
        "title": "Otzdarva's Ultimate Huntress",
        "description": "High pressure ranged sniper Huntress loadout refined by Otzdarva for consistent trial victories.",
        "role": "killer",
        "category": "otzdarva",
        "character_id": "huntress",
        "perks": ["Barbecue & Chilli", "I'm All Ears", "Scourge Hook: Pain Resonance", "Lethal Pursuer"],
        "upvotes": 342,
        "author": "Otzdarva",
    },
    {
        "title": "Meta Survivor Chase Build",
        "description": "Maximum chase longevity and exhaustion recovery loadout designed for high MMR trials.",
        "role": "survivor",
        "category": "meta",
        "character_id": "meg_thomas",
        "perks": ["Sprint Burst", "Adrenaline", "Windows of Opportunity", "Resilience"],
        "upvotes": 289,
        "author": "Meta Analytics",
    },
    {
        "title": "Meme Head On Squad",
        "description": "Locker surprise stun combo engineered for maximum team coordination and hilarity.",
        "role": "survivor",
        "category": "meme",
        "character_id": "jane_romero",
        "perks": ["Head On", "Flashbang", "Quick & Quiet", "Deception"],
        "upvotes": 215,
        "author": "SwinySquad",
    },
    {
        "title": "Hex Dominator Trapper",
        "description": "Total map slowdown and trap lockdown powered by oppressive hex totem synergy.",
        "role": "killer",
        "category": "otzdarva",
        "character_id": "trapper",
        "perks": ["Hex: Ruin", "Hex: Undying", "Hex: Pentimento", "Corrupt Intervention"],
        "upvotes": 198,
        "author": "Otzdarva",
    },
    {
        "title": "Stealth Ninja Myers",
        "description": "Zero terror radius jumpscare Shape build engineered to catch survivors completely off guard.",
        "role": "killer",
        "category": "stealth",
        "character_id": "shape",
        "perks": ["Monitor & Abuse", "Tinkerer", "Discordance", "Play with Your Food"],
        "upvotes": 174,
        "author": "StalkerNinja",
    },
    {
        "title": "Gen Pressure Merchant",
        "description": "High regression and area surveillance loadout for supreme trial delay.",
        "role": "killer",
        "category": "meta",
        "character_id": "skull_merchant",
        "perks": ["Pop Goes the Weasel", "Scourge Hook: Pain Resonance", "Overcharge", "Nowhere to Hide"],
        "upvotes": 156,
        "author": "TrialDoctor",
    },
    {
        "title": "Aggressive Chase King",
        "description": "Relentless killer chase acceleration and vault speed stack for ultra fast downs.",
        "role": "killer",
        "category": "chase",
        "character_id": "wraith",
        "perks": ["Save the Best for Last", "Bamboozle", "Enduring", "Spirit Fury"],
        "upvotes": 142,
        "author": "FastDowns",
    },
]


class BuildService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def _init_table(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS community_builds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
                category TEXT NOT NULL CHECK (category IN ('otzdarva', 'meta', 'meme', 'stealth', 'chase')),
                character_id TEXT NOT NULL DEFAULT 'all',
                perks_json TEXT NOT NULL DEFAULT '[]',
                upvotes INTEGER NOT NULL DEFAULT 0,
                author TEXT NOT NULL DEFAULT 'Community',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        conn.close()

    def seed_builds_if_empty(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    count = db.session.scalar(select(func.count(CommunityBuild.id))) or 0
                    if count == 0:
                        for b in DEFAULT_BUILDS:
                            db.session.add(
                                CommunityBuild(
                                    title=b["title"],
                                    description=b["description"],
                                    role=b["role"].lower(),
                                    category=b["category"].lower(),
                                    character_id=b.get("character_id", "all"),
                                    perks_json=safe_json_dumps(b.get("perks", []), default_val="[]"),
                                    upvotes=b.get("upvotes", 0),
                                    author=b.get("author", "Community"),
                                )
                            )
                        db.session.commit()
                    return
            except Exception as e:
                logger.debug(f"SQLAlchemy seed_builds_if_empty fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM community_builds;")
        row = cursor.fetchone()
        count = row["count"] if row else 0
        if count == 0:
            for b in DEFAULT_BUILDS:
                cursor.execute("""
                    INSERT INTO community_builds (title, description, role, category, character_id, perks_json, upvotes, author)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    b["title"],
                    b["description"],
                    b["role"].lower(),
                    b["category"].lower(),
                    b.get("character_id", "all"),
                    safe_json_dumps(b.get("perks", []), default_val="[]"),
                    b.get("upvotes", 0),
                    b.get("author", "Community")
                ))
            conn.commit()
        conn.close()

    def get_builds(self, role=None, category=None, search=None, sort_by="upvotes"):
        self.seed_builds_if_empty()
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(CommunityBuild)
                    if role and role.lower() != "all":
                        stmt = stmt.where(func.lower(CommunityBuild.role) == role.lower())
                    if category and category.lower() != "all":
                        stmt = stmt.where(func.lower(CommunityBuild.category) == category.lower())
                    if search and search.strip():
                        pat = f"%{search.strip().lower()}%"
                        stmt = stmt.where(
                            or_(
                                func.lower(CommunityBuild.title).ilike(pat),
                                func.lower(CommunityBuild.description).ilike(pat),
                                func.lower(CommunityBuild.character_id).ilike(pat),
                                func.lower(CommunityBuild.author).ilike(pat),
                                func.lower(CommunityBuild.perks_json).ilike(pat),
                            )
                        )
                    if sort_by == "newest":
                        stmt = stmt.order_by(CommunityBuild.id.desc())
                    else:
                        stmt = stmt.order_by(CommunityBuild.upvotes.desc(), CommunityBuild.id.desc())

                    rows = db.session.scalars(stmt).all()
                    return [r.to_dict() for r in rows]
            except Exception as e:
                logger.debug(f"SQLAlchemy get_builds fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM community_builds WHERE 1=1"
        params = []

        if role:
            query += " AND LOWER(role) = LOWER(?)"
            params.append(role)

        if category:
            query += " AND LOWER(category) = LOWER(?)"
            params.append(category)

        if search:
            query += " AND (LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(character_id) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(perks_json) LIKE LOWER(?))"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

        if sort_by == "newest":
            query += " ORDER BY id DESC"
        else:
            query += " ORDER BY upvotes DESC, id DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        builds = []
        for r in rows:
            item = dict(r)
            item["perks"] = safe_json_loads(item.get("perks_json"), default=[])
            builds.append(item)

        return builds

    def get_build_by_id(self, build_id):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    b = db.session.get(CommunityBuild, int(build_id))
                    return b.to_dict() if b else None
            except Exception as e:
                logger.debug(f"SQLAlchemy get_build_by_id fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM community_builds WHERE id = ?;", (build_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        item = dict(row)
        item["perks"] = safe_json_loads(item.get("perks_json"), default=[])
        return item

    def create_build(self, title, description, role, category, perks, character_id="all", author="Community"):
        role_clean = (role or "").lower()
        if role_clean not in ["survivor", "killer"]:
            raise ValueError("Role must be 'survivor' or 'killer'.")

        category_clean = (category or "").lower()
        allowed_categories = ["otzdarva", "meta", "meme", "stealth", "chase"]
        if category_clean not in allowed_categories:
            category_clean = "meta"

        title_clean = (title or "").strip()
        if not title_clean:
            raise ValueError("Title is required.")

        perks_list = perks if isinstance(perks, list) else []
        perks_json = safe_json_dumps(perks_list, default_val="[]")

        if self._use_sqlalchemy:
            try:
                if current_app:
                    nb = CommunityBuild(
                        title=title_clean,
                        description=(description or "").strip(),
                        role=role_clean,
                        category=category_clean,
                        character_id=(character_id or "all").strip(),
                        perks_json=perks_json,
                        author=(author or "Community").strip(),
                        upvotes=0,
                    )
                    db.session.add(nb)
                    db.session.commit()
                    return nb.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy create_build fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO community_builds (title, description, role, category, character_id, perks_json, upvotes, author)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?);
        """, (
            title_clean,
            (description or "").strip(),
            role_clean,
            category_clean,
            (character_id or "all").strip(),
            perks_json,
            (author or "Community").strip()
        ))
        conn.commit()
        build_id = cursor.lastrowid
        conn.close()

        return self.get_build_by_id(build_id)

    def upvote_build(self, build_id):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    b = db.session.get(CommunityBuild, int(build_id))
                    if not b:
                        raise ValueError(f"Build with ID {build_id} not found.")
                    b.upvotes = (b.upvotes or 0) + 1
                    db.session.commit()
                    return b.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy upvote_build fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM community_builds WHERE id = ?;", (build_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Build with ID {build_id} not found.")

        cursor.execute("UPDATE community_builds SET upvotes = upvotes + 1 WHERE id = ?;", (build_id,))
        conn.commit()
        conn.close()

        return self.get_build_by_id(build_id)
```

### backend/app/services/others/custom_perk_service.py
```python
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import CustomPerk
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)

DEFAULT_CUSTOM_PERKS = [
    (
        "Hex: Shadow Veil",
        "killer",
        "The Wraith",
        "Iridescent",
        "hex_totem",
        "A Hex that cloaks the killer's terror radius while totem is active. When survivors get within 12 meters of the totem, their aura is revealed to the Killer for 4 seconds.",
        18,
        "EntityArchitect"
    ),
    (
        "Adrenaline Rush: Overdrive",
        "survivor",
        "Meg Thomas",
        "Very Rare",
        "sprint",
        "When all generators are powered, instantly heal one health state and gain 150% movement speed for 8 seconds. Causes **Exhausted** status effect for 40 seconds.",
        25,
        "SpeedDemon"
    ),
    (
        "Totem Whisperer",
        "survivor",
        "Mikaela Reid",
        "Uncommon",
        "totem_cleanse",
        "Hear auditory cues when near dull or hex totems within 16 meters. Cleansing totems takes 15% less time and reveals the Killer's aura for 3 seconds.",
        14,
        "WitchyVibes"
    ),
    (
        "Entity's Shadow",
        "killer",
        "The Trapper",
        "Iridescent",
        "entity_claws",
        "The Entity blocks all pallets within 24 meters of a hooked survivor for 15 seconds after hooking. Any survivor attempting to vault a blocked pallet screams and suffers **Hindered** for 5 seconds.",
        21,
        "FogLord"
    ),
]


class CustomPerkService:
    def __init__(self, db_service: DatabaseService | None = None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def init_table_and_seed(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    count = db.session.scalar(select(func.count(CustomPerk.id))) or 0
                    if count == 0:
                        for p in DEFAULT_CUSTOM_PERKS:
                            db.session.add(
                                CustomPerk(
                                    name=p[0],
                                    role=p[1],
                                    character_name=p[2],
                                    rarity=p[3],
                                    icon_preset=p[4],
                                    description=p[5],
                                    upvotes=p[6],
                                    author=p[7],
                                )
                            )
                        db.session.commit()
                    return
            except Exception as e:
                logger.debug(f"SQLAlchemy init_table_and_seed fallback: {e}")

        self.db_service.init_db()
        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM custom_perks")
        row = cursor.fetchone()
        if row and row["count"] == 0:
            logger.info("Seeding initial custom perk concepts into database...")
            cursor.executemany(
                """
                INSERT INTO custom_perks (name, role, character_name, rarity, icon_preset, description, upvotes, author)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                DEFAULT_CUSTOM_PERKS
            )
            conn.commit()

        conn.close()

    def get_custom_perks(
        self,
        role: str | None = None,
        rarity: str | None = None,
        search: str | None = None,
        sort_by: str = "newest",
    ) -> list[dict[str, Any]]:
        self.init_table_and_seed()
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(CustomPerk)
                    if role and role.lower() != "all":
                        stmt = stmt.where(func.lower(CustomPerk.role) == role.lower())
                    if rarity and rarity.lower() != "all":
                        stmt = stmt.where(func.lower(CustomPerk.rarity) == rarity.lower())
                    if search and search.strip():
                        pat = f"%{search.strip().lower()}%"
                        stmt = stmt.where(
                            or_(
                                func.lower(CustomPerk.name).ilike(pat),
                                func.lower(CustomPerk.description).ilike(pat),
                                func.lower(CustomPerk.character_name).ilike(pat),
                                func.lower(CustomPerk.author).ilike(pat),
                            )
                        )
                    if sort_by == "upvotes":
                        stmt = stmt.order_by(CustomPerk.upvotes.desc(), CustomPerk.created_at.desc())
                    else:
                        stmt = stmt.order_by(CustomPerk.created_at.desc(), CustomPerk.id.desc())

                    rows = db.session.scalars(stmt).all()
                    return [r.to_dict() for r in rows]
            except Exception as e:
                logger.debug(f"SQLAlchemy get_custom_perks fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM custom_perks WHERE 1=1"
        params = []

        if role:
            query += " AND LOWER(role) = LOWER(?)"
            params.append(role)

        if rarity:
            query += " AND LOWER(rarity) = LOWER(?)"
            params.append(rarity)

        if search:
            query += " AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(character_name) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?))"
            pattern = f"%{search}%"
            params.extend([pattern, pattern, pattern, pattern])

        if sort_by == "upvotes":
            query += " ORDER BY upvotes DESC, created_at DESC"
        else:
            query += " ORDER BY created_at DESC, id DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        results = [dict(r) for r in rows]
        conn.close()
        return results

    def create_custom_perk(
        self,
        name: str,
        role: str,
        character_name: str,
        rarity: str,
        icon_preset: str,
        description: str,
        author: str = "Community",
    ) -> dict[str, Any]:
        role_clean = role.lower() if role else "survivor"
        if role_clean not in ["survivor", "killer"]:
            role_clean = "survivor"

        rarities_valid = ["Iridescent", "Very Rare", "Uncommon"]
        rarity_matched = next((r for r in rarities_valid if r.lower() == rarity.lower()), "Very Rare")

        if self._use_sqlalchemy:
            try:
                if current_app:
                    cp = CustomPerk(
                        name=name.strip(),
                        role=role_clean,
                        character_name=character_name.strip() if character_name else "Teachable",
                        rarity=rarity_matched,
                        icon_preset=icon_preset.strip() if icon_preset else "sparkles",
                        description=description.strip(),
                        author=author.strip() if author else "Community",
                        upvotes=0,
                    )
                    db.session.add(cp)
                    db.session.commit()
                    return cp.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy create_custom_perk fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO custom_perks (name, role, character_name, rarity, icon_preset, description, upvotes, author)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                name.strip(),
                role_clean,
                character_name.strip() if character_name else "Teachable",
                rarity_matched,
                icon_preset.strip() if icon_preset else "sparkles",
                description.strip(),
                author.strip() if author else "Community"
            )
        )
        conn.commit()
        new_id = cursor.lastrowid

        cursor.execute("SELECT * FROM custom_perks WHERE id = ?", (new_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def upvote_custom_perk(self, perk_id: int) -> dict[str, Any] | None:
        if self._use_sqlalchemy:
            try:
                if current_app:
                    cp = db.session.get(CustomPerk, int(perk_id))
                    if not cp:
                        return None
                    cp.upvotes = (cp.upvotes or 0) + 1
                    db.session.commit()
                    return cp.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy upvote_custom_perk fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute("UPDATE custom_perks SET upvotes = upvotes + 1 WHERE id = ?", (perk_id,))
        if cursor.rowcount == 0:
            conn.close()
            return None

        conn.commit()
        cursor.execute("SELECT * FROM custom_perks WHERE id = ?", (perk_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
```

### backend/app/services/others/draft_service.py
```python
import logging
import uuid
from flask import current_app
from sqlalchemy import select

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps, safe_json_loads
from app.models import DraftSession
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)


class DraftService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def _init_table(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS draft_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT UNIQUE NOT NULL,
                phase TEXT NOT NULL DEFAULT 'bans' CHECK (phase IN ('bans', 'picks', 'complete')),
                banned_perks TEXT NOT NULL DEFAULT '[]',
                picked_survivor_perks TEXT NOT NULL DEFAULT '[]',
                picked_killer_perks TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        conn.close()

    def create_room(self, room_code=None):
        if not room_code:
            room_code = uuid.uuid4().hex[:6].upper()

        if self._use_sqlalchemy:
            try:
                if current_app:
                    existing = db.session.scalars(
                        select(DraftSession).where(DraftSession.room_code == room_code)
                    ).first()
                    if existing:
                        room_code = uuid.uuid4().hex[:6].upper()

                    ds = DraftSession(
                        room_code=room_code,
                        phase="bans",
                        banned_perks="[]",
                        picked_survivor_perks="[]",
                        picked_killer_perks="[]",
                    )
                    db.session.add(ds)
                    db.session.commit()
                    return ds.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy create_room fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM draft_sessions WHERE room_code = ?;", (room_code,))
        if cursor.fetchone():
            conn.close()
            room_code = uuid.uuid4().hex[:6].upper()
            conn = self.db_service.get_connection()
            cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO draft_sessions (room_code, phase, banned_perks, picked_survivor_perks, picked_killer_perks)
            VALUES (?, 'bans', '[]', '[]', '[]');
        """, (room_code,))
        conn.commit()
        conn.close()
        return self.get_room(room_code)

    def get_room(self, room_code):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    ds = db.session.scalars(
                        select(DraftSession).where(DraftSession.room_code == room_code)
                    ).first()
                    return ds.to_dict() if ds else None
            except Exception as e:
                logger.debug(f"SQLAlchemy get_room fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM draft_sessions WHERE room_code = ?;", (room_code,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None

        data = dict(row)
        data["banned_perks"] = safe_json_loads(data.get("banned_perks"), default=[])
        data["picked_survivor_perks"] = safe_json_loads(data.get("picked_survivor_perks"), default=[])
        data["picked_killer_perks"] = safe_json_loads(data.get("picked_killer_perks"), default=[])
        return data

    def process_action(self, room_code, action_data):
        room = self.get_room(room_code)
        if not room:
            raise ValueError(f"Draft room '{room_code}' not found.")

        action_type = action_data.get("action_type") or action_data.get("action")
        perk_name = action_data.get("perk_name") or action_data.get("perk")
        role = (action_data.get("role") or action_data.get("target_role") or "survivor").lower()
        new_phase = action_data.get("phase")

        banned_perks = list(room.get("banned_perks", []))
        picked_survivor_perks = list(room.get("picked_survivor_perks", []))
        picked_killer_perks = list(room.get("picked_killer_perks", []))
        current_phase = room.get("phase", "bans")

        if action_type == "ban":
            if perk_name and perk_name not in banned_perks:
                banned_perks.append(perk_name)
        elif action_type == "pick":
            if role == "killer":
                if perk_name and perk_name not in picked_killer_perks:
                    picked_killer_perks.append(perk_name)
            else:
                if perk_name and perk_name not in picked_survivor_perks:
                    picked_survivor_perks.append(perk_name)

        if new_phase in ("bans", "picks", "complete"):
            current_phase = new_phase

        if self._use_sqlalchemy:
            try:
                if current_app:
                    ds = db.session.scalars(
                        select(DraftSession).where(DraftSession.room_code == room_code)
                    ).first()
                    if ds:
                        ds.phase = current_phase
                        ds.banned_perks = safe_json_dumps(banned_perks, default_val="[]")
                        ds.picked_survivor_perks = safe_json_dumps(picked_survivor_perks, default_val="[]")
                        ds.picked_killer_perks = safe_json_dumps(picked_killer_perks, default_val="[]")
                        db.session.commit()
                        return ds.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy process_action fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE draft_sessions
            SET phase = ?, banned_perks = ?, picked_survivor_perks = ?, picked_killer_perks = ?, updated_at = CURRENT_TIMESTAMP
            WHERE room_code = ?;
        """, (current_phase, safe_json_dumps(banned_perks), safe_json_dumps(picked_survivor_perks), safe_json_dumps(picked_killer_perks), room_code))
        conn.commit()
        conn.close()

        return self.get_room(room_code)
```

### backend/app/services/others/guesser_service.py
```python
import logging
from flask import current_app
from sqlalchemy import select

from app.core.extensions import db
from app.models import GuesserStat
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)


class GuesserService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def get_all_stats(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(GuesserStat)
                    rows = db.session.scalars(stmt).all()
                    return {
                        r.guesser_type: {
                            "guesser_type": r.guesser_type,
                            "current_streak": r.current_streak,
                            "best_streak": r.best_streak,
                            "total_guesses": r.total_guesses,
                            "correct_guesses": r.correct_guesses,
                        }
                        for r in rows
                    }
            except Exception as e:
                logger.debug(f"SQLAlchemy get_all_stats fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM guesser_stats;")
        rows = cursor.fetchall()
        conn.close()
        
        res = {}
        for r in rows:
            res[r["guesser_type"]] = {
                "guesser_type": r["guesser_type"],
                "current_streak": r["current_streak"],
                "best_streak": r["best_streak"],
                "total_guesses": r["total_guesses"],
                "correct_guesses": r["correct_guesses"]
            }
        return res

    def update_stats(self, guesser_type: str, is_correct: bool):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stat = db.session.scalars(
                        select(GuesserStat).where(GuesserStat.guesser_type == guesser_type)
                    ).first()
                    if not stat:
                        stat = GuesserStat(guesser_type=guesser_type)
                        db.session.add(stat)

                    curr_streak = stat.current_streak
                    best_streak = stat.best_streak
                    total_guesses = stat.total_guesses + 1
                    correct_guesses = stat.correct_guesses

                    if is_correct:
                        curr_streak += 1
                        correct_guesses += 1
                        if curr_streak > best_streak:
                            best_streak = curr_streak
                    else:
                        curr_streak = 0

                    stat.current_streak = curr_streak
                    stat.best_streak = best_streak
                    stat.total_guesses = total_guesses
                    stat.correct_guesses = correct_guesses
                    db.session.commit()

                    return {
                        "guesser_type": guesser_type,
                        "current_streak": curr_streak,
                        "best_streak": best_streak,
                        "total_guesses": total_guesses,
                        "correct_guesses": correct_guesses,
                    }
            except Exception as e:
                logger.debug(f"SQLAlchemy update_stats fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM guesser_stats WHERE guesser_type = ?;", (guesser_type,))
        row = cursor.fetchone()
        
        if not row:
            cursor.execute("""
                INSERT INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses)
                VALUES (?, 0, 0, 0, 0);
            """, (guesser_type,))
            conn.commit()
            cursor.execute("SELECT * FROM guesser_stats WHERE guesser_type = ?;", (guesser_type,))
            row = cursor.fetchone()

        stats = dict(row)
        curr_streak = stats["current_streak"]
        best_streak = stats["best_streak"]
        total_guesses = stats["total_guesses"] + 1
        correct_guesses = stats["correct_guesses"]

        if is_correct:
            curr_streak += 1
            correct_guesses += 1
            if curr_streak > best_streak:
                best_streak = curr_streak
        else:
            curr_streak = 0

        cursor.execute("""
            UPDATE guesser_stats
            SET current_streak = ?, best_streak = ?, total_guesses = ?, correct_guesses = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guesser_type = ?;
        """, (curr_streak, best_streak, total_guesses, correct_guesses, guesser_type))
        conn.commit()
        conn.close()

        return {
            "guesser_type": guesser_type,
            "current_streak": curr_streak,
            "best_streak": best_streak,
            "total_guesses": total_guesses,
            "correct_guesses": correct_guesses
        }

    def reset_streak(self, guesser_type: str):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stat = db.session.scalars(
                        select(GuesserStat).where(GuesserStat.guesser_type == guesser_type)
                    ).first()
                    if stat:
                        stat.current_streak = 0
                        db.session.commit()
                        return {
                            "guesser_type": guesser_type,
                            "current_streak": 0,
                            "best_streak": stat.best_streak,
                            "total_guesses": stat.total_guesses,
                            "correct_guesses": stat.correct_guesses,
                        }
            except Exception as e:
                logger.debug(f"SQLAlchemy reset_streak fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE guesser_stats
            SET current_streak = 0, updated_at = CURRENT_TIMESTAMP
            WHERE guesser_type = ?;
        """, (guesser_type,))
        conn.commit()
        
        cursor.execute("SELECT * FROM guesser_stats WHERE guesser_type = ?;", (guesser_type,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return {
            "guesser_type": guesser_type,
            "current_streak": 0,
            "best_streak": 0,
            "total_guesses": 0,
            "correct_guesses": 0
        }
```

### backend/app/services/others/killer_calc_service.py
```python
from typing import Any

KILLERS_DATA: dict[str, dict[str, Any]] = {
    "huntress": {
        "id": "huntress",
        "name": "The Huntress",
        "title": "Anna",
        "icon": "huntress.png",
        "base_terror_radius": 20.0,
        "lullaby_radius": 45.0,
        "movement_speed": 4.4,
        "power_name": "Hunting Hatchets",
        "power_stats": {
            "windup_time": {"name": "Hatchet Windup Time", "base": 1.0, "unit": "s", "lower_is_better": True},
            "cooldown_time": {"name": "Hatchet Throw Cooldown", "base": 1.25, "unit": "s", "lower_is_better": True},
            "reload_speed": {"name": "Locker Reload Speed", "base": 3.0, "unit": "s", "lower_is_better": True},
            "hatchet_capacity": {"name": "Hatchet Capacity", "base": 5, "unit": "hatchets", "lower_is_better": False},
        },
        "addons": {
            "flower_babushka": {
                "id": "flower_babushka",
                "name": "Flower Babushka",
                "rarity": "Uncommon",
                "description": "Moderately decreases hatchet windup time (-12%).",
                "modifiers": {"windup_time": {"type": "percent", "value": -12}}
            },
            "manna_grass_braid": {
                "id": "manna_grass_braid",
                "name": "Manna Grass Braid",
                "rarity": "Common",
                "description": "Slightly decreases hatchet windup time (-8%).",
                "modifiers": {"windup_time": {"type": "percent", "value": -8}}
            },
            "oak_shaft": {
                "id": "oak_shaft",
                "name": "Oak Shaft",
                "rarity": "Rare",
                "description": "Decreases cooldown between hatchet throws (-20%).",
                "modifiers": {"cooldown_time": {"type": "percent", "value": -20}}
            },
            "leather_loop": {
                "id": "leather_loop",
                "name": "Leather Loop",
                "rarity": "Uncommon",
                "description": "Increases hatchet capacity (+1) and decreases reload time (-10%).",
                "modifiers": {
                    "hatchet_capacity": {"type": "flat", "value": 1},
                    "reload_speed": {"type": "percent", "value": -10}
                }
            },
            "wooden_fox": {
                "id": "wooden_fox",
                "name": "Wooden Fox",
                "rarity": "Very Rare",
                "description": "Grants Undetectable status for 15 seconds after reloading.",
                "modifiers": {}
            }
        }
    },
    "nurse": {
        "id": "nurse",
        "name": "The Nurse",
        "title": "Sally Smithson",
        "icon": "nurse.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 3.85,
        "power_name": "Spencer's Last Breath",
        "power_stats": {
            "blink_charge_time": {"name": "Blink Charge Time", "base": 2.0, "unit": "s", "lower_is_better": True},
            "blink_fatigue_time": {"name": "Blink Fatigue Duration", "base": 2.5, "unit": "s", "lower_is_better": True},
            "max_blinks": {"name": "Max Blinks", "base": 2, "unit": "blinks", "lower_is_better": False},
            "blink_charge_speed": {"name": "Blink Charge Speed", "base": 100.0, "unit": "%", "lower_is_better": False},
        },
        "addons": {
            "fragile_wheeze": {
                "id": "fragile_wheeze",
                "name": "Fragile Wheeze",
                "rarity": "Very Rare",
                "description": "Decreases fatigue duration after blinks (-15%).",
                "modifiers": {"blink_fatigue_time": {"type": "percent", "value": -15}}
            },
            "heavy_panting": {
                "id": "heavy_panting",
                "name": "Heavy Panting",
                "rarity": "Rare",
                "description": "Increases max blink charge speed (+20%).",
                "modifiers": {"blink_charge_speed": {"type": "percent", "value": 20}}
            },
            "kavanaghs_last_breath": {
                "id": "kavanaghs_last_breath",
                "name": "Kavanagh's Last Breath",
                "rarity": "Very Rare",
                "description": "Increases max blink charge speed (+30%) but increases fatigue duration (+15%).",
                "modifiers": {
                    "blink_charge_speed": {"type": "percent", "value": 30},
                    "blink_fatigue_time": {"type": "percent", "value": 15}
                }
            },
            "dark_cincture": {
                "id": "dark_cincture",
                "name": "Dark Cincture",
                "rarity": "Uncommon",
                "description": "Increases movement speed (+0.2 m/s).",
                "modifiers": {"movement_speed": {"type": "flat", "value": 0.2}}
            },
            "bad_mans_last_breath": {
                "id": "bad_mans_last_breath",
                "name": "Bad Man's Last Breath",
                "rarity": "Ultra Rare",
                "description": "Hitting a survivor with a blink attack hides Terror Radius for 25s.",
                "modifiers": {}
            }
        }
    },
    "blight": {
        "id": "blight",
        "name": "The Blight",
        "title": "Talbot Grimes",
        "icon": "blight.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.6,
        "power_name": "Blighted Serum",
        "power_stats": {
            "rush_tokens": {"name": "Rush Tokens", "base": 5, "unit": "tokens", "lower_is_better": False},
            "rush_recharge_time": {"name": "Token Recharge Time", "base": 2.0, "unit": "s", "lower_is_better": True},
            "rush_speed": {"name": "Rush Movement Speed Boost", "base": 0.0, "unit": "%", "lower_is_better": False},
            "turn_rate": {"name": "Rush Turn Rate", "base": 100.0, "unit": "%", "lower_is_better": False},
        },
        "addons": {
            "blighted_rat": {
                "id": "blighted_rat",
                "name": "Blighted Rat",
                "rarity": "Uncommon",
                "description": "Increases Rush movement speed (+10%).",
                "modifiers": {"rush_speed": {"type": "percent", "value": 10}}
            },
            "blighted_crow": {
                "id": "blighted_crow",
                "name": "Blighted Crow",
                "rarity": "Very Rare",
                "description": "Increases Rush movement speed (+15%).",
                "modifiers": {"rush_speed": {"type": "percent", "value": 15}}
            },
            "adrenaline_vial": {
                "id": "adrenaline_vial",
                "name": "Adrenaline Vial",
                "rarity": "Very Rare",
                "description": "Increases max Rush tokens (+2) and decreases token recharge time (-25%).",
                "modifiers": {
                    "rush_tokens": {"type": "flat", "value": 2},
                    "rush_recharge_time": {"type": "percent", "value": -25}
                }
            },
            "umbra_salts": {
                "id": "umbra_salts",
                "name": "Umbra Salts",
                "rarity": "Common",
                "description": "Increases Rush turn rate (+15%).",
                "modifiers": {"turn_rate": {"type": "percent", "value": 15}}
            },
            "compound_seven": {
                "id": "compound_seven",
                "name": "Compound Seven",
                "rarity": "Uncommon",
                "description": "Automatically targets nearby survivors within 16 meters during a rush.",
                "modifiers": {}
            }
        }
    },
    "trapper": {
        "id": "trapper",
        "name": "The Trapper",
        "title": "Evan MacMillan",
        "icon": "trapper.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.6,
        "power_name": "Bear Trap",
        "power_stats": {
            "trap_set_time": {"name": "Trap Setting Time", "base": 2.5, "unit": "s", "lower_is_better": True},
            "escape_difficulty": {"name": "Trap Rescue/Escape Time", "base": 100.0, "unit": "%", "lower_is_better": False},
            "starting_traps": {"name": "Starting Traps", "base": 2, "unit": "traps", "lower_is_better": False},
        },
        "addons": {
            "fast_fastening_kit": {
                "id": "fast_fastening_kit",
                "name": "Fast-Fastening Kit",
                "rarity": "Uncommon",
                "description": "Decreases trap setting time (-20%).",
                "modifiers": {"trap_set_time": {"type": "percent", "value": -20}}
            },
            "trapper_gloves": {
                "id": "trapper_gloves",
                "name": "Trapper Gloves",
                "rarity": "Common",
                "description": "Decreases trap setting time (-30%).",
                "modifiers": {"trap_set_time": {"type": "percent", "value": -30}}
            },
            "secondary_coil": {
                "id": "secondary_coil",
                "name": "Secondary Coil",
                "rarity": "Very Rare",
                "description": "Increases trap escape/rescue duration (+50%).",
                "modifiers": {"escape_difficulty": {"type": "percent", "value": 50}}
            },
            "trapper_bag": {
                "id": "trapper_bag",
                "name": "Trapper Sack",
                "rarity": "Very Rare",
                "description": "Start with +2 extra Bear Traps.",
                "modifiers": {"starting_traps": {"type": "flat", "value": 2}}
            },
            "tar_bottle": {
                "id": "tar_bottle",
                "name": "Tar Bottle",
                "rarity": "Rare",
                "description": "Considerably darkens Bear Traps.",
                "modifiers": {}
            }
        }
    },
    "wraith": {
        "id": "wraith",
        "name": "The Wraith",
        "title": "Philip Ojomo",
        "icon": "wraith.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.6,
        "power_name": "Wailing Bell",
        "power_stats": {
            "uncloak_time": {"name": "Uncloaking Time", "base": 3.0, "unit": "s", "lower_is_better": True},
            "cloak_time": {"name": "Cloaking Time", "base": 1.5, "unit": "s", "lower_is_better": True},
            "cloaked_speed": {"name": "Cloaked Movement Speed", "base": 6.0, "unit": "m/s", "lower_is_better": False},
        },
        "addons": {
            "swift_hunt": {
                "id": "swift_hunt",
                "name": "Swift Hunt - Blood",
                "rarity": "Very Rare",
                "description": "Decreases uncloaking time (-20%).",
                "modifiers": {"uncloak_time": {"type": "percent", "value": -20}}
            },
            "windstorm": {
                "id": "windstorm",
                "name": "Windstorm - Blood",
                "rarity": "Very Rare",
                "description": "Increases movement speed while cloaked (+10%).",
                "modifiers": {"cloaked_speed": {"type": "percent", "value": 10}}
            },
            "shadow_dance": {
                "id": "shadow_dance",
                "name": "Shadow Dance - White",
                "rarity": "Rare",
                "description": "Decreases cloaking time (-15%).",
                "modifiers": {"cloak_time": {"type": "percent", "value": -15}}
            },
            "bone_clapper": {
                "id": "bone_clapper",
                "name": "Bone Clapper",
                "rarity": "Uncommon",
                "description": "Bell sound no longer lets survivors discern distance or direction.",
                "modifiers": {}
            },
            "coxcomb_clapper": {
                "id": "coxcomb_clapper",
                "name": "The Coxcomb Clapper",
                "rarity": "Ultra Rare",
                "description": "Completely suppresses the Wailing Bell sound.",
                "modifiers": {}
            }
        }
    },
    "spirit": {
        "id": "spirit",
        "name": "The Spirit",
        "title": "Rin Yamaoka",
        "icon": "spirit.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.4,
        "power_name": "Yamaoka's Haunting",
        "power_stats": {
            "phase_duration": {"name": "Phase Duration", "base": 5.0, "unit": "s", "lower_is_better": False},
            "phase_speed": {"name": "Phase Movement Speed", "base": 7.0, "unit": "m/s", "lower_is_better": False},
            "phase_recharge": {"name": "Phase Recharge Time", "base": 15.0, "unit": "s", "lower_is_better": True},
        },
        "addons": {
            "yakuyoke_amulet": {
                "id": "yakuyoke_amulet",
                "name": "Yakuyoke Amulet",
                "rarity": "Very Rare",
                "description": "Increases phase duration (+20%) but decreases phase speed (-10%).",
                "modifiers": {
                    "phase_duration": {"type": "percent", "value": 20},
                    "phase_speed": {"type": "percent", "value": -10}
                }
            },
            "cherry_blossom": {
                "id": "cherry_blossom",
                "name": "Dried Cherry Blossom",
                "rarity": "Rare",
                "description": "Increases phase movement speed (+15%).",
                "modifiers": {"phase_speed": {"type": "percent", "value": 15}}
            },
            "mother_daughter_ring": {
                "id": "mother_daughter_ring",
                "name": "Mother-Daughter Ring",
                "rarity": "Ultra Rare",
                "description": "Tremendously increases phase movement speed (+40%).",
                "modifiers": {"phase_speed": {"type": "percent", "value": 40}}
            },
            "rusty_flute": {
                "id": "rusty_flute",
                "name": "Rusty Flute",
                "rarity": "Uncommon",
                "description": "Decreases phase recharge time (-20%).",
                "modifiers": {"phase_recharge": {"type": "percent", "value": -20}}
            },
            "origami_crane": {
                "id": "origami_crane",
                "name": "Origami Crane",
                "rarity": "Common",
                "description": "Decreases phase recharge time (-10%).",
                "modifiers": {"phase_recharge": {"type": "percent", "value": -10}}
            }
        }
    }
}

PERKS_DATA: dict[str, dict[str, Any]] = {
    "distressing": {
        "id": "distressing",
        "name": "Distressing",
        "description": "Increases Terror Radius by 26%",
        "type": "percent",
        "value": 26
    },
    "monitor_and_abuse": {
        "id": "monitor_and_abuse",
        "name": "Monitor & Abuse",
        "description": "Terror Radius +8m in chase, -8m outside chase",
        "type": "conditional_flat"
    },
    "agitation": {
        "id": "agitation",
        "name": "Agitation",
        "description": "Terror Radius +12m while carrying a survivor",
        "type": "conditional_flat"
    },
    "furtive_chase": {
        "id": "furtive_chase",
        "name": "Furtive Chase",
        "description": "Terror Radius -4m per token (up to 4 tokens = -16m)",
        "type": "token_flat"
    }
}


class KillerCalcService:
    def get_killers(self) -> dict[str, dict[str, Any]]:
        return KILLERS_DATA

    def get_perks(self) -> dict[str, dict[str, Any]]:
        return PERKS_DATA

    def calculate(
        self,
        killer_id: str,
        addon_ids: list[str] | None = None,
        perk_ids: list[str] | None = None,
        perk_options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        addon_ids = addon_ids or []
        perk_ids = perk_ids or []
        perk_options = perk_options or {}

        if killer_id not in KILLERS_DATA:
            raise ValueError(f"Unknown killer_id: {killer_id}")

        killer = KILLERS_DATA[killer_id]
        base_tr = float(killer["base_terror_radius"])
        lullaby_radius = float(killer["lullaby_radius"])

        tr_breakdown = [{"source": "Base Terror Radius", "value": base_tr}]
        percent_mod = 0.0
        flat_mod = 0.0

        if "distressing" in perk_ids:
            dist_val = round(base_tr * 0.26, 2)
            percent_mod += 26.0
            tr_breakdown.append({"source": "Distressing (+26%)", "value": dist_val})

        if "monitor_and_abuse" in perk_ids:
            in_chase = perk_options.get("in_chase", False)
            ma_val = 8.0 if in_chase else -8.0
            flat_mod += ma_val
            label = "Monitor & Abuse (In Chase +8m)" if in_chase else "Monitor & Abuse (Out of Chase -8m)"
            tr_breakdown.append({"source": label, "value": ma_val})

        if "agitation" in perk_ids:
            carrying = perk_options.get("carrying_survivor", False)
            ag_val = 12.0 if carrying else 0.0
            if carrying:
                flat_mod += ag_val
                tr_breakdown.append({"source": "Agitation (Carrying +12m)", "value": ag_val})

        if "furtive_chase" in perk_ids:
            tokens = min(4, max(0, int(perk_options.get("furtive_chase_tokens", 0))))
            fc_val = float(tokens * -4)
            if tokens > 0:
                flat_mod += fc_val
                tr_breakdown.append({"source": f"Furtive Chase ({tokens} tokens)", "value": fc_val})

        modified_tr = round(max(0.0, base_tr * (1.0 + percent_mod / 100.0) + flat_mod), 2)
        tr_delta = round(modified_tr - base_tr, 2)

        equipped_addons = []
        addon_objects = []
        for aid in addon_ids[:2]:
            if aid in killer["addons"]:
                aobj = killer["addons"][aid]
                equipped_addons.append(aobj)
                addon_objects.append({
                    "id": aobj["id"],
                    "name": aobj["name"],
                    "rarity": aobj["rarity"],
                    "description": aobj["description"]
                })

        stat_deltas = []
        power_stats = killer["power_stats"]

        for stat_id, sdata in power_stats.items():
            base_val = float(sdata["base"])
            unit = sdata["unit"]
            lower_is_better = sdata["lower_is_better"]
            stat_name = sdata["name"]

            sum_percent = 0.0
            sum_flat = 0.0

            for addon in equipped_addons:
                if stat_id in addon["modifiers"]:
                    mod = addon["modifiers"][stat_id]
                    if mod["type"] == "percent":
                        sum_percent += mod["value"]
                    elif mod["type"] == "flat":
                        sum_flat += mod["value"]

            if base_val == 0.0:
                modified_val = round(base_val + sum_percent + sum_flat, 2)
            else:
                modified_val = round(base_val * (1.0 + sum_percent / 100.0) + sum_flat, 2)
            delta_val = round(modified_val - base_val, 2)

            if lower_is_better:
                is_buff = modified_val < base_val
            else:
                is_buff = modified_val > base_val

            is_changed = sum_percent != 0.0 or sum_flat != 0.0

            formatted_delta = ""
            if sum_percent != 0.0:
                formatted_delta = f"{'+' if sum_percent > 0 else ''}{sum_percent}%"
            elif sum_flat != 0.0:
                formatted_delta = f"{'+' if sum_flat > 0 else ''}{sum_flat} {unit}"
            else:
                formatted_delta = "0"

            stat_deltas.append({
                "stat_id": stat_id,
                "name": stat_name,
                "base": base_val,
                "modified": modified_val,
                "delta_value": delta_val,
                "delta_percent": round(sum_percent, 2),
                "delta_flat": round(sum_flat, 2),
                "formatted_delta": formatted_delta,
                "unit": unit,
                "lower_is_better": lower_is_better,
                "is_buff": is_buff,
                "is_changed": is_changed
            })

        return {
            "killer": {
                "id": killer["id"],
                "name": killer["name"],
                "title": killer["title"],
                "base_terror_radius": base_tr,
                "lullaby_radius": lullaby_radius,
                "movement_speed": killer["movement_speed"],
                "power_name": killer["power_name"]
            },
            "terror_radius": {
                "base": base_tr,
                "modified": modified_tr,
                "delta": tr_delta,
                "breakdown": tr_breakdown
            },
            "lullaby": {
                "base": lullaby_radius,
                "modified": lullaby_radius
            },
            "addons": addon_objects,
            "stat_deltas": stat_deltas
        }


def calculate_killer_calc(
    killer_id: str,
    addon_ids: list[str] | None = None,
    perk_ids: list[str] | None = None,
    perk_options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    service = KillerCalcService()
    return service.calculate(killer_id, addon_ids, perk_ids, perk_options)
```

### backend/app/services/others/quest_service.py
```python
import logging
from flask import current_app
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import DailyQuest
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)

DEFAULT_QUESTS = [
    {
        "title": "Escape 2 Trials",
        "description": "Escape successfully as a survivor 2 times.",
        "category": "daily",
        "goal": 2,
        "xp_reward": 500
    },
    {
        "title": "Sacrifice 3 Survivors",
        "description": "Hook and sacrifice 3 survivors as killer.",
        "category": "daily",
        "goal": 3,
        "xp_reward": 500
    },
    {
        "title": "Complete 5 Generator Skill Checks",
        "description": "Succeed at 5 skill checks while repairing.",
        "category": "daily",
        "goal": 5,
        "xp_reward": 500
    },
    {
        "title": "Master of the Realm",
        "description": "Win 10 matches in any role.",
        "category": "weekly",
        "goal": 10,
        "xp_reward": 2500
    }
]


class QuestService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def _init_table(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_quests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('daily', 'weekly')),
                progress INTEGER NOT NULL DEFAULT 0,
                goal INTEGER NOT NULL DEFAULT 1,
                xp_reward INTEGER NOT NULL DEFAULT 500,
                is_completed BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        conn.close()

    def seed_quests_if_empty(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    count = db.session.scalar(select(func.count(DailyQuest.id))) or 0
                    if count == 0:
                        for q in DEFAULT_QUESTS:
                            db.session.add(
                                DailyQuest(
                                    title=q["title"],
                                    description=q["description"],
                                    category=q["category"],
                                    progress=0,
                                    goal=q["goal"],
                                    xp_reward=q["xp_reward"],
                                    is_completed=False,
                                )
                            )
                        db.session.commit()
                    return
            except Exception as e:
                logger.debug(f"SQLAlchemy seed_quests_if_empty fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM daily_quests;")
        row = cursor.fetchone()
        count = row["count"] if row else 0
        if count == 0:
            for q in DEFAULT_QUESTS:
                cursor.execute("""
                    INSERT INTO daily_quests (title, description, category, progress, goal, xp_reward, is_completed)
                    VALUES (?, ?, ?, 0, ?, ?, 0);
                """, (q["title"], q["description"], q["category"], q["goal"], q["xp_reward"]))
            conn.commit()
        conn.close()

    def get_quests(self):
        self.seed_quests_if_empty()
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(DailyQuest).order_by(DailyQuest.id.asc())
                    rows = db.session.scalars(stmt).all()
                    return [r.to_dict() for r in rows]
            except Exception as e:
                logger.debug(f"SQLAlchemy get_quests fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM daily_quests ORDER BY id ASC;")
        rows = cursor.fetchall()
        conn.close()

        quests = []
        for r in rows:
            q = dict(r)
            q["is_completed"] = bool(q["is_completed"])
            quests.append(q)
        return quests

    def claim_quest(self, quest_id):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    q = db.session.get(DailyQuest, int(quest_id))
                    if not q:
                        raise ValueError(f"Quest with ID {quest_id} not found.")
                    if q.is_completed:
                        raise ValueError(f"Quest with ID {quest_id} is already completed.")
                    q.is_completed = True
                    q.progress = q.goal
                    db.session.commit()
                    return {"quest": q.to_dict(), "xp_reward": q.xp_reward}
            except Exception as e:
                logger.debug(f"SQLAlchemy claim_quest fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM daily_quests WHERE id = ?;", (quest_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Quest with ID {quest_id} not found.")

        quest = dict(row)
        if bool(quest["is_completed"]):
            conn.close()
            raise ValueError(f"Quest with ID {quest_id} is already completed.")

        cursor.execute("""
            UPDATE daily_quests
            SET is_completed = 1, progress = goal
            WHERE id = ?;
        """, (quest_id,))
        conn.commit()

        cursor.execute("SELECT * FROM daily_quests WHERE id = ?;", (quest_id,))
        updated_row = dict(cursor.fetchone())
        updated_row["is_completed"] = bool(updated_row["is_completed"])
        conn.close()

        return {
            "quest": updated_row,
            "xp_reward": updated_row["xp_reward"]
        }
```

### backend/app/services/others/smash_or_pass_service.py
```python
import logging
from typing import Any
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models.base import utcnow
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashPassStat,
    SmashPassVote,
    Translation,
    Vote,
)
from app.seeds.smash_roster_seeder import seed_smash_rosters

logger = logging.getLogger(__name__)

EDITIONS: list[dict[str, Any]] = [
    {
        "id": "canon",
        "slug": "canon",
        "name": "Dead by Daylight: Fog Canon",
        "description": "The complete 98-character roster of all official Killers and Survivors.",
        "icon": "Heart",
        "character_count": 98,
    },
    {
        "id": "hooked_on_you",
        "slug": "hooked_on_you",
        "name": "Hooked on You: Island Romance",
        "description": "Tropical paradise dating sim edition with beach outfits and sunny vibes.",
        "icon": "Sparkles",
        "character_count": 8,
    },
    {
        "id": "legendary_cosplay",
        "slug": "legendary_cosplay",
        "name": "Legendary Skins & Collabs",
        "description": "Iconic legendary skins and crossover collabs from gaming history.",
        "icon": "Flame",
        "character_count": 12,
    },
    {
        "id": "cyberpunk_2077",
        "slug": "cyberpunk_2077",
        "name": "Cyberpunk Fog 2077 Edition",
        "description": "High-tech neon augmented champions fighting in a dystopian fog.",
        "icon": "Cpu",
        "character_count": 10,
    },
    {
        "id": "anime_manga",
        "slug": "anime_manga",
        "name": "Fog Anime / Manga Aesthetic",
        "description": "Stylized anime aesthetic adaptations of your favorite Fog characters.",
        "icon": "Sparkle",
        "character_count": 10,
    },
    {
        "id": "gothic_eldritch",
        "slug": "gothic_eldritch",
        "name": "Victorian & Gothic Eldritch Legends",
        "description": "Dark fantasy, Bloodborne aesthetics, and Victorian eldritch horrors.",
        "icon": "Skull",
        "character_count": 10,
    },
]


class SmashOrPassService:
    """Service handling multi-roster Smash or Pass voting, feed generation, user persistence, and leaderboards."""

    def ensure_seeded(self) -> None:
        try:
            count = db.session.scalar(select(func.count(Roster.id)))
            if not count or count == 0:
                seed_smash_rosters()
        except Exception as e:
            logger.debug(f"Smash-or-pass seed notice: {e}")

    def get_rosters(self, active_only: bool = True) -> list[dict[str, Any]]:
        self.ensure_seeded()
        stmt = select(Roster)
        if active_only:
            stmt = stmt.where(Roster.is_active.is_(True))
        stmt = stmt.order_by(Roster.slug)
        rosters = db.session.scalars(stmt).all()

        result = []
        for r in rosters:
            entity_count = (
                db.session.scalar(
                    select(func.count(Entity.id)).where(
                        Entity.roster_id == r.id,
                        Entity.is_active.is_(True),
                    )
                )
                or 0
            )

            total_votes = (
                db.session.scalar(
                    select(func.coalesce(func.sum(EntityStat.total_votes), 0))
                    .select_from(Entity)
                    .join(EntityStat, Entity.id == EntityStat.entity_id)
                    .where(
                        Entity.roster_id == r.id,
                        Entity.is_active.is_(True),
                    )
                )
                or 0
            )

            r_dict = r.to_dict()
            r_dict["entity_count"] = entity_count
            r_dict["character_count"] = entity_count
            r_dict["total_votes"] = int(total_votes)
            result.append(r_dict)
        return result

    def get_feed(
        self,
        roster_slug: str = "canon",
        session_id: str | None = None,
        user_id: int | None = None,
        role: str | None = None,
        gender: str | None = None,
        limit: int = 50,
    ) -> dict[str, Any] | None:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == roster_slug))
        if not roster:
            return None

        roster_info = next(
            (r for r in self.get_rosters(active_only=False) if r["slug"] == roster_slug),
            roster.to_dict(),
        )

        voted_conditions = []
        if user_id is not None:
            voted_conditions.append(Vote.user_id == user_id)
        if session_id is not None:
            voted_conditions.append(Vote.session_id == session_id)

        voted_entity_ids: list[str] = []
        if voted_conditions:
            voted_stmt = select(Vote.entity_id).where(or_(*voted_conditions))
            voted_entity_ids = list(db.session.scalars(voted_stmt).all())

        count_stmt = select(func.count(Entity.id)).where(
            Entity.roster_id == roster.id,
            Entity.is_active.is_(True),
        )
        if voted_entity_ids:
            count_stmt = count_stmt.where(Entity.id.not_in(voted_entity_ids))

        if role and role != "all":
            count_stmt = count_stmt.where(Entity.role == role)
        if gender and gender != "all":
            count_stmt = count_stmt.where(Entity.gender == gender)

        total_remaining = db.session.scalar(count_stmt) or 0

        stmt = (
            select(Entity)
            .options(joinedload(Entity.stat))
            .where(
                Entity.roster_id == roster.id,
                Entity.is_active.is_(True),
            )
        )

        if voted_entity_ids:
            stmt = stmt.where(Entity.id.not_in(voted_entity_ids))

        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)

        stmt = stmt.order_by(Entity.order_index).limit(limit)
        entities = db.session.scalars(stmt).all()

        return {
            "roster": roster_info,
            "entities": [e.to_dict() for e in entities],
            "total_remaining": int(total_remaining),
        }

    def cast_vote(
        self,
        entity_id: str | None = None,
        character_slug: str | None = None,
        vote_type: str = "smash",
        session_id: str | None = None,
        user_id: int | None = None,
        roster_slug: str | None = None,
        edition: str = "canon",
    ) -> dict[str, Any]:
        self.ensure_seeded()
        valid_votes = {"smash", "pass", "super_smash"}
        if vote_type not in valid_votes:
            raise ValueError(f"Invalid vote_type '{vote_type}'. Must be one of {valid_votes}")

        try:
            target_slug = roster_slug or edition
            entity: Entity | None = None
            if entity_id:
                entity = db.session.get(Entity, entity_id)
            elif character_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == target_slug))
                if roster:
                    entity = db.session.scalar(
                        select(Entity).where(
                            Entity.roster_id == roster.id,
                            Entity.slug == character_slug,
                        )
                    )
                if not entity:
                    entity = db.session.scalar(select(Entity).where(Entity.slug == character_slug))

            if not entity:
                raise ValueError(f"Entity not found for entity_id='{entity_id}' or character_slug='{character_slug}'")

            stat = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == entity.id))
            if not stat:
                chaos = float(entity.get_metadata().get("chaos_score", 50.0))
                stat = EntityStat(
                    entity_id=entity.id,
                    smash_count=0,
                    pass_count=0,
                    super_smash_count=0,
                    total_votes=0,
                    smash_rate=0.0,
                    chaos_rating=chaos,
                )
                db.session.add(stat)
                db.session.flush()

            existing_vote = None
            user_sess_conds = []
            if user_id is not None:
                user_sess_conds.append(Vote.user_id == user_id)
            if session_id is not None:
                user_sess_conds.append(Vote.session_id == session_id)

            if user_sess_conds:
                existing_vote = db.session.scalar(
                    select(Vote).where(Vote.entity_id == entity.id, or_(*user_sess_conds))
                )

            prev_vote_type = None
            if existing_vote:
                prev_vote_type = existing_vote.vote_type
                if prev_vote_type == "smash":
                    stat.smash_count = max(0, stat.smash_count - 1)
                elif prev_vote_type == "pass":
                    stat.pass_count = max(0, stat.pass_count - 1)
                elif prev_vote_type == "super_smash":
                    stat.super_smash_count = max(0, stat.super_smash_count - 1)

                existing_vote.vote_type = vote_type
                if user_id is not None:
                    existing_vote.user_id = user_id
                if session_id is not None:
                    existing_vote.session_id = session_id
                existing_vote.created_at = utcnow()
            else:
                new_vote = Vote(
                    entity_id=entity.id,
                    session_id=session_id,
                    user_id=user_id,
                    vote_type=vote_type,
                )
                db.session.add(new_vote)

            if vote_type == "smash":
                stat.smash_count += 1
            elif vote_type == "pass":
                stat.pass_count += 1
            elif vote_type == "super_smash":
                stat.super_smash_count += 1

            stat.calculate_rate()

            try:
                leg_stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == entity.slug,
                        SmashPassStat.edition == target_slug,
                    )
                )
                if leg_stat:
                    if prev_vote_type:
                        if prev_vote_type == "smash":
                            leg_stat.smash_count = max(0, leg_stat.smash_count - 1)
                        elif prev_vote_type == "pass":
                            leg_stat.pass_count = max(0, leg_stat.pass_count - 1)
                        elif prev_vote_type == "super_smash":
                            leg_stat.super_smash_count = max(0, leg_stat.super_smash_count - 1)

                    if vote_type == "smash":
                        leg_stat.smash_count += 1
                    elif vote_type == "pass":
                        leg_stat.pass_count += 1
                    elif vote_type == "super_smash":
                        leg_stat.super_smash_count += 1
                    leg_stat.calculate_rate()
            except Exception:
                pass

            db.session.commit()
            db.session.refresh(entity)
            db.session.refresh(stat)

            res = entity.to_dict()
            res["character_slug"] = entity.slug
            res["character_name"] = entity.name
            res["edition"] = target_slug
            res["smash_count"] = stat.smash_count
            res["pass_count"] = stat.pass_count
            res["super_smash_count"] = stat.super_smash_count
            res["total_votes"] = stat.total_votes
            res["smash_rate"] = stat.smash_rate
            res["chaos_rating"] = stat.chaos_rating
            return res
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording smash-or-pass vote: {e}")
            raise e

    def get_leaderboard(
        self,
        roster_slug: str = "canon",
        role: str | None = None,
        gender: str | None = None,
        sort_by: str = "smash_rate",
        limit: int = 100,
        edition: str | None = None,
    ) -> list[dict[str, Any]]:
        self.ensure_seeded()
        target_slug = roster_slug or edition or "canon"
        roster = db.session.scalar(select(Roster).where(Roster.slug == target_slug))
        if not roster:
            return []

        stmt = (
            select(Entity, EntityStat)
            .join(EntityStat, Entity.id == EntityStat.entity_id)
            .where(
                Entity.roster_id == roster.id,
                Entity.is_active.is_(True),
            )
        )

        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)

        if sort_by == "total_votes":
            stmt = stmt.order_by(EntityStat.total_votes.desc(), EntityStat.smash_rate.desc())
        elif sort_by == "smash_count":
            stmt = stmt.order_by((EntityStat.smash_count + EntityStat.super_smash_count).desc(), EntityStat.smash_rate.desc())
        elif sort_by == "chaos_rating":
            stmt = stmt.order_by(EntityStat.chaos_rating.desc(), EntityStat.smash_rate.desc())
        else:
            stmt = stmt.order_by(EntityStat.smash_rate.desc(), EntityStat.total_votes.desc())

        stmt = stmt.limit(limit)
        rows = db.session.execute(stmt).all()

        leaderboard = []
        for rank, (entity, stat) in enumerate(rows, start=1):
            rate = stat.smash_rate if stat.smash_rate is not None else 0.0
            if rate >= 80.0:
                tier = "God Tier"
            elif rate >= 60.0:
                tier = "Fatal Attraction"
            elif rate >= 40.0:
                tier = "Friendzone"
            else:
                tier = "Eldritch Void"

            item = entity.to_dict()
            item["rank"] = rank
            item["tier"] = tier
            item["character_slug"] = entity.slug
            item["character_name"] = entity.name
            item["edition"] = target_slug
            item["smash_count"] = stat.smash_count
            item["pass_count"] = stat.pass_count
            item["super_smash_count"] = stat.super_smash_count
            item["total_votes"] = stat.total_votes
            item["smash_rate"] = stat.smash_rate
            item["chaos_rating"] = stat.chaos_rating
            leaderboard.append(item)

        return leaderboard

    def reset_session_votes(
        self, session_id: str, roster_slug: str | None = None
    ) -> dict[str, Any]:
        try:
            stmt = select(Vote).where(Vote.session_id == session_id)
            if roster_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == roster_slug))
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(Entity.roster_id == roster.id)
                else:
                    return {"status": "success", "reset_count": 0}

            votes = db.session.scalars(stmt).all()
            reset_count = len(votes)

            for vote in votes:
                stat = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == vote.entity_id))
                if stat:
                    if vote.vote_type == "smash":
                        stat.smash_count = max(0, stat.smash_count - 1)
                    elif vote.vote_type == "pass":
                        stat.pass_count = max(0, stat.pass_count - 1)
                    elif vote.vote_type == "super_smash":
                        stat.super_smash_count = max(0, stat.super_smash_count - 1)
                    stat.calculate_rate()

                db.session.delete(vote)

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting session votes: {e}")
            raise e

    def reset_user_votes(
        self,
        user_id: int,
        roster_slug: str | None = None,
        edition: str | None = None,
    ) -> dict[str, Any]:
        try:
            target_slug = roster_slug or edition
            stmt = select(Vote).where(Vote.user_id == user_id)
            if target_slug:
                roster = db.session.scalar(select(Roster).where(Roster.slug == target_slug))
                if roster:
                    stmt = stmt.join(Entity, Vote.entity_id == Entity.id).where(Entity.roster_id == roster.id)
                else:
                    return {"status": "success", "reset_count": 0}

            votes = db.session.scalars(stmt).all()
            reset_count = len(votes)

            for vote in votes:
                stat = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == vote.entity_id))
                if stat:
                    if vote.vote_type == "smash":
                        stat.smash_count = max(0, stat.smash_count - 1)
                    elif vote.vote_type == "pass":
                        stat.pass_count = max(0, stat.pass_count - 1)
                    elif vote.vote_type == "super_smash":
                        stat.super_smash_count = max(0, stat.super_smash_count - 1)
                    stat.calculate_rate()

                db.session.delete(vote)

            try:
                leg_stmt = select(SmashPassVote).where(SmashPassVote.user_id == user_id)
                if target_slug:
                    leg_stmt = leg_stmt.where(SmashPassVote.edition == target_slug)
                leg_votes = db.session.scalars(leg_stmt).all()
                for lv in leg_votes:
                    ls = db.session.scalar(
                        select(SmashPassStat).where(
                            SmashPassStat.character_slug == lv.character_slug,
                            SmashPassStat.edition == lv.edition,
                        )
                    )
                    if ls:
                        if lv.vote_type == "smash":
                            ls.smash_count = max(0, ls.smash_count - 1)
                        elif lv.vote_type == "pass":
                            ls.pass_count = max(0, ls.pass_count - 1)
                        elif lv.vote_type == "super_smash":
                            ls.super_smash_count = max(0, ls.super_smash_count - 1)
                        ls.calculate_rate()
                    db.session.delete(lv)
            except Exception:
                pass

            db.session.commit()
            return {"status": "success", "reset_count": reset_count}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error resetting user votes: {e}")
            raise e

    def get_translations(self, locale: str = "en") -> dict[str, str]:
        self.ensure_seeded()
        stmt = select(Translation).where(Translation.locale == locale)
        trans = db.session.scalars(stmt).all()
        if not trans and locale != "en":
            stmt_en = select(Translation).where(Translation.locale == "en")
            trans = db.session.scalars(stmt_en).all()
        return {t.key: t.value for t in trans}

    def get_editions(self) -> list[dict[str, Any]]:
        return self.get_rosters(active_only=True)

    def get_characters_with_stats(
        self,
        edition: str = "canon",
        role: str | None = None,
        gender: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return []

        stmt = (
            select(Entity)
            .options(joinedload(Entity.stat))
            .where(
                Entity.roster_id == roster.id,
                Entity.is_active.is_(True),
            )
        )
        if role and role != "all":
            stmt = stmt.where(Entity.role == role)
        if gender and gender != "all":
            stmt = stmt.where(Entity.gender == gender)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(or_(Entity.name.ilike(pattern), Entity.slug.ilike(pattern)))

        stmt = stmt.order_by(Entity.order_index)
        entities = db.session.scalars(stmt).all()
        result = []
        for e in entities:
            d = e.to_dict()
            stat = e.stat
            d["character_slug"] = e.slug
            d["character_name"] = e.name
            d["edition"] = edition
            d["smash_count"] = stat.smash_count if stat else 0
            d["pass_count"] = stat.pass_count if stat else 0
            d["super_smash_count"] = stat.super_smash_count if stat else 0
            d["total_votes"] = stat.total_votes if stat else 0
            d["smash_rate"] = stat.smash_rate if stat else 0.0
            d["chaos_rating"] = stat.chaos_rating if stat else 50.0
            result.append(d)
        return result

    def get_character_stat(
        self, character_slug: str, edition: str = "canon"
    ) -> dict[str, Any] | None:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return None
        entity = db.session.scalar(
            select(Entity)
            .options(joinedload(Entity.stat))
            .where(
                Entity.roster_id == roster.id,
                Entity.slug == character_slug,
            )
        )
        if not entity or not entity.stat:
            return None
        d = entity.to_dict()
        stat = entity.stat
        d["character_slug"] = entity.slug
        d["character_name"] = entity.name
        d["edition"] = edition
        d["smash_count"] = stat.smash_count
        d["pass_count"] = stat.pass_count
        d["super_smash_count"] = stat.super_smash_count
        d["total_votes"] = stat.total_votes
        d["smash_rate"] = stat.smash_rate
        d["chaos_rating"] = stat.chaos_rating
        return d

    def get_user_votes(
        self, user_id: int, edition: str = "canon"
    ) -> list[dict[str, Any]]:
        self.ensure_seeded()
        roster = db.session.scalar(select(Roster).where(Roster.slug == edition))
        if not roster:
            return []
        stmt = (
            select(Vote, Entity)
            .join(Entity, Vote.entity_id == Entity.id)
            .where(Vote.user_id == user_id, Entity.roster_id == roster.id)
        )
        rows = db.session.execute(stmt).all()
        res = []
        for v, e in rows:
            vd = v.to_dict()
            vd["character_slug"] = e.slug
            vd["edition"] = edition
            res.append(vd)
        return res

    def reset_stats(self) -> dict[str, Any]:
        try:
            db.session.execute(delete(Vote))
            db.session.execute(delete(EntityStat))
            db.session.execute(delete(SmashPassVote))
            db.session.execute(delete(SmashPassStat))
            db.session.commit()
            seed_smash_rosters()
            return {
                "status": "reset_complete",
                "message": "All smash-or-pass stats reset to 0",
            }
        except Exception as e:
            db.session.rollback()
            raise e
```

### backend/app/routes/others/__init__.py
```python
from .draft import draft_bp
from .quests import quests_bp
from .killer_calc import killer_calc_bp
from .builds import builds_bp
from .custom_perks import custom_perks_bp
from .guesser import guesser_bp
from .smash_or_pass import smash_or_pass_bp

__all__ = [
    "draft_bp",
    "quests_bp",
    "killer_calc_bp",
    "builds_bp",
    "custom_perks_bp",
    "guesser_bp",
    "smash_or_pass_bp",
]
```

### backend/app/routes/others/builds.py
```python
from flask import Blueprint, current_app, jsonify, request
from app.services.others.build_service import BuildService

builds_bp = Blueprint("builds", __name__, url_prefix="/api/v1/builds")
_default_build_service: BuildService | None = None


def get_build_service() -> BuildService:
    if current_app and current_app.config.get("BUILD_SERVICE"):
        return current_app.config["BUILD_SERVICE"]
    global _default_build_service
    if _default_build_service is None:
        _default_build_service = BuildService()
    return _default_build_service


@builds_bp.route("/", methods=["GET"])
@builds_bp.route("", methods=["GET"])
def get_builds():
    role = request.args.get("role")
    category = request.args.get("category")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", "upvotes")

    service = get_build_service()
    builds = service.get_builds(role=role, category=category, search=search, sort_by=sort_by)
    return jsonify({"status": "success", "builds": builds}), 200


@builds_bp.route("/", methods=["POST"])
@builds_bp.route("", methods=["POST"])
def create_build():
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    description = data.get("description", "")
    role = data.get("role")
    category = data.get("category", "meta")
    character_id = data.get("character_id") or data.get("character", "all")
    perks = data.get("perks", [])
    author = data.get("author", "Community")

    if not title or not role:
        return jsonify({"error": "Fields 'title' and 'role' are required."}), 400

    service = get_build_service()
    try:
        build = service.create_build(
            title=title,
            description=description,
            role=role,
            category=category,
            perks=perks,
            character_id=character_id,
            author=author
        )
        return jsonify({"status": "success", "build": build}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@builds_bp.route("/<int:build_id>/upvote", methods=["POST"])
def upvote_build(build_id: int):
    service = get_build_service()
    try:
        updated_build = service.upvote_build(build_id)
        return jsonify({"status": "success", "build": updated_build}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
```

### backend/app/routes/others/custom_perks.py
```python
from flask import Blueprint, jsonify, request
from app.services.others.custom_perk_service import CustomPerkService

custom_perks_bp = Blueprint("custom_perks", __name__, url_prefix="/api/v1/custom-perks")
service = CustomPerkService()


@custom_perks_bp.route("/", methods=["GET"], strict_slashes=False)
def list_custom_perks():
    role = request.args.get("role")
    rarity = request.args.get("rarity")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", "newest")

    perks = service.get_custom_perks(
        role=role,
        rarity=rarity,
        search=search,
        sort_by=sort_by
    )
    return jsonify({
        "custom_perks": perks,
        "total": len(perks)
    }), 200


@custom_perks_bp.route("/", methods=["POST"], strict_slashes=False)
def create_custom_perk():
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    description = data.get("description")

    if not name or not str(name).strip():
        return jsonify({"error": "Perk name is required"}), 400

    if not description or not str(description).strip():
        return jsonify({"error": "Perk description is required"}), 400

    role = data.get("role", "survivor")
    character_name = data.get("character_name", "Teachable")
    rarity = data.get("rarity", "Very Rare")
    icon_preset = data.get("icon_preset", "sparkles")
    author = data.get("author", "Community")

    perk = service.create_custom_perk(
        name=name,
        role=role,
        character_name=character_name,
        rarity=rarity,
        icon_preset=icon_preset,
        description=description,
        author=author
    )

    return jsonify({
        "custom_perk": perk,
        "message": "Custom perk concept created successfully"
    }), 201


@custom_perks_bp.route("/<int:perk_id>/upvote", methods=["POST"], strict_slashes=False)
def upvote_custom_perk(perk_id: int):
    perk = service.upvote_custom_perk(perk_id)
    if not perk:
        return jsonify({"error": "Custom perk concept not found"}), 404

    return jsonify({
        "custom_perk": perk,
        "message": "Upvoted successfully"
    }), 200
```

### backend/app/routes/others/draft.py
```python
from flask import Blueprint, current_app, jsonify, request
from app.services.others.draft_service import DraftService

draft_bp = Blueprint("draft", __name__, url_prefix="/api/v1/draft")
_default_draft_service: DraftService | None = None


def get_draft_service() -> DraftService:
    if current_app and current_app.config.get("DRAFT_SERVICE"):
        return current_app.config["DRAFT_SERVICE"]
    global _default_draft_service
    if _default_draft_service is None:
        _default_draft_service = DraftService()
    return _default_draft_service


@draft_bp.route("/create", methods=["POST"])
def create_draft():
    data = request.get_json(silent=True) or {}
    room_code = data.get("room_code")
    service = get_draft_service()
    room = service.create_room(room_code=room_code)
    return jsonify({"status": "success", "room": room}), 201


@draft_bp.route("/<room_code>", methods=["GET"])
def get_draft(room_code: str):
    service = get_draft_service()
    room = service.get_room(room_code)
    if not room:
        return jsonify({"error": f"Draft room '{room_code}' not found."}), 404
    return jsonify({"status": "success", "room": room}), 200


@draft_bp.route("/<room_code>/action", methods=["POST"])
def process_draft_action(room_code: str):
    data = request.get_json(silent=True) or {}
    service = get_draft_service()
    try:
        updated_room = service.process_action(room_code, data)
        return jsonify({"status": "success", "room": updated_room}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
```

### backend/app/routes/others/guesser.py
```python
from flask import Blueprint, jsonify, request
from app.services.others.guesser_service import GuesserService

guesser_bp = Blueprint("guesser", __name__, url_prefix="/api/v1/guesser")
guesser_service = GuesserService()


@guesser_bp.route("/stats", methods=["GET"])
def get_stats():
    try:
        stats = guesser_service.get_all_stats()
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@guesser_bp.route("/stats", methods=["POST"])
def post_result():
    payload = request.get_json(silent=True) or {}
    guesser_type = payload.get("guesser_type")
    is_correct = payload.get("is_correct")
    
    if guesser_type is None or is_correct is None:
        return jsonify({"error": "Fields 'guesser_type' and 'is_correct' are required"}), 400
        
    valid_types = {"character", "perk_description", "perk_name_to_icon", "perk_icon_to_name", "memes"}
    if guesser_type not in valid_types:
        return jsonify({"error": f"Invalid guesser_type: {guesser_type}"}), 400
        
    try:
        updated = guesser_service.update_stats(guesser_type, bool(is_correct))
        return jsonify({"data": updated}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@guesser_bp.route("/reset", methods=["POST"])
def reset_streak():
    payload = request.get_json(silent=True) or {}
    guesser_type = payload.get("guesser_type")
    
    if not guesser_type:
        return jsonify({"error": "Field 'guesser_type' is required"}), 400
        
    valid_types = {"character", "perk_description", "perk_name_to_icon", "perk_icon_to_name", "memes"}
    if guesser_type not in valid_types:
        return jsonify({"error": f"Invalid guesser_type: {guesser_type}"}), 400
        
    try:
        updated = guesser_service.reset_streak(guesser_type)
        return jsonify({"data": updated}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### backend/app/routes/others/killer_calc.py
```python
from flask import Blueprint, jsonify, request
from app.services.others.killer_calc_service import KillerCalcService

killer_calc_bp = Blueprint("killer_calc", __name__, url_prefix="/api/v1/killer-calc")
calc_service = KillerCalcService()


@killer_calc_bp.route("/data", methods=["GET"])
def get_killer_calc_data():
    """Return all available killers, power stats, add-ons, and perks for the calculator."""
    return jsonify({
        "status": "success",
        "killers": calc_service.get_killers(),
        "perks": calc_service.get_perks()
    }), 200


@killer_calc_bp.route("/calculate", methods=["POST"])
def calculate():
    """Calculate exact stat deltas and modified terror radius for given killer, add-ons, and perks."""
    data = request.get_json(silent=True) or {}

    killer_id = data.get("killer_id", "huntress")
    addon_ids = data.get("addon_ids", [])
    perk_ids = data.get("perk_ids", [])
    perk_options = data.get("perk_options", {})

    try:
        result = calc_service.calculate(
            killer_id=killer_id,
            addon_ids=addon_ids,
            perk_ids=perk_ids,
            perk_options=perk_options
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to calculate stats", "details": str(e)}), 500
```

### backend/app/routes/others/quests.py
```python
from flask import Blueprint, current_app, jsonify, request
from app.services.others.quest_service import QuestService

quests_bp = Blueprint("quests", __name__, url_prefix="/api/v1/quests")
_default_quest_service: QuestService | None = None


def get_quest_service() -> QuestService:
    if current_app and current_app.config.get("QUEST_SERVICE"):
        return current_app.config["QUEST_SERVICE"]
    global _default_quest_service
    if _default_quest_service is None:
        _default_quest_service = QuestService()
    return _default_quest_service


@quests_bp.route("/", methods=["GET"])
def get_active_quests():
    service = get_quest_service()
    quests = service.get_quests()
    return jsonify({"status": "success", "quests": quests}), 200


@quests_bp.route("/claim", methods=["POST"])
def claim_quest():
    data = request.get_json(silent=True) or {}
    quest_id = data.get("quest_id") or data.get("id")
    if quest_id is None:
        return jsonify({"error": "Missing 'quest_id' parameter."}), 400

    service = get_quest_service()
    try:
        res = service.claim_quest(quest_id)
        return jsonify({"status": "success", **res}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
```

### backend/app/routes/others/smash_or_pass.py
```python
import logging
import threading
import time
from collections import defaultdict
from flask import Blueprint, jsonify, request
from sqlalchemy import select

from app.core.extensions import db
from app.core.limiter import get_client_ip
from app.core.security import get_current_user
from app.models.smash_or_pass import Roster
from app.services.others.smash_or_pass_service import SmashOrPassService

logger = logging.getLogger(__name__)

smash_or_pass_bp = Blueprint("smash_or_pass", __name__, url_prefix="/api/v1/smash-or-pass")
smash_service = SmashOrPassService()


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter per client identifier with auto-pruning."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60, prune_interval: int = 50):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prune_interval = prune_interval
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._call_count = 0

    def is_allowed(self, client_key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            self._call_count += 1
            if self._call_count >= self.prune_interval:
                self._prune_stale_keys(cutoff)
                self._call_count = 0

            timestamps = self._requests[client_key]
            filtered = [t for t in timestamps if t > cutoff]
            if len(filtered) >= self.max_requests:
                self._requests[client_key] = filtered
                return False
            filtered.append(now)
            self._requests[client_key] = filtered
            return True

    def _prune_stale_keys(self, cutoff: float) -> None:
        stale_keys = [k for k, v in self._requests.items() if not v or max(v) <= cutoff]
        for k in stale_keys:
            del self._requests[k]

    def reset(self) -> None:
        with self._lock:
            self._requests.clear()
            self._call_count = 0


vote_rate_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)


@smash_or_pass_bp.route("/rosters", methods=["GET"])
def get_rosters():
    """Retrieve all active rosters with real-time stats."""
    try:
        rosters = smash_service.get_rosters(active_only=True)
        return jsonify({"data": rosters, "count": len(rosters)}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass rosters: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/rosters/<slug>/feed", methods=["GET"])
def get_roster_feed(slug: str):
    """Retrieve unvoted entities feed for a given roster and session/user."""
    session_id = (
        request.args.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    user_id = request.args.get("user_id", type=int)
    role = request.args.get("role")
    gender = request.args.get("gender")
    limit = request.args.get("limit", default=50, type=int)

    current_user = get_current_user()
    if current_user:
        user_id = current_user.id

    try:
        feed_data = smash_service.get_feed(
            roster_slug=slug,
            session_id=session_id,
            user_id=user_id,
            role=role,
            gender=gender,
            limit=limit,
        )
        if feed_data is None:
            return jsonify({"error": f"Roster '{slug}' not found"}), 404

        return jsonify({"data": feed_data}), 200
    except Exception as e:
        logger.error(f"Error fetching feed for roster '{slug}': {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/vote", methods=["POST"])
def cast_vote():
    """Cast a vote (smash, pass, super_smash) for an entity or character."""
    payload = request.get_json(silent=True) or {}
    entity_id = payload.get("entity_id")
    character_slug = payload.get("character_slug") or payload.get("slug")
    vote_type = payload.get("vote_type") or payload.get("vote")
    roster_slug = payload.get("roster_slug") or payload.get("edition") or "canon"
    edition = payload.get("edition") or payload.get("roster_slug") or "canon"
    session_id = (
        payload.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )

    current_user = get_current_user()
    user_id = current_user.id if current_user else None

    remote_ip = get_client_ip()
    sub_key = session_id or (f"user:{user_id}" if user_id else "anon")
    client_key = f"{remote_ip}:{sub_key}"

    if not vote_rate_limiter.is_allowed(client_key):
        return (
            jsonify(
                {
                    "error": "Rate limit exceeded. Maximum 60 votes per minute allowed.",
                    "status": 429,
                }
            ),
            429,
        )

    if not entity_id and not character_slug:
        return (
            jsonify(
                {"error": "Fields 'entity_id' or 'character_slug' and 'vote_type' are required"}
            ),
            400,
        )

    if not vote_type:
        return jsonify({"error": "Field 'vote_type' is required"}), 400

    if vote_type not in {"smash", "pass", "super_smash"}:
        return (
            jsonify(
                {
                    "error": f"Invalid vote_type '{vote_type}'. Must be one of ('smash', 'pass', 'super_smash')"
                }
            ),
            400,
        )

    try:
        result = smash_service.cast_vote(
            entity_id=entity_id,
            character_slug=character_slug,
            vote_type=vote_type,
            session_id=session_id,
            user_id=user_id,
            roster_slug=roster_slug,
            edition=edition,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as e:
        logger.error(f"Error casting smash-or-pass vote: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/rosters/<slug>/leaderboard", methods=["GET"])
def get_roster_leaderboard(slug: str):
    """Retrieve ranked leaderboard for a given roster."""
    sort_by = request.args.get("sort_by", "smash_rate")
    role = request.args.get("role")
    gender = request.args.get("gender")
    limit = request.args.get("limit", default=100, type=int)

    try:
        roster_obj = db.session.scalar(select(Roster).where(Roster.slug == slug))
        if not roster_obj:
            return jsonify({"error": f"Roster '{slug}' not found"}), 404

        leaderboard = smash_service.get_leaderboard(
            roster_slug=slug,
            role=role,
            gender=gender,
            sort_by=sort_by,
            limit=limit,
        )
        return (
            jsonify(
                {
                    "data": leaderboard,
                    "count": len(leaderboard),
                    "roster": slug,
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error fetching leaderboard for roster '{slug}': {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/session/reset", methods=["POST"])
def reset_session():
    """Reset and unwind votes cast in a session."""
    payload = request.get_json(silent=True) or {}
    session_id = (
        payload.get("session_id")
        or request.args.get("session_id")
        or request.headers.get("X-Session-ID")
        or request.cookies.get("session_id")
    )
    roster_slug = (
        payload.get("roster_slug")
        or payload.get("edition")
        or request.args.get("roster_slug")
        or request.args.get("edition")
    )

    if not session_id:
        return jsonify({"error": "Field 'session_id' is required to reset session votes"}), 400

    try:
        result = smash_service.reset_session_votes(
            session_id=session_id, roster_slug=roster_slug
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting session votes: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/user-votes/reset", methods=["POST"])
def reset_user_votes():
    """Reset and wipe all votes for a specific user and recalculate stats."""
    payload = request.get_json(silent=True) or {}
    requested_user_id = payload.get("user_id") or request.args.get("user_id", type=int)
    roster_slug = (
        payload.get("roster_slug")
        or payload.get("edition")
        or request.args.get("roster_slug")
        or request.args.get("edition")
    )
    edition = (
        payload.get("edition")
        or payload.get("roster_slug")
        or request.args.get("edition")
        or request.args.get("roster_slug")
    )

    current_user = get_current_user()
    if current_user:
        if requested_user_id and requested_user_id != current_user.id and current_user.role != "admin":
            return jsonify({"error": "Forbidden: Cannot reset votes for another user"}), 403
        target_user_id = requested_user_id if (current_user.role == "admin" and requested_user_id) else current_user.id
    else:
        if requested_user_id:
            return jsonify({"error": "Authentication required to reset user votes"}), 401
        return jsonify({"error": "Field 'user_id' is required to reset user votes"}), 400

    try:
        result = smash_service.reset_user_votes(
            user_id=target_user_id,
            roster_slug=roster_slug,
            edition=edition,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting user smash-or-pass votes: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/translations", methods=["GET"])
def get_translations():
    """Retrieve dynamic translations dictionary for a given locale."""
    locale = request.args.get("locale", "en")
    try:
        translations = smash_service.get_translations(locale=locale)
        return jsonify({"data": translations, "locale": locale}), 200
    except Exception as e:
        logger.error(f"Error fetching translations for locale '{locale}': {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/editions", methods=["GET"])
def get_editions():
    """Retrieve available smash or pass editions (legacy)."""
    try:
        editions = smash_service.get_editions()
        return jsonify({"data": editions, "count": len(editions)}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass editions: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/characters", methods=["GET"])
def get_characters():
    """Retrieve character list with stats filtered by edition, role, gender, or search query (legacy)."""
    edition = request.args.get("edition", "canon")
    role = request.args.get("role")
    gender = request.args.get("gender")
    search = request.args.get("q") or request.args.get("search")

    try:
        data = smash_service.get_characters_with_stats(
            edition=edition, role=role, gender=gender, search=search
        )
        return jsonify({"count": len(data), "data": data, "edition": edition}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass characters: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/user-votes", methods=["GET"])
def get_user_votes():
    """Retrieve all votes cast by the current user for no-repeat deck filtering (legacy)."""
    requested_user_id = request.args.get("user_id", type=int)
    edition = request.args.get("edition", "canon")

    current_user = get_current_user()
    if current_user:
        if requested_user_id and requested_user_id != current_user.id and current_user.role != "admin":
            return jsonify({"error": "Forbidden: Cannot view votes for another user"}), 403
        target_user_id = requested_user_id if (current_user.role == "admin" and requested_user_id) else current_user.id
    else:
        target_user_id = requested_user_id

    if not target_user_id:
        return jsonify({"data": [], "message": "No user_id provided"}), 200

    try:
        votes = smash_service.get_user_votes(user_id=target_user_id, edition=edition)
        return jsonify({"data": votes, "count": len(votes)}), 200
    except Exception as e:
        logger.error(f"Error fetching user smash-or-pass votes: {e}")
        return jsonify({"error": str(e)}), 500
```
