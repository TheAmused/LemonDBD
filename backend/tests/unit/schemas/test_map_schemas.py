# backend/tests/unit/schemas/test_map_schemas.py
"""Unit tests for Map Pydantic validation and serialization DTO schemas."""
import pytest
from pydantic import ValidationError

from app.schemas.map import (
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_IS_SHACK,
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
    assert model.is_shack == DEFAULT_IS_SHACK
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
        is_shack=False,
        size_sq_tiles=142.0,
        size_sq_meters=9088,
    )
    assert model.layout_type == "Indoor"
    assert model.pallet_density == "Very High"
    assert model.jungle_gyms_count == 0
    assert model.is_shack is False
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
        "is_shack": False,
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
    assert response.is_shack is False
    assert response.size_sq_tiles == 113.5
    assert response.size_sq_meters == 7264
