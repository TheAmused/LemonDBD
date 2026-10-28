# backend/tests/unit/maps/test_map_layout_api.py
"""Unit tests for GET /api/v1/maps/{map_id}/layout endpoint."""
import pytest
from werkzeug.exceptions import HTTPException

from app.models.map import MapRealm, MapSource, Realm
from app.models.map_layout import MapLayout
from app.api.v1.maps import get_map_layout


@pytest.mark.unit
def test_get_map_layout_endpoint(client, db_session) -> None:
    realm = Realm(name="Test Realm")
    source = MapSource(code="lemondbd", label="LemonDBD")
    db_session.add_all([realm, source])
    db_session.flush()

    m = MapRealm(name="Azarov Test", realm_id=realm.id, source_id=source.id)
    db_session.add(m)
    db_session.flush()

    layout = MapLayout(
        map_id=m.id,
        version=1,
        layout_data={"width_m": 128, "height_m": 128, "floors": []},
    )
    db_session.add(layout)
    db_session.commit()

    resp = client.get(f"/api/v1/maps/{m.id}/layout")
    assert resp.status_code == 200
    data = resp.json if not callable(getattr(resp, "json", None)) else resp.json()
    assert data["map_id"] == m.id
    assert data["version"] == 1
    assert data["layout"]["width_m"] == 128
    assert data["layout"]["floors"] == []

    resp_404 = client.get("/api/v1/maps/99999/layout")
    assert resp_404.status_code == 404


@pytest.mark.unit
def test_get_map_layout_direct_call_raises_http_exception(client, db_session) -> None:
    """Verifies that nonexistent layout raises an HTTPException (404) when called."""
    with pytest.raises(HTTPException) as exc_info:
        get_map_layout(map_id=99999)
    assert exc_info.value.code == 404


@pytest.mark.unit
def test_map_without_layout_record_returns_404(client, db_session) -> None:
    """A map exists in map_realms but has no corresponding row in map_layouts."""
    realm = Realm(name="Realm Without Layout")
    source = MapSource(code="hens333", label="Hens")
    db_session.add_all([realm, source])
    db_session.flush()

    m = MapRealm(name="Map Without Layout", realm_id=realm.id, source_id=source.id)
    db_session.add(m)
    db_session.commit()

    resp = client.get(f"/api/v1/maps/{m.id}/layout")
    assert resp.status_code == 404
