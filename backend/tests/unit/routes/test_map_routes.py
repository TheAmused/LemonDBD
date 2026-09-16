# backend/tests/unit/routes/test_map_routes.py
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
        is_shack=False,
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
        is_shack=True,
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
    assert the_game["is_shack"] is False
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
    assert maps_realm[0]["is_shack"] is True

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
