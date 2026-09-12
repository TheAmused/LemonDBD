# backend/tests/unit/test_phase6_services.py
import pytest
from flask.testing import FlaskClient
from app import create_app
from app.services.map_service import MapService


@pytest.mark.unit
class TestMapService:
    """Tests for Phase 6 Map catalog queries and detail representations."""

    @pytest.fixture
    def service(self) -> MapService:
        return MapService()

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_get_maps_list(self, service: MapService) -> None:
        maps = service.get_maps()
        assert len(maps) >= 6
        names = [m["name"] for m in maps]
        assert "Coal Tower" in names

    def test_api_maps_endpoint(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/maps")
        assert res.status_code == 200
        data = res.get_json()
        assert "maps" in data
