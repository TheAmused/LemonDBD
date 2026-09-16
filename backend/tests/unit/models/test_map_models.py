# backend/tests/unit/models/test_map_models.py
"""Unit tests for Map SQLAlchemy models: Realm, MapSource, and MapRealm."""
import pytest
from sqlalchemy.orm import Session

from app.models.map import (
    DEFAULT_JUNGLE_GYMS,
    DEFAULT_LAYOUT_TYPE,
    DEFAULT_PALLET_DENSITY,
    DEFAULT_IS_SHACK,
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
    assert map_entry.is_shack == DEFAULT_IS_SHACK
    assert map_entry.is_main_building is False
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
        is_shack=True,
        is_main_building=True,
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
    assert azarov.is_shack is True
    assert azarov.is_main_building is True
    assert azarov.size_sq_tiles == 176.0
    assert azarov.size_sq_meters == 11264

    data = azarov.to_dict(lang="de")
    assert data["name"] == "Azarovs Ruhestätte"
    assert data["layout_type"] == "Outdoor"
    assert data["pallet_density"] == "Medium"
    assert data["jungle_gyms_count"] == 4
    assert data["totem_spawns_count"] == 5
    assert data["is_shack"] is True
    assert data["is_main_building"] is True
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
        is_shack=False,
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
    assert midwich.is_shack is False
    assert midwich.size_sq_tiles == 113.5
    assert midwich.size_sq_meters == 7264

    data = midwich.to_dict(lang="ja")
    assert data["name"] == "ミッドウィッチ小学校"
    assert data["jungle_gyms_count"] == 0
    assert data["is_shack"] is False
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
        is_shack=False,
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
        "is_shack",
        "is_main_building",
        "size_sq_tiles",
        "size_sq_meters",
        "description",
    }
    assert required_keys.issubset(output.keys())
    assert output["source"] == "hens333"
    assert output["source_label"] == "Hens333 12-Clock Callouts"
    assert output["realm"] == "Gideon Meat Plant"
