# backend/tests/unit/test_phase2_services.py
import os
import unittest
from app import create_app
from app.services.synergy_service import SynergyService, calculate_synergy


class TestPhase2Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.synergy_service = SynergyService()

    # -------------------------------------------------------------
    # 1. Positive Synergies & Scoring Tests
    # -------------------------------------------------------------
    def test_positive_synergies(self):
        # Sprint Burst + Vigil
        res_sb_vigil = calculate_synergy(["Sprint Burst", "Vigil"], role="survivor")
        self.assertGreater(res_sb_vigil["score"], 50)
        has_sb_vigil = any(
            "Sprint Burst" in syn["perks"] and "Vigil" in syn["perks"]
            for syn in res_sb_vigil["positive_synergies"]
        )
        self.assertTrue(has_sb_vigil, "Expected positive synergy between Sprint Burst and Vigil")

        # Sloppy Butcher + A Nurse's Calling
        res_sloppy_nurses = calculate_synergy(["Sloppy Butcher", "A Nurse's Calling"], role="killer")
        self.assertGreater(res_sloppy_nurses["score"], 50)
        has_sloppy_nurses = any(
            "Sloppy Butcher" in syn["perks"] and "A Nurse's Calling" in syn["perks"]
            for syn in res_sloppy_nurses["positive_synergies"]
        )
        self.assertTrue(has_sloppy_nurses, "Expected positive synergy between Sloppy Butcher and A Nurse's Calling")

        # Scourge Hook: Pain Resonance + Pop Goes the Weasel
        res_pain_pop = calculate_synergy(
            ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel"], role="killer"
        )
        self.assertGreater(res_pain_pop["score"], 50)
        has_pain_pop = any(
            "Scourge Hook: Pain Resonance" in syn["perks"] and "Pop Goes the Weasel" in syn["perks"]
            for syn in res_pain_pop["positive_synergies"]
        )
        self.assertTrue(has_pain_pop, "Expected positive synergy between Pain Res and Pop")

        # Overcharge + Call of Brine
        res_over_brine = calculate_synergy(["Overcharge", "Call of Brine"], role="killer")
        self.assertGreater(res_over_brine["score"], 50)
        has_over_brine = any(
            "Overcharge" in syn["perks"] and "Call of Brine" in syn["perks"]
            for syn in res_over_brine["positive_synergies"]
        )
        self.assertTrue(has_over_brine, "Expected positive synergy between Overcharge and Call of Brine")

    # -------------------------------------------------------------
    # 2. Anti-Synergies Tests
    # -------------------------------------------------------------
    def test_anti_synergies(self):
        # Multiple Exhaustion Perks
        res_exhaustion = calculate_synergy(["Sprint Burst", "Lithe", "Balanced Landing"], role="survivor")
        has_exhaustion_anti = any(
            "Exhaustion" in anti["description"] or "exhaustion" in anti["description"].lower()
            for anti in res_exhaustion["anti_synergies"]
        )
        self.assertTrue(has_exhaustion_anti, "Expected anti-synergy warning for multiple Exhaustion perks")

        # No Mither + Self-Care
        res_no_mither = calculate_synergy(["No Mither", "Self-Care"], role="survivor")
        has_no_mither_anti = any(
            "No Mither" in anti["perks"] and "Self-Care" in anti["perks"]
            for anti in res_no_mither["anti_synergies"]
        )
        self.assertTrue(has_no_mither_anti, "Expected anti-synergy warning for No Mither + Self-Care")

        # Hex: Ruin + Pop Goes the Weasel
        res_ruin_pop = calculate_synergy(["Hex: Ruin", "Pop Goes the Weasel"], role="killer")
        has_ruin_pop_anti = any(
            "Hex: Ruin" in anti["perks"] and "Pop Goes the Weasel" in anti["perks"]
            for anti in res_ruin_pop["anti_synergies"]
        )
        self.assertTrue(has_ruin_pop_anti, "Expected anti-synergy warning for Hex: Ruin + Pop Goes the Weasel")

    # -------------------------------------------------------------
    # 3. Tactical Badges Tests
    # -------------------------------------------------------------
    def test_tactical_badges(self):
        # Gen Pressure
        res_gen = calculate_synergy(
            ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel", "Corrupt Intervention"], role="killer"
        )
        self.assertIn("Gen Pressure", res_gen["tactical_badges"])

        # Chase Specialist
        res_chase = calculate_synergy(
            ["Windows of Opportunity", "Sprint Burst", "Resilience"], role="survivor"
        )
        self.assertIn("Chase Specialist", res_chase["tactical_badges"])

        # Healing Core
        res_heal = calculate_synergy(["Botany Knowledge", "We'll Make It"], role="survivor")
        self.assertIn("Healing Core", res_heal["tactical_badges"])

        # Stealth Master
        res_stealth = calculate_synergy(["Distortion", "Off the Record"], role="survivor")
        self.assertIn("Stealth Master", res_stealth["tactical_badges"])

    # -------------------------------------------------------------
    # 4. Synergy API Endpoint Tests
    # -------------------------------------------------------------
    def test_synergy_endpoint(self):
        res = self.client.post(
            "/api/v1/synergy/analyze",
            json={"perks": ["Sprint Burst", "Vigil"], "role": "survivor"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("score", data)
        self.assertIn("positive_synergies", data)
        self.assertIn("anti_synergies", data)
        self.assertIn("tactical_badges", data)
        self.assertGreater(data["score"], 50)


if __name__ == "__main__":
    unittest.main()
