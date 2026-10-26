# backend/tests/live/api/test_live_streaks_api.py
"""Starting a run in each challenge mode on PostgreSQL: page streak, Gauntlet, Chaos and History."""
from typing import Any, Callable

import pytest
from flask.testing import FlaskClient

ClientFactory = Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]]


@pytest.mark.live
class TestLiveStreaksAPI:
    def test_live_page_streak_flow(self, auth_client_factory: ClientFactory, db_count: Callable[..., int]) -> None:
        client, headers, _ = auth_client_factory("streak_user_1", "str1@example.com", "pass123")

        roster = client.get("/api/v1/page-streak/roster", headers=headers).get_json()["data"]
        assert len(roster) == db_count("SELECT count(*) FROM killers")
        assert {r["status"] for r in roster} == {"not_started"}

        pool = client.get("/api/v1/page-streak/pool", headers=headers).get_json()
        # The pool is every killer perk, split into pages of `perks_per_page`.
        assert pool["pool_size"] == db_count("SELECT count(*) FROM perks WHERE role = 'Killer'")
        assert pool["page_count"] == -(-pool["pool_size"] // pool["perks_per_page"])

    def test_live_gauntlet_streak_flow(self, auth_client_factory: ClientFactory) -> None:
        client, headers, _ = auth_client_factory("gauntlet_user_1", "gaunt1@example.com", "pass123")
        run = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers).get_json()["run"]
        assert (run["role"], run["game_mode"], run["target_revealed"], run["completed_characters"]) == ("killer", "original", False, [])
        assert run["current_character_id"]
        assert client.get("/api/v1/gauntlet-streak/run?role=wizard", headers=headers).status_code == 400

    def test_live_chaos_streak_flow(self, auth_client_factory: ClientFactory) -> None:
        client, headers, _ = auth_client_factory("chaos_user_1", "chaos1@example.com", "pass123")
        run = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers).get_json()["run"]
        assert (run["difficulty"], run["current_streak"], run["perks_revealed"], run["completed_killers"]) == ("easy", 0, False, [])
        assert len(run["current_perks"]) == 4
        assert client.get("/api/v1/chaos-streak/run?difficulty=nightmare", headers=headers).status_code == 400

    def test_live_history_streak_flow(self, auth_client_factory: ClientFactory) -> None:
        client, headers, _ = auth_client_factory("hist_user_1", "hist1@example.com", "pass123")
        run = client.get("/api/v1/history-streak/run?mode=medium", headers=headers).get_json()["run"]
        assert (run["mode"], run["current_row_index"], run["total_killers_beaten"]) == ("medium", 0, 0)
        assert len(run["current_row_killers"]) == run["row_size"]
        assert client.get("/api/v1/history-streak/run?mode=nightmare", headers=headers).status_code == 400
