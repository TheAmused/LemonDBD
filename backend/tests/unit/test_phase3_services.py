# backend/tests/unit/test_phase3_services.py
import unittest
import pytest
from app import create_app
from app.services.others.killer_calc_service import KillerCalcService, calculate_killer_calc


@pytest.mark.unit
class TestPhase3Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.calc_service = KillerCalcService()

    def test_get_killers_data(self):
        killers = self.calc_service.get_killers()
        self.assertIn("huntress", killers)
        self.assertIn("nurse", killers)
        self.assertIn("blight", killers)
        self.assertIn("trapper", killers)
        self.assertIn("wraith", killers)
        self.assertIn("spirit", killers)
        self.assertEqual(killers["huntress"]["base_terror_radius"], 20)
        self.assertEqual(killers["huntress"]["lullaby_radius"], 45)

    def test_huntress_windup_addons_stacking(self):
        result = calculate_killer_calc(
            killer_id="huntress",
            addon_ids=["flower_babushka", "manna_grass_braid"],
            perk_ids=[],
            perk_options={}
        )
        windup_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "windup_time"), None)
        self.assertIsNotNone(windup_stat)
        self.assertEqual(windup_stat["base"], 1.0)
        self.assertEqual(windup_stat["modified"], 0.8)
        self.assertEqual(windup_stat["delta_percent"], -20.0)

    def test_nurse_fatigue_and_charge_addons(self):
        result = calculate_killer_calc(
            killer_id="nurse",
            addon_ids=["fragile_wheeze", "heavy_panting"],
            perk_ids=[],
            perk_options={}
        )
        fatigue_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "blink_fatigue_time"), None)
        charge_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "blink_charge_speed"), None)
        self.assertIsNotNone(fatigue_stat)
        self.assertIsNotNone(charge_stat)
        self.assertEqual(fatigue_stat["modified"], 2.12)
        self.assertEqual(charge_stat["modified"], 120.0)

    def test_blight_rush_speed_addons(self):
        result = calculate_killer_calc(
            killer_id="blight",
            addon_ids=["blighted_rat", "blighted_crow"],
            perk_ids=[],
            perk_options={}
        )
        rush_speed = next((s for s in result["stat_deltas"] if s["stat_id"] == "rush_speed"), None)
        self.assertIsNotNone(rush_speed)
        self.assertEqual(rush_speed["modified"], 25.0)

    def test_tr_distressing(self):
        result = calculate_killer_calc(
            killer_id="huntress",
            addon_ids=[],
            perk_ids=["distressing"],
            perk_options={}
        )
        self.assertEqual(result["terror_radius"]["base"], 20.0)
        self.assertEqual(result["terror_radius"]["modified"], 25.2)

    def test_tr_monitor_and_abuse_out_of_chase(self):
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["monitor_and_abuse"],
            perk_options={"in_chase": False}
        )
        self.assertEqual(result["terror_radius"]["modified"], 24.0)

    def test_tr_monitor_and_abuse_in_chase(self):
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["monitor_and_abuse"],
            perk_options={"in_chase": True}
        )
        self.assertEqual(result["terror_radius"]["modified"], 40.0)

    def test_tr_agitation(self):
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["agitation"],
            perk_options={"carrying_survivor": True}
        )
        self.assertEqual(result["terror_radius"]["modified"], 44.0)

    def test_tr_furtive_chase(self):
        result = calculate_killer_calc(
            killer_id="spirit",
            addon_ids=[],
            perk_ids=["furtive_chase"],
            perk_options={"furtive_chase_tokens": 4}
        )
        self.assertEqual(result["terror_radius"]["modified"], 16.0)

    def test_combined_tr_perks(self):
        result = calculate_killer_calc(
            killer_id="spirit",
            addon_ids=[],
            perk_ids=["distressing", "monitor_and_abuse", "furtive_chase"],
            perk_options={"in_chase": False, "furtive_chase_tokens": 2}
        )
        self.assertEqual(result["terror_radius"]["modified"], 24.32)

    def test_api_calculate_endpoint(self):
        response = self.client.post(
            "/api/v1/killer-calc/calculate",
            json={
                "killer_id": "huntress",
                "addon_ids": ["flower_babushka", "manna_grass_braid"],
                "perk_ids": ["distressing"],
                "perk_options": {}
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("killer", data)
        self.assertIn("terror_radius", data)
        self.assertIn("lullaby", data)
        self.assertIn("stat_deltas", data)
        self.assertEqual(data["terror_radius"]["modified"], 25.2)

    def test_api_data_endpoint(self):
        response = self.client.get("/api/v1/killer-calc/data")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("killers", data)
        self.assertIn("perks", data)


if __name__ == "__main__":
    unittest.main()
