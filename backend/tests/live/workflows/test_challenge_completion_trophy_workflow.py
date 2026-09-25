# backend/tests/live/workflows/test_challenge_completion_trophy_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestChallengeCompletionTrophyWorkflow:
    """Workflow exercising the full challenge completion trophy lifecycle against a live PostgreSQL clone.

    Covers: completion status shape, active_run creation for gauntlet/chaos/history,
    admin killswitch guard, difficulty cascade endpoint accessibility, and page-streak
    roster / no-completion contract.
    """

    def test_challenge_completion_trophy_workflow(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:

        # ── 0. Setup ────────────────────────────────────────────────────────────
        # Ensure all three challenge modes are enabled before the test starts.
        for mode in ("gauntlet", "chaos", "history"):
            res = admin_client.put(
                f"/api/v1/admin/challenge-modes/{mode}",
                json={"is_enabled": True},
            )
            assert res.status_code == 200, (
                f"Failed to enable challenge mode '{mode}': {res.get_json()}"
            )

        client, headers, _user = auth_client_factory(
            "trophy_tester", "trophy_tester@example.com", "pass123"
        )

        # ── 1. Initial completion status is empty ────────────────────────────────
        status_res = client.get("/api/v1/challenge-completions/status", headers=headers)
        assert status_res.status_code == 200
        status_data = status_res.get_json()

        assert "completions" in status_data
        assert "active_runs" in status_data
        assert "completion_counts" in status_data
        assert "full_roster" in status_data

        completions = status_data["completions"]
        # For a brand-new user, completions should be empty or not contain mode keys.
        assert completions == {} or (
            "chaos" not in completions
            and "gauntlet" not in completions
            and "history" not in completions
        )

        # ── 2. Gauntlet run creates an active_run entry ──────────────────────────
        gauntlet_run_res = client.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=headers
        )
        assert gauntlet_run_res.status_code == 200

        status_res2 = client.get("/api/v1/challenge-completions/status", headers=headers)
        assert status_res2.status_code == 200
        active_runs2 = status_res2.get_json()["active_runs"]
        assert "gauntlet" in active_runs2, (
            f"Expected 'gauntlet' in active_runs after starting a gauntlet run; got: {active_runs2}"
        )
        assert isinstance(active_runs2["gauntlet"], list)
        assert len(active_runs2["gauntlet"]) > 0

        # ── 3. Chaos run creates an active_run entry ─────────────────────────────
        chaos_run_res = client.get(
            "/api/v1/chaos-streak/run?difficulty=easy", headers=headers
        )
        assert chaos_run_res.status_code == 200

        status_res3 = client.get("/api/v1/challenge-completions/status", headers=headers)
        assert status_res3.status_code == 200
        active_runs3 = status_res3.get_json()["active_runs"]
        assert "chaos" in active_runs3, (
            f"Expected 'chaos' in active_runs after starting a chaos run; got: {active_runs3}"
        )
        assert isinstance(active_runs3["chaos"], list)
        assert len(active_runs3["chaos"]) > 0

        # ── 4. History run creates an active_run entry ───────────────────────────
        history_run_res = client.get(
            "/api/v1/history-streak/run?mode=medium", headers=headers
        )
        assert history_run_res.status_code == 200

        status_res4 = client.get("/api/v1/challenge-completions/status", headers=headers)
        assert status_res4.status_code == 200
        active_runs4 = status_res4.get_json()["active_runs"]
        assert "history" in active_runs4, (
            f"Expected 'history' in active_runs after starting a history run; got: {active_runs4}"
        )
        assert isinstance(active_runs4["history"], list)
        assert len(active_runs4["history"]) > 0
        # Confirm the medium-mode run appears somewhere in the list.
        history_modes = [
            entry.get("mode") for entry in active_runs4["history"] if isinstance(entry, dict)
        ]
        assert "medium" in history_modes, (
            f"Expected mode='medium' in history active_runs; got entries: {active_runs4['history']}"
        )

        # ── 5. Killswitch for testing via admin (gauntlet) ───────────────────────
        ks_client, ks_headers, _ks_user = auth_client_factory(
            "ks_trophy_user", "ks_trophy@example.com", "pass123"
        )

        try:
            dis_res = admin_client.put(
                "/api/v1/admin/challenge-modes/gauntlet",
                json={"is_enabled": False, "reason": "Trophy test killswitch"},
            )
            assert dis_res.status_code == 200

            blocked_res = ks_client.get(
                "/api/v1/gauntlet-streak/run?role=killer", headers=ks_headers
            )
            assert blocked_res.status_code == 400
            assert "disabled" in blocked_res.get_json()["error"].lower()

        finally:
            en_res = admin_client.put(
                "/api/v1/admin/challenge-modes/gauntlet",
                json={"is_enabled": True},
            )
            assert en_res.status_code == 200

        # After re-enabling, the new user should be able to start a gauntlet run.
        unblocked_res = ks_client.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=ks_headers
        )
        assert unblocked_res.status_code == 200

        # ── 6. Difficulty cascade ordering — higher difficulty endpoints are open ─
        hist_hell_res = client.get(
            "/api/v1/history-streak/run?mode=hell", headers=headers
        )
        assert hist_hell_res.status_code == 200

        chaos_hell_res = client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=headers
        )
        assert chaos_hell_res.status_code == 200

        # ── 7. Completion status shape contract ──────────────────────────────────
        shape_res = client.get("/api/v1/challenge-completions/status", headers=headers)
        assert shape_res.status_code == 200
        shape_data = shape_res.get_json()

        expected_top_keys = {"completions", "active_runs", "completion_counts", "full_roster"}
        assert set(shape_data.keys()) == expected_top_keys, (
            f"Response top-level keys do not match contract. "
            f"Got: {set(shape_data.keys())}, expected: {expected_top_keys}"
        )

        for key in expected_top_keys:
            assert isinstance(shape_data[key], dict), (
                f"Expected '{key}' to be a dict, got {type(shape_data[key])}"
            )

        # Validate completion_counts sub-values are dicts when present.
        for mode_key, mode_val in shape_data["completion_counts"].items():
            assert isinstance(mode_val, dict), (
                f"completion_counts['{mode_key}'] should be a dict, got {type(mode_val)}"
            )

        # ── 8. Page streak roster triggers no completion yet ─────────────────────
        roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
        assert roster_res.status_code == 200
        roster_body = roster_res.get_json()

        # Roster payload may be under "data" key (matching other workflows) or at root list.
        roster_entries = roster_body.get("data") or roster_body.get("roster") or roster_body
        assert isinstance(roster_entries, list) and len(roster_entries) > 0, (
            f"Expected a non-empty roster list; got: {roster_body}"
        )

        first_entry = roster_entries[0]
        assert isinstance(first_entry, dict)
        assert "killer" in first_entry
        assert "status" in first_entry
        assert "ever_completed" in first_entry

        # User has not beaten any killer → page_streak must not appear in completions.
        final_status_res = client.get(
            "/api/v1/challenge-completions/status", headers=headers
        )
        assert final_status_res.status_code == 200
        final_completions = final_status_res.get_json()["completions"]
        assert "page_streak" not in final_completions, (
            f"'page_streak' should not be in completions before any killer is beaten; "
            f"got completions: {final_completions}"
        )
