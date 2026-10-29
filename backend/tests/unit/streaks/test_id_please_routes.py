# backend/tests/unit/streaks/test_id_please_routes.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.models import ChallengeModeSetting
from app.services.user import UserService
from tests.unit.streaks.id_please_support import seed_roster

BASE = "/api/v1/id-please-streak"


@pytest.fixture
def headers(db_session: Session) -> dict[str, str]:
    seed_roster(killers=3, survivors=3)
    service = UserService()
    user, err = service.register_user("routeplayer", "routeplayer", "rp@test.com", "password123")
    assert err is None
    return {"Authorization": f"Bearer {service.authenticate('routeplayer', 'password123')[1]}"}


def get_run(client: FlaskClient, headers: dict[str, str], difficulty: str = "milestones") -> dict:
    return client.get(f"{BASE}/run?difficulty={difficulty}", headers=headers).get_json()["run"]


def open_run(client: FlaskClient, headers: dict[str, str]) -> dict:
    run = get_run(client, headers)
    res = client.post(f"{BASE}/opening", json={"run_id": run["id"], "side": "survivor", "perk_positions": [0, 1, 2, 3]}, headers=headers)
    assert res.status_code == 200
    return res.get_json()["run"]


@pytest.mark.unit
class TestAccess:
    @pytest.mark.parametrize("method,path", [
        ("get", "/run?difficulty=milestones"), ("get", "/eligibility"), ("get", "/roster?side=killer"), ("get", "/preview?side=killer&perks=0,1,2,3"),
        ("get", "/stats?difficulty=milestones"), ("get", "/completions?difficulty=milestones"),
        ("post", "/opening"), ("post", "/result"), ("post", "/run/abandon"),
    ])
    def test_every_endpoint_requires_login(self, client: FlaskClient, method: str, path: str) -> None:
        res = getattr(client, method)(BASE + path)
        assert res.status_code == 401

    def test_there_is_no_reveal_endpoint(self, client: FlaskClient, headers: dict[str, str]) -> None:
        assert client.post(f"{BASE}/reveal", json={"run_id": 1}, headers=headers).status_code == 404


@pytest.mark.unit
class TestRun:
    def test_get_run_creates_a_run_in_setup(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = get_run(client, headers)
        assert (run["difficulty"], run["current_match"], run["match"]) == ("milestones", 0, None)
        assert run["roster_fingerprint"]

    @pytest.mark.parametrize("query", ["", "?difficulty=nightmare"])
    def test_a_bad_difficulty_is_a_400(self, client: FlaskClient, headers: dict[str, str], query: str) -> None:
        assert client.get(f"{BASE}/run{query}", headers=headers).status_code == 400

    def test_abandon(self, client: FlaskClient, headers: dict[str, str]) -> None:
        open_run(client, headers)
        res = client.post(f"{BASE}/run/abandon", json={"difficulty": "milestones"}, headers=headers)
        assert res.status_code == 200 and res.get_json()["run"]["current_match"] == 0

    def test_abandon_without_a_run_is_404(self, client: FlaskClient, headers: dict[str, str]) -> None:
        assert client.post(f"{BASE}/run/abandon", json={"difficulty": "hardcore"}, headers=headers).status_code == 404

    def test_a_disabled_mode_is_refused(self, client: FlaskClient, headers: dict[str, str], db_session: Session) -> None:
        run = open_run(client, headers)
        db_session.add(ChallengeModeSetting(mode="id_please", is_enabled=False))
        db_session.commit()
        res = client.post(f"{BASE}/result", json={"run_id": run["id"], "match_number": 1, "result": "win"}, headers=headers)
        assert res.status_code == 400 and "temporarily disabled" in res.get_json()["error"]


@pytest.mark.unit
class TestReadEndpoints:
    def test_eligibility(self, client: FlaskClient, headers: dict[str, str]) -> None:
        body = client.get(f"{BASE}/eligibility", headers=headers).get_json()
        assert body["difficulties"]["milestones"]["met"] is True
        assert body["difficulties"]["hardcore"]["met"] is False
        assert body["difficulties"]["hardcore"]["killer"]["characters"] == {"have": 3, "need": 20}

    def test_roster(self, client: FlaskClient, headers: dict[str, str]) -> None:
        roster = client.get(f"{BASE}/roster?side=survivor", headers=headers).get_json()["roster"]
        assert roster["side"] == "survivor" and len(roster["characters"]) == 3 and roster["perks"][0]["position"] == 0

    def test_roster_needs_a_side(self, client: FlaskClient, headers: dict[str, str]) -> None:
        assert client.get(f"{BASE}/roster", headers=headers).status_code == 400

    def test_preview(self, client: FlaskClient, headers: dict[str, str]) -> None:
        body = client.get(f"{BASE}/preview?side=survivor&perks=0,1,2,3", headers=headers).get_json()["preview"]
        assert body["first"]["side"] == "survivor" and body["second"]["side"] == "killer"

    @pytest.mark.parametrize("query", ["side=survivor&perks=0,1,2", "side=survivor&perks=a,b,c,d", "side=survivor", "side=nope&perks=0,1,2,3", "side=survivor&perks=0,0,1,2"])
    def test_preview_rejects_bad_input(self, client: FlaskClient, headers: dict[str, str], query: str) -> None:
        assert client.get(f"{BASE}/preview?{query}", headers=headers).status_code == 400

    def test_stats_and_completions_start_empty(self, client: FlaskClient, headers: dict[str, str]) -> None:
        stats = client.get(f"{BASE}/stats?difficulty=milestones", headers=headers).get_json()["stats"]
        assert stats["total_matches"] == 0 and stats["recent_logs"] == []
        assert client.get(f"{BASE}/completions?difficulty=milestones", headers=headers).get_json() == {"completions": []}


@pytest.mark.unit
class TestPlay:
    def test_opening_then_results(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = open_run(client, headers)
        assert run["current_match"] == 1 and run["match"]["character"]["name"]
        res = client.post(f"{BASE}/result", json={"run_id": run["id"], "match_number": 1, "result": "win"}, headers=headers)
        assert res.status_code == 200
        assert res.get_json()["run"]["current_streak"] == 1

    @pytest.mark.parametrize("body", [{}, {"run_id": 1}, {"run_id": 1, "side": "entity", "perk_positions": [0, 1, 2, 3]}, {"run_id": 1, "side": "killer", "perk_positions": [0, 1, 2, True]}, {"run_id": 1, "side": "killer", "perk_positions": "0123"}])
    def test_malformed_openings(self, client: FlaskClient, headers: dict[str, str], body: dict) -> None:
        assert client.post(f"{BASE}/opening", json=body, headers=headers).status_code == 400

    @pytest.mark.parametrize("body", [{}, {"run_id": 1, "result": "win"}, {"run_id": 1, "match_number": 1, "result": "draw"}, {"run_id": "x", "match_number": 1, "result": "win"}])
    def test_malformed_results(self, client: FlaskClient, headers: dict[str, str], body: dict) -> None:
        assert client.post(f"{BASE}/result", json=body, headers=headers).status_code == 400

    def test_a_perk_position_out_of_range_is_a_400(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = get_run(client, headers)
        res = client.post(f"{BASE}/opening", json={"run_id": run["id"], "side": "killer", "perk_positions": [0, 1, 2, 500]}, headers=headers)
        assert res.status_code == 400

    def test_an_unknown_run_is_a_404(self, client: FlaskClient, headers: dict[str, str]) -> None:
        res = client.post(f"{BASE}/result", json={"run_id": 99999, "match_number": 1, "result": "win"}, headers=headers)
        assert res.status_code == 404

    def test_a_stale_match_is_a_409_with_the_current_run(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = open_run(client, headers)
        body = {"run_id": run["id"], "match_number": 1, "result": "win"}
        client.post(f"{BASE}/result", json=body, headers=headers)
        res = client.post(f"{BASE}/result", json=body, headers=headers)
        assert res.status_code == 409
        data = res.get_json()
        assert data["code"] == "stale_match" and data["run"]["current_match"] == 2

    def test_a_started_run_cannot_be_opened_again(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = open_run(client, headers)
        res = client.post(f"{BASE}/opening", json={"run_id": run["id"], "side": "killer", "perk_positions": [0, 1, 2, 3]}, headers=headers)
        assert res.status_code == 409 and res.get_json()["code"] == "already_started"

    def test_a_changed_roster_is_a_409(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = get_run(client, headers)
        res = client.post(f"{BASE}/opening", json={"run_id": run["id"], "side": "survivor", "perk_positions": [0, 1, 2, 3], "roster_fingerprint": "1/1/1/1:00000000"}, headers=headers)
        assert res.status_code == 409 and res.get_json()["code"] == "roster_changed"

    def test_below_the_minimum_is_a_409_with_the_requirements(self, client: FlaskClient, headers: dict[str, str]) -> None:
        run = get_run(client, headers, "hardcore")
        res = client.post(f"{BASE}/opening", json={"run_id": run["id"], "side": "survivor", "perk_positions": [0, 1, 2, 3]}, headers=headers)
        assert res.status_code == 409
        data = res.get_json()
        assert data["code"] == "roster_below_minimum" and data["eligibility"]["met"] is False


@pytest.mark.unit
class TestLaneRoutes:
    SURVIVOR = "/api/v1/id-please-survivor-streak"
    KILLER = "/api/v1/id-please-killer-streak"

    @pytest.fixture
    def lanes(self, db_session: Session) -> dict[str, str]:
        seed_roster(killers=10, survivors=10)
        service = UserService()
        user, err = service.register_user("laneplayer", "laneplayer", "lp@test.com", "password123")
        assert err is None
        return {"Authorization": f"Bearer {service.authenticate('laneplayer', 'password123')[1]}"}

    @pytest.mark.parametrize("base", [SURVIVOR, KILLER])
    def test_every_lane_requires_login(self, client: FlaskClient, base: str) -> None:
        assert client.get(f"{base}/run?difficulty=milestones").status_code == 401

    def test_a_lane_run_carries_its_lane_and_no_streak_badge(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        run = client.get(f"{self.SURVIVOR}/run?difficulty=milestones", headers=lanes).get_json()["run"]
        assert (run["lane"], run["badge_streak"]) == ("survivor", None)
        assert run["badge_progress"] == {"current": 0, "target": 10}

    def test_the_lanes_have_separate_runs(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        ids = {
            client.get(f"{base}/run?difficulty=milestones", headers=lanes).get_json()["run"]["id"]
            for base in (BASE, self.SURVIVOR, self.KILLER)
        }
        assert len(ids) == 3

    def test_the_other_side_is_a_bad_request(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        run = client.get(f"{self.KILLER}/run?difficulty=milestones", headers=lanes).get_json()["run"]
        res = client.post(
            f"{self.KILLER}/opening", json={"run_id": run["id"], "side": "survivor", "perk_positions": [0, 1, 2, 3]}, headers=lanes
        )
        assert res.status_code == 400 and "killer side only" in res.get_json()["error"]
        assert client.get(f"{self.KILLER}/roster?side=survivor", headers=lanes).status_code == 400

    def test_a_run_of_another_lane_is_not_found(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        run = client.get(f"{self.SURVIVOR}/run?difficulty=milestones", headers=lanes).get_json()["run"]
        res = client.post(f"{self.KILLER}/result", json={"run_id": run["id"], "match_number": 1, "result": "win"}, headers=lanes)
        assert res.status_code == 404

    def test_a_lane_plays_through_over_http(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        run = client.get(f"{self.SURVIVOR}/run?difficulty=milestones", headers=lanes).get_json()["run"]
        run = client.post(
            f"{self.SURVIVOR}/opening", json={"run_id": run["id"], "side": "survivor", "perk_positions": [0, 1, 2, 3]}, headers=lanes
        ).get_json()["run"]
        for _ in range(10):
            run = client.post(
                f"{self.SURVIVOR}/result", json={"run_id": run["id"], "match_number": run["current_match"], "result": "win"}, headers=lanes
            ).get_json()["run"]
        assert run["badge_earned"] is True and run["current_streak"] == 10
        completions = client.get(f"{self.SURVIVOR}/completions?difficulty=milestones", headers=lanes).get_json()
        assert completions["completions"]
        assert client.get(f"{BASE}/completions?difficulty=milestones", headers=lanes).get_json()["completions"] == []

    def test_the_eligibility_of_a_lane_ignores_the_other_side(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        body = client.get(f"{self.KILLER}/eligibility", headers=lanes).get_json()
        assert body["difficulties"]["milestones"]["met"] is True
        assert body["difficulties"]["milestones"]["survivor"]["characters"]["need"] == 0

    def test_the_preview_takes_a_difficulty(self, client: FlaskClient, lanes: dict[str, str]) -> None:
        ok = client.get(f"{self.SURVIVOR}/preview?side=survivor&perks=0,1,2,3&difficulty=hardcore", headers=lanes)
        assert ok.status_code == 200
        assert client.get(f"{self.SURVIVOR}/preview?side=survivor&perks=0,1,2,3&difficulty=hardcore_plus", headers=lanes).status_code == 400
        assert client.get(f"{self.SURVIVOR}/preview?side=survivor&perks=0,1,2,3&difficulty=nightmare", headers=lanes).status_code == 400

    def test_each_lane_follows_its_own_kill_switch(self, client: FlaskClient, lanes: dict[str, str], db_session: Session) -> None:
        db_session.add(ChallengeModeSetting(mode="id_please_killer", is_enabled=False, disabled_reason="maintenance"))
        db_session.commit()
        assert client.get(f"{self.KILLER}/run?difficulty=milestones", headers=lanes).status_code >= 400
        assert client.get(f"{self.SURVIVOR}/run?difficulty=milestones", headers=lanes).status_code == 200
        assert client.get(f"{BASE}/run?difficulty=milestones", headers=lanes).status_code == 200
