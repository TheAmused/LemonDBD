# backend/tests/live/workflows/test_map_search_workflow.py
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestMapSearchWorkflow:
    """Workflow asserting map keyword search."""

    def test_map_search_workflow(self, live_client: FlaskClient) -> None:
        search_res = live_client.get("/api/v1/maps?search=House")
        assert search_res.status_code == 200
        found = search_res.get_json()["maps"]
        assert any("House" in m["name"] for m in found)
