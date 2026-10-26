# backend/tests/live/workflows/test_chaos_streak_blind_reveal_workflow.py
from typing import Any, Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestChaosStreakBlindRevealWorkflow:
    """Chaos perks are dealt face down; revealing flips them and changes nothing else; a win records the killer."""

    def test_chaos_streak_blind_reveal_workflow(
        self,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, _ = auth_client_factory("chaos_revealer", "creveal@example.com", "pass123")

        run = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers).get_json()["run"]
        assert run["perks_revealed"] is False

        rev = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run["id"]}, headers=headers)
        assert rev.status_code == 200
        revealed = rev.get_json()["run"]
        assert revealed["perks_revealed"] is True
        changed = {k for k in run if run[k] != revealed[k]}
        assert changed == {"perks_revealed", "updated_at"}, "revealing deals nothing new"

        killer = run["owned_killers"][0]
        win_res = client.post("/api/v1/chaos-streak/result", json={"run_id": run["id"], "result": "win", "killer_id": killer}, headers=headers)
        assert win_res.status_code == 200
        after = win_res.get_json()["run"]
        assert (after["completed_killers"], after["current_streak"], after["perks_revealed"]) == ([killer], 1, False)
