### backend/tests/unit/models/test_map_models.py
```python
"""Unit tests for Map SQLAlchemy models: Realm, MapSource, and MapRealm."""
import pytest
from sqlalchemy.orm import Session

from app.models.map import (
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_SHACK_HAS_BASEMENT,
    DEFAULT_SOURCE_CODE,
    DEFAULT_SOURCE_LABEL,
    DEFAULT_TOTEM_SPAWNS,
    MapRealm,
    MapSource,
    Realm,
)


@pytest.mark.unit
def test_realm_creation_and_localized_name(db_session: Session) -> None:
    """Test Realm creation, default values, localized_name, and fallbacks."""
    realm = Realm(
        name="The Macmillan Estate",
        image_url="https://example.com/macmillan.webp",
        image_local_path="realms/macmillan.webp",
        translations={
            "de": {"name": "Das MacMillan-Anwesen"},
            "pl": {"name": "Posiadłość MacMillanów"},
        },
    )
    db_session.add(realm)
    db_session.commit()

    assert realm.id is not None
    assert realm.localized_name("de") == "Das MacMillan-Anwesen"
    assert realm.localized_name("pl") == "Posiadłość MacMillanów"
    assert realm.localized_name("es") == "The Macmillan Estate"
    assert realm.localized_name(None) == "The Macmillan Estate"


@pytest.mark.unit
def test_realm_to_dict_representation(db_session: Session) -> None:
    """Test Realm.to_dict format and localization response."""
    realm = Realm(
        name="Coldwind Farm",
        image_url="https://example.com/coldwind.webp",
        image_local_path="realms/coldwind.webp",
        translations={"de": {"name": "Farmland des Grauens"}},
    )
    db_session.add(realm)
    db_session.commit()

    serialized = realm.to_dict(lang="de")
    assert serialized == {
        "id": realm.id,
        "name": "Farmland des Grauens",
        "raw_name": "Coldwind Farm",
        "image_url": "https://example.com/coldwind.webp",
        "image_local_path": "realms/coldwind.webp",
    }


@pytest.mark.unit
def test_map_source_creation_and_to_dict(db_session: Session) -> None:
    """Test MapSource creation and serialization."""
    source = MapSource(code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add(source)
    db_session.commit()

    assert source.id is not None
    assert source.to_dict() == {
        "id": source.id,
        "code": "hens333",
        "label": "Hens333 12-Clock Callouts",
    }


@pytest.mark.unit
def test_map_realm_defaults_fallback(db_session: Session) -> None:
    """Test that MapRealm assigns module defaults when layout fields are omitted."""
    realm = Realm(name="Autohaven Wreckers")
    source = MapSource(code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add_all([realm, source])
    db_session.flush()

    map_entry = MapRealm(
        name="Fallback Test Map",
        realm_id=realm.id,
        source_id=source.id,
    )
    db_session.add(map_entry)
    db_session.commit()

    assert map_entry.layout_type == DEFAULT_LAYOUT_TYPE
    assert map_entry.pallet_density == DEFAULT_PALLET_DENSITY
    assert map_entry.jungle_gyms_count == DEFAULT_JUNGLE_GYMS
    assert map_entry.totem_spawns_count == DEFAULT_TOTEM_SPAWNS
    assert map_entry.shack_has_basement == DEFAULT_SHACK_HAS_BASEMENT
    assert map_entry.size_sq_tiles is None
    assert map_entry.size_sq_meters is None


@pytest.mark.unit
def test_map_realm_outdoor_attributes(db_session: Session) -> None:
    """Test outdoor map layout properties and measurements."""
    realm = Realm(name="Autohaven Wreckers")
    source = MapSource(code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add_all([realm, source])
    db_session.flush()

    azarov = MapRealm(
        name="Azarov's Resting Place",
        realm_id=realm.id,
        source_id=source.id,
        layout_type="Outdoor",
        pallet_density="Medium",
        jungle_gyms_count=4,
        totem_spawns_count=5,
        shack_has_basement=True,
        size_sq_tiles=176.0,
        size_sq_meters=11264,
        callout_image_url="https://example.com/azarov.webp",
        callout_image_local_path="maps/azarov.webp",
        translations={"de": {"name": "Azarovs Ruhestätte"}},
    )
    db_session.add(azarov)
    db_session.commit()

    assert azarov.layout_type == "Outdoor"
    assert azarov.pallet_density == "Medium"
    assert azarov.jungle_gyms_count == 4
    assert azarov.totem_spawns_count == 5
    assert azarov.shack_has_basement is True
    assert azarov.size_sq_tiles == 176.0
    assert azarov.size_sq_meters == 11264

    data = azarov.to_dict(lang="de")
    assert data["name"] == "Azarovs Ruhestätte"
    assert data["layout_type"] == "Outdoor"
    assert data["pallet_density"] == "Medium"
    assert data["jungle_gyms_count"] == 4
    assert data["totem_spawns_count"] == 5
    assert data["shack_has_basement"] is True
    assert data["size_sq_tiles"] == 176.0
    assert data["size_sq_meters"] == 11264
    assert data["image_url"] == "https://example.com/azarov.webp"


@pytest.mark.unit
def test_map_realm_indoor_attributes(db_session: Session) -> None:
    """Test indoor map attributes with zero jungle gyms, no shack, and float tile size."""
    realm = Realm(name="Silent Hill")
    source = MapSource(code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add_all([realm, source])
    db_session.flush()

    midwich = MapRealm(
        name="Midwich Elementary School",
        realm_id=realm.id,
        source_id=source.id,
        layout_type="Indoor",
        pallet_density="Low",
        jungle_gyms_count=0,
        totem_spawns_count=5,
        shack_has_basement=False,
        size_sq_tiles=113.5,
        size_sq_meters=7264,
        callout_image_url="https://example.com/midwich.gif",
        callout_image_local_path="maps/midwich.webp",
        translations={"ja": {"name": "ミッドウィッチ小学校"}},
    )
    db_session.add(midwich)
    db_session.commit()

    assert midwich.layout_type == "Indoor"
    assert midwich.pallet_density == "Low"
    assert midwich.jungle_gyms_count == 0
    assert midwich.shack_has_basement is False
    assert midwich.size_sq_tiles == 113.5
    assert midwich.size_sq_meters == 7264

    data = midwich.to_dict(lang="ja")
    assert data["name"] == "ミッドウィッチ小学校"
    assert data["jungle_gyms_count"] == 0
    assert data["shack_has_basement"] is False
    assert data["size_sq_tiles"] == 113.5
    assert data["size_sq_meters"] == 7264


@pytest.mark.unit
def test_map_realm_to_dict_keys_completeness(db_session: Session) -> None:
    """Verify that to_dict includes all required wire keys."""
    realm = Realm(name="Gideon Meat Plant")
    source = MapSource(code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add_all([realm, source])
    db_session.flush()

    the_game = MapRealm(
        name="The Game",
        realm_id=realm.id,
        source_id=source.id,
        layout_type="Indoor",
        pallet_density="Very High",
        jungle_gyms_count=0,
        totem_spawns_count=5,
        shack_has_basement=False,
        size_sq_tiles=142.0,
        size_sq_meters=9088,
        description="Gideon callout map",
    )
    db_session.add(the_game)
    db_session.commit()

    output = the_game.to_dict()
    required_keys = {
        "id",
        "name",
        "realm",
        "realm_id",
        "source_id",
        "source",
        "source_label",
        "callout_image_url",
        "callout_image_local_path",
        "image_url",
        "layout_type",
        "jungle_gyms_count",
        "totem_spawns_count",
        "pallet_density",
        "shack_has_basement",
        "size_sq_tiles",
        "size_sq_meters",
        "description",
    }
    assert required_keys.issubset(output.keys())
    assert output["source"] == "hens333"
    assert output["source_label"] == "Hens333 12-Clock Callouts"
    assert output["realm"] == "Gideon Meat Plant"
```

### backend/tests/unit/schemas/test_map_schemas.py
```python
"""Unit tests for Map Pydantic validation and serialization DTO schemas."""
import pytest
from pydantic import ValidationError

from app.schemas.map import (
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_SHACK_HAS_BASEMENT,
    DEFAULT_TOTEM_SPAWNS,
    MapRealmBase,
    MapRealmResponse,
    MapSourceBase,
    MapSourceResponse,
    RealmBase,
    RealmResponse,
)


@pytest.mark.unit
def test_realm_base_and_response_schemas() -> None:
    """Validate RealmBase input and RealmResponse wire serialization."""
    base_data = {
        "name": "Springwood",
        "image_url": "https://example.com/springwood.webp",
        "translations": {"de": {"name": "Springwood"}},
    }
    realm_base = RealmBase(**base_data)
    assert realm_base.name == "Springwood"

    resp_data = {
        "id": 9,
        "name": "Springwood",
        "raw_name": "Springwood",
        "image_url": "https://example.com/springwood.webp",
        "image_local_path": "realms/springwood.webp",
    }
    realm_resp = RealmResponse(**resp_data)
    assert realm_resp.id == 9
    assert realm_resp.raw_name == "Springwood"


@pytest.mark.unit
def test_map_source_schemas() -> None:
    """Validate MapSourceBase and MapSourceResponse."""
    src = MapSourceResponse(id=1, code="hens333", label="Hens333 12-Clock Callouts")
    assert src.id == 1
    assert src.code == "hens333"
    assert src.label == "Hens333 12-Clock Callouts"


@pytest.mark.unit
def test_map_realm_base_validation_error() -> None:
    """Ensure MapRealmBase raises validation errors when required fields are missing."""
    with pytest.raises(ValidationError):
        MapRealmBase(name="Incomplete Map")


@pytest.mark.unit
def test_map_realm_base_default_values() -> None:
    """Validate that MapRealmBase applies defaults when layout metrics are not provided."""
    model = MapRealmBase(name="Standard Test Map", realm_id=1, source_id=1)
    assert model.layout_type == DEFAULT_LAYOUT_TYPE
    assert model.pallet_density == DEFAULT_PALLET_DENSITY
    assert model.jungle_gyms_count == DEFAULT_JUNGLE_GYMS
    assert model.totem_spawns_count == DEFAULT_TOTEM_SPAWNS
    assert model.shack_has_basement == DEFAULT_SHACK_HAS_BASEMENT
    assert model.size_sq_tiles is None
    assert model.size_sq_meters is None


@pytest.mark.unit
def test_map_realm_base_explicit_values() -> None:
    """Validate MapRealmBase with explicit DbD figures."""
    model = MapRealmBase(
        name="The Game",
        realm_id=10,
        source_id=1,
        layout_type="Indoor",
        pallet_density="Very High",
        jungle_gyms_count=0,
        totem_spawns_count=5,
        shack_has_basement=False,
        size_sq_tiles=142.0,
        size_sq_meters=9088,
    )
    assert model.layout_type == "Indoor"
    assert model.pallet_density == "Very High"
    assert model.jungle_gyms_count == 0
    assert model.shack_has_basement is False
    assert model.size_sq_tiles == 142.0
    assert model.size_sq_meters == 9088


@pytest.mark.unit
def test_map_realm_response_deserialization() -> None:
    """Validate MapRealmResponse payload conversion and field types."""
    payload = {
        "id": 45,
        "name": "Midwich Elementary School",
        "realm": "Silent Hill",
        "realm_id": 15,
        "source_id": 1,
        "source": "hens333",
        "source_label": "Hens333 12-Clock Callouts",
        "layout_type": "Indoor",
        "pallet_density": "Low",
        "jungle_gyms_count": 0,
        "totem_spawns_count": 5,
        "shack_has_basement": False,
        "size_sq_tiles": 113.5,
        "size_sq_meters": 7264,
        "callout_image_url": "https://example.com/midwich.gif",
        "image_url": "https://example.com/midwich.gif",
    }
    response = MapRealmResponse(**payload)
    assert response.id == 45
    assert response.name == "Midwich Elementary School"
    assert response.layout_type == "Indoor"
    assert response.pallet_density == "Low"
    assert response.jungle_gyms_count == 0
    assert response.shack_has_basement is False
    assert response.size_sq_tiles == 113.5
    assert response.size_sq_meters == 7264
```

### backend/tests/unit/services/test_map_services.py
```python
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
        totem_spawns_count=5,
        shack_has_basement=True,
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
        totem_spawns_count=5,
        shack_has_basement=False,
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
        totem_spawns_count=5,
        shack_has_basement=False,
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
    assert midwich["shack_has_basement"] is False
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
                "totem_spawns_count": 5,
                "shack_has_basement": 0,
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
    assert row["totem_spawns_count"] == 5
    assert row["shack_has_basement"] is False
    assert row["size_sq_tiles"] == 120.0
    assert row["size_sq_meters"] == 7680
```

### backend/tests/unit/routes/test_map_routes.py
```python
"""Unit tests for /api/v1/maps and /api/v1/maps/realms Flask endpoints."""
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.models.map import MapRealm, MapSource, Realm


def _seed_route_data(db_session: Session) -> None:
    """Seed data for API route verification."""
    realm_gideon = Realm(id=10, name="Gideon Meat Plant")
    realm_springwood = Realm(
        id=9,
        name="Springwood",
        translations={"de": {"name": "Springwood"}},
    )
    db_session.add_all([realm_gideon, realm_springwood])

    source = MapSource(id=1, code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add(source)
    db_session.flush()

    m1 = MapRealm(
        id=43,
        name="The Game",
        realm_id=realm_gideon.id,
        source_id=source.id,
        layout_type="Indoor",
        pallet_density="Very High",
        jungle_gyms_count=0,
        totem_spawns_count=5,
        shack_has_basement=False,
        size_sq_tiles=142.0,
        size_sq_meters=9088,
        callout_image_url="https://example.com/the_game.webp",
        translations={"de": {"name": "Das Spiel"}},
    )
    m2 = MapRealm(
        id=6,
        name="Preschool I",
        realm_id=realm_springwood.id,
        source_id=source.id,
        layout_type="Hybrid",
        pallet_density="Medium",
        jungle_gyms_count=2,
        totem_spawns_count=5,
        shack_has_basement=True,
        size_sq_tiles=144.0,
        size_sq_meters=9216,
        callout_image_url="https://example.com/preschool1.webp",
        translations={"de": {"name": "Badham-Vorschule"}},
    )
    db_session.add_all([m1, m2])
    db_session.commit()


@pytest.mark.unit
def test_get_realms_endpoint(client: FlaskClient, db_session: Session) -> None:
    """Test GET /api/v1/maps/realms returns status 200 and list of realms."""
    _seed_route_data(db_session)
    response = client.get("/api/v1/maps/realms")
    assert response.status_code == 200

    data = response.get_json()
    assert "realms" in data
    assert len(data["realms"]) == 2
    names = {r["name"] for r in data["realms"]}
    assert "Gideon Meat Plant" in names
    assert "Springwood" in names


@pytest.mark.unit
def test_get_maps_endpoint_attributes(client: FlaskClient, db_session: Session) -> None:
    """Test GET /api/v1/maps returns all fields including layout figures and sizes."""
    _seed_route_data(db_session)
    response = client.get("/api/v1/maps")
    assert response.status_code == 200

    data = response.get_json()
    assert "maps" in data
    assert len(data["maps"]) == 2

    the_game = next(m for m in data["maps"] if m["id"] == 43)
    assert the_game["name"] == "The Game"
    assert the_game["layout_type"] == "Indoor"
    assert the_game["pallet_density"] == "Very High"
    assert the_game["jungle_gyms_count"] == 0
    assert the_game["totem_spawns_count"] == 5
    assert the_game["shack_has_basement"] is False
    assert the_game["size_sq_tiles"] == 142.0
    assert the_game["size_sq_meters"] == 9088


@pytest.mark.unit
def test_get_maps_filtering(client: FlaskClient, db_session: Session) -> None:
    """Test GET /api/v1/maps with realm and search query parameters."""
    _seed_route_data(db_session)

    # Filter by realm
    resp_realm = client.get("/api/v1/maps?realm=Springwood")
    assert resp_realm.status_code == 200
    maps_realm = resp_realm.get_json()["maps"]
    assert len(maps_realm) == 1
    assert maps_realm[0]["name"] == "Preschool I"
    assert maps_realm[0]["layout_type"] == "Hybrid"
    assert maps_realm[0]["shack_has_basement"] is True

    # Filter by search term
    resp_search = client.get("/api/v1/maps?search=Game")
    assert resp_search.status_code == 200
    maps_search = resp_search.get_json()["maps"]
    assert len(maps_search) == 1
    assert maps_search[0]["id"] == 43


@pytest.mark.unit
def test_get_maps_localization_header(client: FlaskClient, db_session: Session) -> None:
    """Test GET /api/v1/maps with Accept-Language header."""
    _seed_route_data(db_session)
    headers = {"Accept-Language": "de-DE,de;q=0.9"}
    response = client.get("/api/v1/maps?search=Game", headers=headers)
    assert response.status_code == 200

    data = response.get_json()
    assert data["maps"][0]["name"] == "Das Spiel"
```