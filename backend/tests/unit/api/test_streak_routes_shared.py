# backend/tests/unit/api/test_streak_routes_shared.py
"""Route scenarios that are identical across the chaos, gauntlet and history streak modes.

Anything specific to one mode (payload fields, win/loss effects) stays in that
mode's own `test_<mode>_routes.py`.
"""
from dataclasses import dataclass

import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.models import Killer, Perk
from app.services.user_service import UserService
from tests.unit.conftest import make_chapter


@dataclass(frozen=True)
class StreakMode:
    name: str
    prefix: str
    param: str
    value: str
    invalid_values: tuple[str, ...]
    reveal_field: str | None = None  # run field flipped by POST /reveal; None = no reveal endpoint
    needs_killer_id: bool = False  # POST /result requires a killer_id


MODES = (
    StreakMode(
        "chaos", "/api/v1/chaos-streak", "difficulty", "hell",
        invalid_values=("nonsense", "hardcore", "extreme", ""), reveal_field="perks_revealed", needs_killer_id=True,
    ),
    StreakMode("gauntlet", "/api/v1/gauntlet-streak", "role", "killer", invalid_values=("bogus",), reveal_field="target_revealed"),
    StreakMode(
        "history", "/api/v1/history-streak", "mode", "hell",
        invalid_values=("easy", "invalid_custom", ""), needs_killer_id=True,
    ),
)
mode_param = pytest.mark.parametrize("mode", MODES, ids=lambda m: m.name)


def _seed_killer(killer_id: int, name: str) -> None:
    from app.core.extensions import db

    killer = Killer(id=killer_id, name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power")
    db.session.add(killer)
    db.session.flush()
    for i in range(1, 4):
        db.session.add(
            Perk(name=f"{name} Perk {i}", killer_id=killer.id, is_teachable=True, role="Killer")
        )
    db.session.commit()


@pytest.fixture
def headers(db_session: Session) -> dict[str, str]:
    _seed_killer(1, "The Trapper")
    _seed_killer(2, "The Wraith")
    user_service = UserService()
    _, err = user_service.register_user("routeuser", "route@test.com", "password123")
    assert err is None
    token = user_service.authenticate("routeuser", "password123")[1]
    return {"Authorization": f"Bearer {token}"}


def _query(mode: StreakMode) -> str:
    return f"{mode.param}={mode.value}"


@pytest.mark.unit
class TestSharedStreakRoutes:
    @mode_param
    def test_endpoints_require_login(self, client: FlaskClient, mode: StreakMode) -> None:
        assert client.get(f"{mode.prefix}/run?{_query(mode)}").status_code == 401
        assert client.post(f"{mode.prefix}/run/abandon", json={mode.param: mode.value}).status_code == 401
        assert client.get(f"{mode.prefix}/stats?{_query(mode)}").status_code == 401

    @mode_param
    def test_run_requires_valid_variant(
        self, client: FlaskClient, headers: dict[str, str], mode: StreakMode
    ) -> None:
        for invalid in mode.invalid_values:
            resp = client.get(f"{mode.prefix}/run?{mode.param}={invalid}", headers=headers)
            assert resp.status_code == 400, invalid

    @mode_param
    def test_get_run_auto_creates_for_the_variant(
        self, client: FlaskClient, headers: dict[str, str], mode: StreakMode
    ) -> None:
        resp = client.get(f"{mode.prefix}/run?{_query(mode)}", headers=headers)
        assert resp.status_code == 200
        run = resp.get_json()["run"]
        assert run[mode.param] == mode.value
        assert run["status"] == "in_progress"

    @mode_param
    def test_reset_requires_an_existing_run(
        self, client: FlaskClient, headers: dict[str, str], mode: StreakMode
    ) -> None:
        resp = client.post(f"{mode.prefix}/run/abandon", json={mode.param: mode.value}, headers=headers)
        assert resp.status_code == 404

    @mode_param
    def test_reset_recreates_the_run(
        self, client: FlaskClient, headers: dict[str, str], mode: StreakMode
    ) -> None:
        client.get(f"{mode.prefix}/run?{_query(mode)}", headers=headers)
        resp = client.post(f"{mode.prefix}/run/abandon", json={mode.param: mode.value}, headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()["run"][mode.param] == mode.value

    @mode_param
    def test_stats_endpoint_starts_empty(
        self, client: FlaskClient, headers: dict[str, str], mode: StreakMode
    ) -> None:
        resp = client.get(f"{mode.prefix}/stats?{_query(mode)}", headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()["stats"]["total_matches"] == 0

    @pytest.mark.parametrize("mode", [m for m in MODES if m.reveal_field], ids=lambda m: m.name)
    def test_reveal_endpoint(self, client: FlaskClient, headers: dict[str, str], mode: StreakMode) -> None:
        run = client.get(f"{mode.prefix}/run?{_query(mode)}", headers=headers).get_json()["run"]
        resp = client.post(f"{mode.prefix}/reveal", json={"run_id": run["id"]}, headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()["run"][mode.reveal_field] is True

    @pytest.mark.parametrize("mode", [m for m in MODES if m.needs_killer_id], ids=lambda m: m.name)
    def test_result_requires_killer_id(
        self, client: FlaskClient, headers: dict[str, str], mode: StreakMode
    ) -> None:
        run = client.get(f"{mode.prefix}/run?{_query(mode)}", headers=headers).get_json()["run"]
        resp = client.post(
            f"{mode.prefix}/result", json={"run_id": run["id"], "result": "win"}, headers=headers
        )
        assert resp.status_code == 400
