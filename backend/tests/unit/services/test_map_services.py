# backend/tests/unit/services/test_map_services.py
"""Unit tests for fetch_maps, fetch_realms, and MapService queries."""
from unittest.mock import MagicMock
import pytest
from sqlalchemy.orm import Session

from app.models.map import MapRealm, MapSource, Realm
from app.services.map_service import MapService
from app.services.maps.queries import fetch_maps, fetch_realms


def _seed_map_catalog(db_session: Session) -> None:
    """Helper to populate sample realms, sources, and maps in memory."""
    autohaven = Realm(
        id=2,
        name="Autohaven Wreckers",
        translations={"de": {"name": "Autohaven-Schrottplatz"}},
    )
    gideon = Realm(id=10, name="Gideon Meat Plant")
    silenthill = Realm(
        id=15,
        name="Silent Hill",
        translations={"ja": {"name": "サイレントヒル"}},
    )
    db_session.add_all([autohaven, gideon, silenthill])

    source = MapSource(id=1, code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add(source)
    db_session.flush()

    m1 = MapRealm(
        id=1,
        name="Azarov's Resting Place",
        realm_id=autohaven.id,
        source_id=source.id,
        layout_type="Outdoor",
        pallet_density="Medium",
        jungle_gyms_count=4,
        is_shack=True,
        size_sq_tiles=176.0,
        size_sq_meters=11264,
        translations={"de": {"name": "Azarovs Ruhestätte"}},
    )
    m2 = MapRealm(
        id=43,
        name="The Game",
        realm_id=gideon.id,
        source_id=source.id,
        layout_type="Indoor",
        pallet_density="Very High",
        jungle_gyms_count=0,
        is_shack=False,
        size_sq_tiles=142.0,
        size_sq_meters=9088,
    )
    m3 = MapRealm(
        id=45,
        name="Midwich Elementary School",
        realm_id=silenthill.id,
        source_id=source.id,
        layout_type="Indoor",
        pallet_density="Low",
        jungle_gyms_count=0,
        is_shack=False,
        size_sq_tiles=113.5,
        size_sq_meters=7264,
        translations={"ja": {"name": "ミッドウィッチ小学校"}},
    )
    db_session.add_all([m1, m2, m3])
    db_session.commit()


@pytest.mark.unit
def test_fetch_realms_query(db_session: Session) -> None:
    """Verify fetch_realms retrieval and localization."""
    _seed_map_catalog(db_session)

    all_realms = fetch_realms()
    assert len(all_realms) == 3
    names = [r["name"] for r in all_realms]
    assert "Autohaven Wreckers" in names
    assert "Silent Hill" in names

    localized = fetch_realms(lang="ja")
    loc_names = [r["name"] for r in localized]
    assert "サイレントヒル" in loc_names


@pytest.mark.unit
def test_fetch_maps_all(db_session: Session) -> None:
    """Verify fetch_maps returns all maps with layout properties."""
    _seed_map_catalog(db_session)
    service = MapService()
    maps = service.get_maps()

    assert len(maps) == 3
    midwich = next(m for m in maps if m["name"] == "Midwich Elementary School")
    assert midwich["layout_type"] == "Indoor"
    assert midwich["jungle_gyms_count"] == 0
    assert midwich["is_shack"] is False
    assert midwich["size_sq_tiles"] == 113.5
    assert midwich["size_sq_meters"] == 7264


@pytest.mark.unit
def test_fetch_maps_filter_by_realm(db_session: Session) -> None:
    """Verify filtering maps by realm name."""
    _seed_map_catalog(db_session)
    service = MapService()

    results = service.get_maps(realm="Gideon Meat Plant")
    assert len(results) == 1
    assert results[0]["name"] == "The Game"
    assert results[0]["pallet_density"] == "Very High"

    all_results = service.get_maps(realm="all")
    assert len(all_results) == 3


@pytest.mark.unit
def test_fetch_maps_filter_by_source(db_session: Session) -> None:
    """Verify filtering maps by source code."""
    _seed_map_catalog(db_session)
    service = MapService()

    hens_maps = service.get_maps(source="hens333")
    assert len(hens_maps) == 3

    empty_maps = service.get_maps(source="unknown_source")
    assert len(empty_maps) == 0


@pytest.mark.unit
def test_fetch_maps_filter_by_search(db_session: Session) -> None:
    """Verify search filter on map or realm name."""
    _seed_map_catalog(db_session)
    service = MapService()

    by_map = service.get_maps(search="azarov")
    assert len(by_map) == 1
    assert by_map[0]["name"] == "Azarov's Resting Place"

    by_realm = service.get_maps(search="Silent")
    assert len(by_realm) == 1
    assert by_realm[0]["name"] == "Midwich Elementary School"


@pytest.mark.unit
def test_fetch_maps_raw_sqlite_fallback() -> None:
    """Test the raw SQLite execution path parsing layout figures and sizes."""
    mock_db_service = MagicMock()
    mock_conn = MagicMock()
    mock_cursor = MagicMock()

    mock_db_service.get_connection.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor

    mock_cursor.fetchall.side_effect = [
        [(0, "id"), (1, "name"), (2, "layout_type"), (3, "size_sq_tiles")],
        [
            {
                "id": 99,
                "name": "Custom Test Map",
                "realm_id": 1,
                "source_id": 1,
                "realm_name": "Test Realm",
                "source_code": "hens333",
                "source_label": "Hens333 12-Clock Callouts",
                "layout_type": "Indoor",
                "pallet_density": "Low",
                "jungle_gyms_count": 0,
                "is_shack": 0,
                "is_main_building": 1,
                "size_sq_tiles": 120.0,
                "size_sq_meters": 7680,
                "description": "Fallback row",
                "callout_image_url": "https://example.com/fallback.webp",
            }
        ],
    ]

    results = fetch_maps(use_sqlalchemy=False, db_service=mock_db_service)
    assert len(results) == 1
    row = results[0]
    assert row["id"] == 99
    assert row["layout_type"] == "Indoor"
    assert row["pallet_density"] == "Low"
    assert row["jungle_gyms_count"] == 0
    assert row["is_shack"] is False
    assert row["is_main_building"] is True
    assert row["size_sq_tiles"] == 120.0
    assert row["size_sq_meters"] == 7680
