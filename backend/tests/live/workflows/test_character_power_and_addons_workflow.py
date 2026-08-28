# backend/tests/live/workflows/test_character_power_and_addons_workflow.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterPowerAndAddonsWorkflow:
    """Workflow asserting killer power associations and equipment item querying."""

    def test_character_power_and_addons_workflow(self, live_client: FlaskClient) -> None:
        trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
        if trapper_res.status_code == 404:
            trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
        assert trapper_res.status_code == 200
        trapper = trapper_res.get_json()["data"]
        assert trapper["character"]["name"] == "The Trapper"
        assert len(trapper["perks"]) == 3
        assert len(trapper["addons"]) > 0

        item_res = live_client.get("/api/v1/items?category=Toolbox")
        assert item_res.status_code == 200
        items = item_res.get_json()["data"]
        assert len(items) > 0
