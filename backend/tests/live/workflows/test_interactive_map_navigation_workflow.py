# backend/tests/live/workflows/test_interactive_map_navigation_workflow.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestInteractiveMapNavigationWorkflow:
    """Workflow asserting interactive map navigation and realm filtering."""

    def test_interactive_map_navigation_workflow(self, live_client: FlaskClient) -> None:
        maps_res = live_client.get("/api/v1/maps")
        assert maps_res.status_code == 200
        maps = maps_res.get_json()["maps"]
        assert len(maps) > 0

        macmillan_res = live_client.get("/api/v1/maps?realm=The%20MacMillan%20Estate")
        assert macmillan_res.status_code == 200
        mac_maps = macmillan_res.get_json()["maps"]
        assert len(mac_maps) > 0
