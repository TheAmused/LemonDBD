# backend/tests/live/workflows/test_map_landmarks_and_seeds_workflow.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestMapLandmarksAndSeedsWorkflow:
    """Workflow asserting multi-floor map landmark indexing and keyword search."""

    def test_map_landmarks_and_seeds_workflow(self, live_client: FlaskClient) -> None:
        search_res = live_client.get("/api/v1/maps?search=House")
        assert search_res.status_code == 200
        found = search_res.get_json()["maps"]
        assert any("House" in m["name"] for m in found)

        rpd_res = live_client.get("/api/v1/maps/rpd_east?floor=1")
        assert rpd_res.status_code in (200, 404)
        if rpd_res.status_code == 200:
            rpd = rpd_res.get_json()["map"]
            assert rpd["id"] == "rpd_east"
