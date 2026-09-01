# backend/tests/unit/scrapers/test_db_sync_maps_pruning.py
"""Regression test for the stale Hens333 map-row pruning fix in
sync_maps_to_db(): a re-scrape must delete rows whose map_id no longer
appears in the fresh scrape, mirroring sync_items_to_db/sync_addons_to_db.
"""
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.map import MapRealm
from app.scrapers.types import MapData
from app.services.scraper.db_sync import sync_maps_to_db


def test_sync_maps_to_db_prunes_stale_rows_on_id_scheme_change(db_session: Session) -> None:
    # Simulate the pre-fix state: 58 rows under the *old* realm-derived map_id
    # scheme (e.g. "hens_general_realm_blood_lodge") already live in the DB.
    for i in range(58):
        db_session.add(
            MapRealm(
                map_id=f"hens_general_realm_stale_map_{i}",
                name=f"Stale Map {i}",
                realm="Autohaven Wreckers",
                realm_id="autohaven_wreckers",
                source="hens333",
                source_label="Hens333 12-Clock Callouts",
                layout_type="Standard",
                jungle_gyms_count=4,
                totem_spawns_count=5,
                pallet_density="Medium",
                shack_has_basement=True,
                description="pre-fix stale row",
            )
        )
    db_session.commit()

    assert (
        db_session.scalar(
            select(func.count()).select_from(MapRealm).where(MapRealm.source == "hens333")
        )
        == 58
    )

    # A fresh scrape now returns the *new* realm-slug-qualified map_id scheme
    # for the same 58 logical maps -- none of the old ids appear anymore.
    fresh_maps = [
        MapData(
            id=f"hens_autohaven_wreckers_stale_map_{i}",
            name=f"Stale Map {i}",
            realm="Autohaven Wreckers",
            realm_id="autohaven_wreckers",
            callout_image_url="",
            callout_image_local_path="",
            dpath="",
            clock_system={},
        )
        for i in range(58)
    ]

    sync_maps_to_db(fresh_maps)

    total = db_session.scalar(
        select(func.count()).select_from(MapRealm).where(MapRealm.source == "hens333")
    )
    assert total == 58, f"expected pruning to leave exactly 58 rows, got {total}"

    remaining_ids = set(
        db_session.scalars(select(MapRealm.map_id).where(MapRealm.source == "hens333")).all()
    )
    assert all(mid.startswith("hens_autohaven_wreckers_") for mid in remaining_ids)
    assert not any(mid.startswith("hens_general_realm_") for mid in remaining_ids)
