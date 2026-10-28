# backend/tests/live/workflows/test_character_power_and_addons_workflow.py
from collections.abc import Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterPowerAndAddonsWorkflow:
    """A killer's detail carries its perks and every one of its power's add-ons; items filter by category."""

    def test_character_power_and_addons_workflow(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
        assert trapper_res.status_code == 200
        trapper = trapper_res.get_json()["data"]
        assert trapper["character"]["name"] == "The Trapper"
        assert len(trapper["perks"]) == 3
        assert len(trapper["addons"]) == db_count(
            "SELECT count(*) FROM killer_addons a JOIN killers k ON k.id = a.killer_id WHERE k.name = 'The Trapper'"
        )

        item_res = live_client.get("/api/v1/items?category=Toolbox")
        assert item_res.status_code == 200
        items = item_res.get_json()["data"]
        assert {i["category"] for i in items} == {"Toolbox"}
        assert len(items) == db_count(
            "SELECT count(*) FROM items i JOIN item_categories c ON c.id = i.category_id WHERE c.name = 'Toolbox'"
        )
