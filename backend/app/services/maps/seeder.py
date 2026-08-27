# backend/app/services/maps/seeder.py
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

