# backend/tests/live/workflows/test_user_ownership_bulk_cascades_workflow.py
from collections.abc import Callable
from typing import Any

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestUserOwnershipBulkCascadesWorkflow:
    """A bulk ownership change is reflected at once in the user's ownership summary."""

    def test_user_ownership_bulk_cascades_workflow(
        self,
        live_client: FlaskClient,
        db_count: Callable[..., int],
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory("cascade_tester", "casc@example.com", "pass123")
        user_id = user["id"]

        def summary() -> dict[str, Any]:
            res = client.get(f"/api/v1/users/{user_id}", headers=headers)
            assert res.status_code == 200
            return res.get_json()["ownership"]

        before = summary()
        total = db_count("SELECT (SELECT count(*) FROM survivors) + (SELECT count(*) FROM killers)")
        assert before["characters"]["total"] == total

        chars = client.get(f"/api/v1/users/{user_id}/characters", headers=headers).get_json()["data"]
        owned = [c for c in chars if c["is_owned"]][:5]
        bulk_res = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": [{"character_id": c["id"], "role": c["role"], "is_owned": False} for c in owned]},
            headers=headers,
        )
        assert bulk_res.status_code == 200
        assert bulk_res.get_json()["status"] == "success"
        result = bulk_res.get_json()["data"]
        assert result["characters_updated_count"] == 5

        after = summary()
        assert after["characters"]["owned"] == before["characters"]["owned"] - 5
        assert after["owned_characters_count"] == after["characters"]["owned"]
        # Their teachable perks lock with them.
        assert result["auto_locked_perks_count"] > 0
        assert after["perks"]["owned"] == before["perks"]["owned"] - result["auto_locked_perks_count"]
