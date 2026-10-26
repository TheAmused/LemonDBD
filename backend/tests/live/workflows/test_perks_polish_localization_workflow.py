# backend/tests/live/workflows/test_perks_polish_localization_workflow.py
import json
from collections.abc import Callable
from pathlib import Path

import pytest
from flask.testing import FlaskClient

PERKS_SEED = Path(__file__).resolve().parents[3] / "app" / "seeds" / "data" / "content" / "perks.json"


@pytest.mark.live
@pytest.mark.workflow
class TestPerksPolishLocalizationWorkflow:
    """Paging, role filters and search on the perk catalogue, and Polish names from the seed's translations."""

    def test_perks_polish_localization_and_search_workflow(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        res = live_client.get("/api/v1/perks?limit=50&page=1")
        assert res.status_code == 200
        data = res.get_json()
        assert len(data["data"]) == 50
        assert data["pagination"]["total"] == db_count("SELECT count(*) FROM perks")

        for role in ("Killer", "Survivor"):
            perks = live_client.get(f"/api/v1/perks?category={role}&limit=30").get_json()["data"]
            assert len(perks) == 30
            assert {p["category"] for p in perks} == {role}
            assert all(p["name"] and p["description"] for p in perks)

        results = live_client.get("/api/v1/perks?search=Calling").get_json()["data"]
        assert [p["name"] for p in results] == ["A Nurse's Calling"]

        seed = {p["name"]: p for p in json.loads(PERKS_SEED.read_text(encoding="utf-8"))["perks"]}
        polish = seed["Sprint Burst"]["translations"]["pl"]["name"]
        res_pl = live_client.get("/api/v1/perks/sprint_burst?lang=pl")
        assert res_pl.status_code == 200
        assert res_pl.get_json()["data"]["name"] == polish
        # Search runs on the language asked for: the English name finds nothing in Polish.
        assert live_client.get("/api/v1/perks?search=Calling&lang=pl").get_json()["data"] == []
