# backend/tests/unit/test_phase3_services.py
import pytest
from flask.testing import FlaskClient
from app import create_app
from app.services.others.killer_calc_service import KillerCalcService, calculate_killer_calc


@pytest.mark.unit
class TestPhase3Services:
    """Tests for Phase 3 Killer calculations: add-on stacking, terror radiuses, and formulas."""

    @pytest.fixture
    def calc_service(self) -> KillerCalcService:
        return KillerCalcService()

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_get_killers_data(self, calc_service: KillerCalcService) -> None:
        killers = calc_service.get_killers()
        assert "huntress" in killers
        assert "nurse" in killers
        assert "blight" in killers
        assert "trapper" in killers
        assert "wraith" in killers
        assert "spirit" in killers
        assert killers["huntress"]["base_terror_radius"] == 20
        assert killers["huntress"]["lullaby_radius"] == 45

    def test_huntress_windup_addons_stacking(self) -> None:
        result = calculate_killer_calc(
            killer_id="huntress",
            addon_ids=["flower_babushka", "manna_grass_braid"],
            perk_ids=[],
            perk_options={},
        )
        windup_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "windup_time"), None)
        assert windup_stat is not None
        assert windup_stat["base"] == 1.0
        assert windup_stat["modified"] == 0.8
        assert windup_stat["delta_percent"] == -20.0

    def test_nurse_fatigue_and_charge_addons(self) -> None:
        result = calculate_killer_calc(
            killer_id="nurse",
            addon_ids=["fragile_wheeze", "heavy_panting"],
            perk_ids=[],
            perk_options={},
        )
        fatigue_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "blink_fatigue_time"), None)
        charge_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "blink_charge_speed"), None)
        assert fatigue_stat is not None
        assert charge_stat is not None
        assert fatigue_stat["modified"] == 2.12
        assert charge_stat["modified"] == 120.0

    def test_blight_rush_speed_addons(self) -> None:
        result = calculate_killer_calc(
            killer_id="blight",
            addon_ids=["blighted_rat", "blighted_crow"],
            perk_ids=[],
            perk_options={},
        )
        rush_speed = next((s for s in result["stat_deltas"] if s["stat_id"] == "rush_speed"), None)
        assert rush_speed is not None
        assert rush_speed["modified"] == 25.0

    def test_tr_distressing(self) -> None:
        result = calculate_killer_calc(
            killer_id="huntress",
            addon_ids=[],
            perk_ids=["distressing"],
            perk_options={},
        )
        assert result["terror_radius"]["base"] == 20.0
        assert result["terror_radius"]["modified"] == 25.2

    def test_tr_monitor_and_abuse_out_of_chase(self) -> None:
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["monitor_and_abuse"],
            perk_options={"in_chase": False},
        )
        assert result["terror_radius"]["modified"] == 24.0

    def test_tr_monitor_and_abuse_in_chase(self) -> None:
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["monitor_and_abuse"],
            perk_options={"in_chase": True},
        )
        assert result["terror_radius"]["modified"] == 40.0

    def test_tr_agitation(self) -> None:
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["agitation"],
            perk_options={"carrying_survivor": True},
        )
        assert result["terror_radius"]["modified"] == 44.0

    def test_tr_furtive_chase(self) -> None:
        result = calculate_killer_calc(
            killer_id="spirit",
            addon_ids=[],
            perk_ids=["furtive_chase"],
            perk_options={"furtive_chase_tokens": 4},
        )
        assert result["terror_radius"]["modified"] == 16.0

    def test_combined_tr_perks(self) -> None:
        result = calculate_killer_calc(
            killer_id="spirit",
            addon_ids=[],
            perk_ids=["distressing", "monitor_and_abuse", "furtive_chase"],
            perk_options={"in_chase": False, "furtive_chase_tokens": 2},
        )
        assert result["terror_radius"]["modified"] == 24.32

    def test_api_calculate_endpoint(self, client: FlaskClient) -> None:
        response = client.post(
            "/api/v1/killer-calc/calculate",
            json={
                "killer_id": "huntress",
                "addon_ids": ["flower_babushka", "manna_grass_braid"],
                "perk_ids": ["distressing"],
                "perk_options": {},
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        assert "killer" in data
        assert "terror_radius" in data
        assert "lullaby" in data
        assert "stat_deltas" in data
        assert data["terror_radius"]["modified"] == 25.2

    def test_api_data_endpoint(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/killer-calc/data")
        assert response.status_code == 200
        data = response.get_json()
        assert "killers" in data
        assert "perks" in data
