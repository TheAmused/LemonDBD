# backend/tests/live/workflows/test_interactive_map_navigation_workflow.py
from collections.abc import Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestInteractiveMapNavigationWorkflow:
    """Every map, then one realm's maps (the realm filter ignores case)."""

    def test_interactive_map_navigation_workflow(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        maps_res = live_client.get("/api/v1/maps")
        assert maps_res.status_code == 200
        assert len(maps_res.get_json()["maps"]) == db_count("SELECT count(*) FROM map_realms")

        macmillan_res = live_client.get("/api/v1/maps?realm=The%20MacMillan%20Estate")
        assert macmillan_res.status_code == 200
        mac_maps = macmillan_res.get_json()["maps"]
        assert {m["realm"] for m in mac_maps} == {"The Macmillan Estate"}
        assert len(mac_maps) == db_count(
            "SELECT count(*) FROM map_realms m JOIN realms r ON r.id = m.realm_id WHERE r.name ILIKE 'The MacMillan Estate'"
        )
