# backend/tests/live/workflows/test_gauntlet_multiround_progression_workflow.py
from typing import Any, Callable

import pytest
from flask.testing import FlaskClient

from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestGauntletMultiroundProgressionWorkflow:
    """Gauntlet rounds: reveal the target, win, and the next killer is dealt; the match is logged in the stats."""

    def test_gauntlet_multiround_progression_workflow(
        self,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        assert admin_client.put("/api/v1/admin/challenge-modes/gauntlet", json={"is_enabled": True}).status_code == 200
        client, headers, _ = auth_client_factory("gauntlet_boss", "gboss@example.com", "pass123")

        run = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers).get_json()["run"]
        target = run["current_character_id"]
        assert run["target_revealed"] is False

        reveal_res = client.post("/api/v1/gauntlet-streak/reveal", json={"run_id": run["id"]}, headers=headers)
        assert reveal_res.status_code == 200
        assert reveal_res.get_json()["run"]["target_revealed"] is True
        assert reveal_res.get_json()["run"]["current_character_id"] == target, "revealing does not re-deal"

        win_res = client.post("/api/v1/gauntlet-streak/result", json={"run_id": run["id"], "result": "win", "role": "killer"}, headers=headers)
        assert win_res.status_code == 200
        after = win_res.get_json()["run"]
        assert after["completed_characters"] == [target]
        assert after["current_character_id"] not in (None, target)

        stats = client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=headers).get_json()["stats"]
        assert (stats["total_matches"], stats["wins"], stats["losses"], stats["win_rate"]) == (1, 1, 0, 100.0)
        assert [log["character_id"] for log in stats["recent_logs"]] == [target]
