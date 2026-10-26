# backend/tests/live/workflows/test_page_streak_multipage_progression_workflow.py
from collections.abc import Callable
from typing import Any

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestPageStreakMultipageProgressionWorkflow:
    """A page streak run: start on page 1, a win on the current page moves to the next, and only the
    current page can be reported."""

    def test_page_streak_multipage_progression_workflow(
        self,
        db_count: Callable[..., int],
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, _ = auth_client_factory("page_streak_runner", "pstreak@example.com", "pass123")

        roster = client.get("/api/v1/page-streak/roster", headers=headers).get_json()["data"]
        assert len(roster) == db_count("SELECT count(*) FROM killers")
        killer = roster[0]["killer"]

        start_res = client.post("/api/v1/page-streak/run/start", json={"killer": killer}, headers=headers)
        assert start_res.status_code == 201
        run = start_res.get_json()["run"]
        assert (run["killer"], run["status"], run["current_page"], run["best_page"]) == (killer, "in_progress", 1, 0)
        assert len(run["pages"]) == run["page_count"]

        reread = client.get(f"/api/v1/page-streak/run?killer={killer}", headers=headers).get_json()["run"]
        assert (reread["id"], reread["current_page"]) == (run["id"], 1)

        def report(page: int):
            return client.post(
                "/api/v1/page-streak/run/result",
                json={"killer": killer, "page": page, "perks": run["pages"][0][:4], "result": "win"},
                headers=headers,
            )

        wrong_page = report(0)
        assert wrong_page.status_code == 400
        assert wrong_page.get_json()["error"] == "Page 0 is not the current page (1)"

        won = report(1)
        assert won.status_code == 200
        assert (won.get_json()["run"]["current_page"], won.get_json()["run"]["best_page"]) == (2, 1)
