# backend/tests/unit/maps/test_map_layout_model.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.map import MapRealm, MapSource, Realm
from app.models.map_layout import MapLayout


@pytest.mark.unit
def test_map_layout_creation_and_cascade_delete(db_session: Session) -> None:
    realm = Realm(name="Autohaven Test Realm")
    source = MapSource(code="test_source", label="Test Source")
    db_session.add_all([realm, source])
    db_session.flush()

    map_obj = MapRealm(
        name="Azarov Test Map",
        realm_id=realm.id,
        source_id=source.id,
    )
    db_session.add(map_obj)
    db_session.flush()

    layout = MapLayout(
        map_id=map_obj.id,
        version=1,
        layout_data={"cell_m": 8, "width_m": 128, "height_m": 128, "floors": []},
    )
    db_session.add(layout)
    db_session.commit()

    fetched = db_session.scalar(select(MapLayout).where(MapLayout.map_id == map_obj.id))
    assert fetched is not None
    assert fetched.layout_data["width_m"] == 128
    assert map_obj.layout_record is not None
    assert map_obj.layout_record.id == fetched.id
    assert fetched.map.id == map_obj.id
    assert fetched.to_dict() == {
        "id": fetched.id,
        "map_id": map_obj.id,
        "version": 1,
        "layout": {"cell_m": 8, "width_m": 128, "height_m": 128, "floors": []},
    }

    # Test cascade delete: deleting MapRealm deletes MapLayout
    db_session.delete(map_obj)
    db_session.commit()

    orphaned = db_session.scalar(select(MapLayout).where(MapLayout.id == fetched.id))
    assert orphaned is None
