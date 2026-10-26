# backend/tests/live/workflows/test_minigames_workflow.py
"""Minigames end to end on the seeded catalogue: catalogue, daily and repeatable challenges, the guess
evaluator (wrong, cross-role, correct, clue unlocks), admin-only daily creation and the error cases.
Ported from the frontend's minigamesWorkflowLive fetch test, which called the same API."""
from collections.abc import Callable
from typing import Any

import pytest
from flask.testing import FlaskClient

from tests.live.conftest import AuthenticatedClient


def _guess(client: FlaskClient, daily_id: Any, **body: Any) -> dict[str, Any]:
    res = client.post(
        "/api/v1/minigames/guess",
        json={"challenge_id": daily_id, "challenge_type": "daily", "round_index": 0, **body},
    )
    assert res.status_code == 200, res.get_json()
    return res.get_json()


@pytest.mark.live
@pytest.mark.workflow
class TestMinigamesWorkflow:
    def test_catalogue_daily_and_repeatable_challenges(self, live_client: FlaskClient) -> None:
        catalog = live_client.get("/api/v1/minigames/catalog").get_json()
        assert len(catalog["characters"]) > 50
        assert len(catalog["perks"]) > 200
        assert len(catalog["realms"]) > 10
        assert all(c["id"] and c["name"] and c["role"] in ("Survivor", "Killer") for c in catalog["characters"])

        daily_res = live_client.get("/api/v1/minigames/daily?mode=classic")
        assert daily_res.status_code == 200
        daily = daily_res.get_json()
        assert daily["game_mode"] == "classic"
        assert daily["challenge_date"]
        assert daily["rounds"][0]["mode"] == "classic_character"
        assert "target_id" not in daily["rounds"][0], "a classic daily must not ship its answer"

        rep_res = live_client.get("/api/v1/minigames/repeatable?mode=realm")
        assert rep_res.status_code == 200
        rep = rep_res.get_json()
        assert rep["id"] and rep["expires_at"]
        assert rep["game_mode"] == "realm"
        assert rep["rounds"][0]["mode"] == "realm_guesser"

    def test_guess_evaluation(self, live_client: FlaskClient) -> None:
        catalog = live_client.get("/api/v1/minigames/catalog").get_json()
        daily = live_client.get("/api/v1/minigames/daily?mode=classic").get_json()

        # Giving up stores nothing server-side and is how a test learns the answer.
        answer = _guess(live_client, daily["id"], give_up=True)["answer"]
        target_id, target_type = answer["target_id"], answer["target_type"]

        wrong = next(c for c in catalog["characters"] if c["type"] == target_type and c["id"] != target_id)
        result = _guess(live_client, daily["id"], guess_type=wrong["type"], guess_id=wrong["id"], attempt_number=1)
        assert result["is_correct"] is False
        assert result["attempt_number"] == 1
        assert result["guess"]["id"] == wrong["id"]
        assert {"role", "gender"} <= set(result["attributes"])
        assert result["attributes"]["role"] == "correct"

        other_role = catalog["killers"] if target_type == "survivor" else catalog["survivors"]
        cross = other_role[0]
        crossed = _guess(live_client, daily["id"], guess_type=cross["type"], guess_id=cross["id"], attempt_number=2)
        assert crossed["is_correct"] is False
        assert crossed["guess"]["name"] == cross["name"]
        assert crossed["attributes"]["role"] == "incorrect"

        right = _guess(live_client, daily["id"], guess_type=target_type, guess_id=target_id, attempt_number=2)
        assert right["is_correct"] is True

        later = _guess(live_client, daily["id"], guess_type=wrong["type"], guess_id=wrong["id"], attempt_number=4)
        assert later["unlocked_clues"], "clues unlock on later attempts"

    def test_only_admins_create_dailies(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        daily = {
            "challenge_date": "2099-01-01",
            "game_mode": "pixel",
            "title": "Admin Pixel Guesser",
            "description": "Created by the live suite",
            "rounds": [{"round_number": 1, "mode": "pixel_avatar", "target_id": 3, "target_type": "killer", "max_attempts": 6}],
        }
        created = admin_client.post("/api/v1/minigames/daily", json=daily)
        assert created.status_code == 201, created.get_json()
        assert created.get_json()["challenge_date"] == "2099-01-01"
        assert created.get_json()["game_mode"] == "pixel"

        _, headers, _ = auth_client_factory("minigame_player", "minigame_player@example.com", "pass123")
        forbidden = live_client.post("/api/v1/minigames/daily", json={**daily, "challenge_date": "2099-01-02"}, headers=headers)
        assert forbidden.status_code == 403

    def test_error_cases(self, live_client: FlaskClient) -> None:
        daily = live_client.get("/api/v1/minigames/daily?mode=classic").get_json()
        assert live_client.post("/api/v1/minigames/guess", json={"challenge_id": daily["id"]}).status_code == 400
        assert live_client.get("/api/v1/minigames/daily?date=invalid-date").status_code == 400
        assert live_client.get("/api/v1/minigames/shared/nonexistent_code_xyz").status_code == 404
        # The self-reported stats endpoint was removed.
        assert live_client.get("/api/v1/minigames/stats").status_code in (404, 405)
