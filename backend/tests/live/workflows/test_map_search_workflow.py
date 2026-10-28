# backend/tests/live/workflows/test_map_search_workflow.py
from collections.abc import Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestMapSearchWorkflow:
    """Map keyword search: case-insensitive, every match and nothing else."""

    def test_map_search_workflow(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        search_res = live_client.get("/api/v1/maps?search=House")
        assert search_res.status_code == 200
        found = search_res.get_json()["maps"]
        assert all("house" in m["name"].lower() for m in found)
        assert len(found) == db_count("SELECT count(*) FROM map_realms WHERE name ILIKE '%house%'")

        assert live_client.get("/api/v1/maps?search=zzz-no-such-map").get_json()["maps"] == []
