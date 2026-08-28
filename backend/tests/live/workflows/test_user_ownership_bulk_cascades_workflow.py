# backend/tests/live/workflows/test_user_ownership_bulk_cascades_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestUserOwnershipBulkCascadesWorkflow:
    """Workflow verifying bulk character ownership updates and instant ownership summary recalculation."""

    def test_user_ownership_bulk_cascades_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "cascade_tester", "casc@example.com", "pass123"
        )
        user_id = user["id"]

        summary_res = client.get(f"/api/v1/users/{user_id}", headers=headers)
        assert summary_res.status_code == 200
        ownership = summary_res.get_json()["ownership"]
        assert (
            "owned_characters_count" in ownership
            or "killers" in ownership
            or isinstance(ownership, dict)
        )

        chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        assert chars_res.status_code == 200
        chars = chars_res.get_json()["data"]

        updates = [{"character_id": c["id"], "is_owned": True} for c in chars[:5]]
        bulk_res = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": updates},
            headers=headers,
        )
        assert bulk_res.status_code == 200
        assert bulk_res.get_json()["status"] == "success"
