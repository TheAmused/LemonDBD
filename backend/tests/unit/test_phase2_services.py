# backend/tests/unit/test_phase2_services.py
import pytest
from flask.testing import FlaskClient
from app import create_app
from app.services.synergy_service import SynergyService, calculate_synergy


@pytest.mark.unit
class TestPhase2Services:
    """Tests for Phase 2 Synergy scoring, anti-synergy warnings, and tactical badges."""

    @pytest.fixture
    def client(self) -> FlaskClient:
        app = create_app()
        app.config["TESTING"] = True
        return app.test_client()

    def test_positive_synergies(self) -> None:
        res_sb_vigil = calculate_synergy(["Sprint Burst", "Vigil"], role="survivor")
        assert res_sb_vigil["score"] > 50
        has_sb_vigil = any(
            "Sprint Burst" in syn["perks"] and "Vigil" in syn["perks"]
            for syn in res_sb_vigil["positive_synergies"]
        )
        assert has_sb_vigil is True

        res_sloppy_nurses = calculate_synergy(["Sloppy Butcher", "A Nurse's Calling"], role="killer")
        assert res_sloppy_nurses["score"] > 50
        has_sloppy_nurses = any(
            "Sloppy Butcher" in syn["perks"] and "A Nurse's Calling" in syn["perks"]
            for syn in res_sloppy_nurses["positive_synergies"]
        )
        assert has_sloppy_nurses is True

        res_pain_pop = calculate_synergy(
            ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel"], role="killer"
        )
        assert res_pain_pop["score"] > 50
        has_pain_pop = any(
            "Scourge Hook: Pain Resonance" in syn["perks"] and "Pop Goes the Weasel" in syn["perks"]
            for syn in res_pain_pop["positive_synergies"]
        )
        assert has_pain_pop is True

        res_over_brine = calculate_synergy(["Overcharge", "Call of Brine"], role="killer")
        assert res_over_brine["score"] > 50
        has_over_brine = any(
            "Overcharge" in syn["perks"] and "Call of Brine" in syn["perks"]
            for syn in res_over_brine["positive_synergies"]
        )
        assert has_over_brine is True

    def test_anti_synergies(self) -> None:
        res_exhaustion = calculate_synergy(["Sprint Burst", "Lithe", "Balanced Landing"], role="survivor")
        has_exhaustion_anti = any(
            "exhaustion" in anti["description"].lower()
            for anti in res_exhaustion["anti_synergies"]
        )
        assert has_exhaustion_anti is True

        res_no_mither = calculate_synergy(["No Mither", "Self-Care"], role="survivor")
        has_no_mither_anti = any(
            "No Mither" in anti["perks"] and "Self-Care" in anti["perks"]
            for anti in res_no_mither["anti_synergies"]
        )
        assert has_no_mither_anti is True

        res_ruin_pop = calculate_synergy(["Hex: Ruin", "Pop Goes the Weasel"], role="killer")
        has_ruin_pop_anti = any(
            "Hex: Ruin" in anti["perks"] and "Pop Goes the Weasel" in anti["perks"]
            for anti in res_ruin_pop["anti_synergies"]
        )
        assert has_ruin_pop_anti is True

    def test_tactical_badges(self) -> None:
        res_gen = calculate_synergy(
            ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel", "Corrupt Intervention"], role="killer"
        )
        assert "Gen Pressure" in res_gen["tactical_badges"]

        res_chase = calculate_synergy(
            ["Windows of Opportunity", "Sprint Burst", "Resilience"], role="survivor"
        )
        assert "Chase Specialist" in res_chase["tactical_badges"]

        res_heal = calculate_synergy(["Botany Knowledge", "We'll Make It"], role="survivor")
        assert "Healing Core" in res_heal["tactical_badges"]

        res_stealth = calculate_synergy(["Distortion", "Off the Record"], role="survivor")
        assert "Stealth Master" in res_stealth["tactical_badges"]

    def test_synergy_endpoint(self, client: FlaskClient) -> None:
        res = client.post(
            "/api/v1/synergy/analyze",
            json={"perks": ["Sprint Burst", "Vigil"], "role": "survivor"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "score" in data
        assert "positive_synergies" in data
        assert "anti_synergies" in data
        assert "tactical_badges" in data
        assert data["score"] > 50
