# backend/tests/unit/api/test_gauntlet_routes.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.models import Killer, Perk, Survivor
from app.services.user_service import UserService
from tests.unit.conftest import make_chapter


def seed_killer(name: str, perk_count: int = 3) -> Killer:
    from app.core.extensions import db

    character = Killer(name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                killer_id=character.id,
                is_teachable=True,
                role="Killer",
            )
        )
    db.session.commit()
    return character


@pytest.fixture
def gauntlet_auth_setup(db_session: Session) -> tuple[int, str, dict[str, str]]:
    seed_killer("Nurse")
    seed_killer("Trapper")

    user_service = UserService()
    user, err = user_service.register_user("streakuser", "gauntlet@test.com", "password123")
    assert err is None
    token = user_service.generate_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user.id, token, headers


@pytest.mark.unit
class TestGauntletRoutes:
    """Tests for Gauntlet Streak challenge routes: progress, target reveals, checkpoints, and restarts."""

    def test_run_rejects_unknown_game_mode(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        res = client.get("/api/v1/gauntlet-streak/run?role=killer&game_mode=bogus", headers=headers)
        assert res.status_code == 400

    def test_run_is_created_per_game_mode(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        original = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers).get_json()["run"]
        duo = client.get(
            "/api/v1/gauntlet-streak/run?role=killer&game_mode=lemon_duo", headers=headers
        ).get_json()["run"]
        assert original["game_mode"] == "original"
        assert duo["game_mode"] == "lemon_duo"
        assert original["id"] != duo["id"]

    def test_result_keeps_the_runs_game_mode(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        run = client.get(
            "/api/v1/gauntlet-streak/run?role=killer&game_mode=lemon_squad", headers=headers
        ).get_json()["run"]
        res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run["id"], "result": "win"},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.get_json()["run"]["id"] == run["id"]
        assert res.get_json()["run"]["game_mode"] == "lemon_squad"

    def test_solo_run_lets_the_player_pick_the_character(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        from app.core.extensions import db

        _, _, headers = gauntlet_auth_setup
        for name in ("Meg Thomas", "Dwight Fairfield"):
            db.session.add(Survivor(name=name, chapter_id=make_chapter(db.session).id))
        db.session.commit()

        run = client.get(
            "/api/v1/gauntlet-streak/run?role=survivor&game_mode=lemon_solo", headers=headers
        ).get_json()["run"]
        picked = client.post(
            "/api/v1/gauntlet-streak/target",
            json={"run_id": run["id"], "character": "Dwight Fairfield"},
            headers=headers,
        )
        assert picked.status_code == 200
        assert picked.get_json()["run"]["current_character_id"] == "Dwight Fairfield"
        assert picked.get_json()["run"]["target_revealed"] is True

        missing = client.post("/api/v1/gauntlet-streak/target", json={"run_id": run["id"]}, headers=headers)
        assert missing.status_code == 400

    def test_boost_route_spends_tokens(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        from app.core.extensions import db
        from app.models import GauntletRun

        _, _, headers = gauntlet_auth_setup
        run = client.get(
            "/api/v1/gauntlet-streak/run?role=killer&game_mode=lemon_killer", headers=headers
        ).get_json()["run"]
        client.post("/api/v1/gauntlet-streak/reveal", json={"run_id": run["id"]}, headers=headers)
        row = db.session.get(GauntletRun, run["id"])
        row.tokens = 4
        db.session.commit()

        bought = client.post(
            "/api/v1/gauntlet-streak/boost", json={"run_id": run["id"], "boost": "slot"}, headers=headers
        )
        assert bought.status_code == 200
        body = bought.get_json()["run"]
        assert (body["tokens"], body["bonus_perk_slots"]) == (0, 1)

        poor = client.post(
            "/api/v1/gauntlet-streak/boost", json={"run_id": run["id"], "boost": "reroll"}, headers=headers
        )
        assert poor.status_code == 400
        unknown = client.post(
            "/api/v1/gauntlet-streak/boost", json={"run_id": run["id"], "boost": "teleport"}, headers=headers
        )
        assert unknown.status_code == 400

    def test_result_route_passes_the_shield_through(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        from app.core.extensions import db
        from app.models import GauntletRun

        _, _, headers = gauntlet_auth_setup
        run = client.get(
            "/api/v1/gauntlet-streak/run?role=killer&game_mode=lemon_killer", headers=headers
        ).get_json()["run"]
        row = db.session.get(GauntletRun, run["id"])
        row.tokens = 8
        row.current_streak = 3
        db.session.commit()

        shielded = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run["id"], "result": "loss", "use_shield": True},
            headers=headers,
        )
        assert shielded.status_code == 200
        previous = shielded.get_json()["previous_run"]
        assert (previous["current_streak"], previous["tokens"]) == (3, 0)

        plain = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run["id"], "result": "loss"},
            headers=headers,
        )
        assert plain.get_json()["previous_run"]["current_streak"] == 0

    def test_a_loss_in_a_mode_without_boosts_goes_through_with_or_without_the_shield_flag(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        for game_mode in ("original", "lemon_duo", "lemon_solo"):
            role = "killer" if game_mode == "original" else "survivor"
            run = client.get(
                f"/api/v1/gauntlet-streak/run?role={role}&game_mode={game_mode}", headers=headers
            ).get_json()["run"]
            for body in ({}, {"use_shield": False}):
                res = client.post(
                    "/api/v1/gauntlet-streak/result",
                    json={"role": role, "run_id": run["id"], "result": "loss", **body},
                    headers=headers,
                )
                assert res.status_code == 200, (game_mode, body, res.get_json())

    def test_get_run_auto_creates(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        assert res.status_code == 200
        run = res.get_json()["run"]
        assert run["role"] == "killer"
        assert run["status"] == "in_progress"
        assert "tier_info" in run

    def test_result_lifecycle(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run_id = run_res.get_json()["run"]["id"]

        res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["previous_run"]["current_streak"] == 1
        assert "run" in data

    def test_run_carries_the_targets_character_perks(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run = run_res.get_json()["run"]

        perks = run["current_loadout"]["character_perks"]
        assert perks
        assert all(p["character"] == run["current_character_id"] for p in perks)

    def test_reset_endpoint(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        res = client.post(
            "/api/v1/gauntlet-streak/run/abandon",
            json={"role": "killer"},
            headers=headers,
        )
        assert res.status_code == 200
        run = res.get_json()["run"]
        assert run["current_streak"] == 0
        assert run["target_revealed"] is False

    def test_runs_are_isolated_per_user(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        user_service = UserService()
        other, err = user_service.register_user(
            "otherstreakuser", "other-gauntlet@test.com", "password123"
        )
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run_id = run_res.get_json()["run"]["id"]
        client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=headers,
        )

        other_run = client.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=other_headers
        ).get_json()["run"]
        assert other_run["current_streak"] == 0
