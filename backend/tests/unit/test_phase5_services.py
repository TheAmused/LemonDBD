# backend/tests/unit/test_phase5_services.py
import unittest
from app import create_app
from app.services.others.custom_perk_service import CustomPerkService


class TestPhase5Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.service = CustomPerkService()

    # -------------------------------------------------------------
    # 1. Custom Perk Service Core Tests
    # -------------------------------------------------------------
    def test_seed_custom_perks(self):
        perks = self.service.get_custom_perks()
        self.assertGreaterEqual(len(perks), 4)

        names = [p["name"] for p in perks]
        self.assertIn("Hex: Shadow Veil", names)
        self.assertIn("Adrenaline Rush: Overdrive", names)
        self.assertIn("Totem Whisperer", names)
        self.assertIn("Entity's Shadow", names)

    def test_filter_by_role(self):
        survivors = self.service.get_custom_perks(role="survivor")
        killers = self.service.get_custom_perks(role="killer")

        self.assertTrue(all(p["role"] == "survivor" for p in survivors))
        self.assertTrue(all(p["role"] == "killer" for p in killers))
        self.assertGreater(len(survivors), 0)
        self.assertGreater(len(killers), 0)

    def test_filter_by_rarity(self):
        iri_perks = self.service.get_custom_perks(rarity="Iridescent")
        vr_perks = self.service.get_custom_perks(rarity="Very Rare")

        self.assertTrue(all(p["rarity"] == "Iridescent" for p in iri_perks))
        self.assertTrue(all(p["rarity"] == "Very Rare" for p in vr_perks))
        self.assertGreater(len(iri_perks), 0)

    def test_search_custom_perks(self):
        results = self.service.get_custom_perks(search="Shadow")
        self.assertGreater(len(results), 0)
        self.assertTrue(any("Shadow" in p["name"] or "Shadow" in p["description"] for p in results))

    def test_sort_custom_perks(self):
        upvote_sorted = self.service.get_custom_perks(sort_by="upvotes")
        upvotes_list = [p["upvotes"] for p in upvote_sorted]
        self.assertEqual(upvotes_list, sorted(upvotes_list, reverse=True))

    def test_create_and_upvote_custom_perk(self):
        new_perk = self.service.create_custom_perk(
            name="Test Custom Perk",
            role="survivor",
            character_name="Dwight Fairfield",
            rarity="Iridescent",
            icon_preset="sparkles",
            description="Grants immunity to all status effects for 10 seconds.",
            author="UnitTester"
        )
        self.assertEqual(new_perk["name"], "Test Custom Perk")
        self.assertEqual(new_perk["role"], "survivor")
        self.assertEqual(new_perk["upvotes"], 0)

        updated_perk = self.service.upvote_custom_perk(new_perk["id"])
        self.assertIsNotNone(updated_perk)
        self.assertEqual(updated_perk["upvotes"], 1)

    def test_upvote_nonexistent_custom_perk(self):
        res = self.service.upvote_custom_perk(999999)
        self.assertIsNone(res)

    # -------------------------------------------------------------
    # 2. API Endpoints Tests
    # -------------------------------------------------------------
    def test_api_list_custom_perks(self):
        res = self.client.get("/api/v1/custom-perks/?role=killer")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("custom_perks", data)
        self.assertTrue(all(p["role"] == "killer" for p in data["custom_perks"]))

    def test_api_create_custom_perk(self):
        payload = {
            "name": "API Perk Concept",
            "role": "killer",
            "character_name": "The Nurse",
            "rarity": "Very Rare",
            "icon_preset": "zap",
            "description": "Blink distance increased by 20%.",
            "author": "BlinkMaster"
        }
        res = self.client.post("/api/v1/custom-perks/", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("custom_perk", data)
        self.assertEqual(data["custom_perk"]["name"], "API Perk Concept")

    def test_api_create_custom_perk_validation_error(self):
        # Missing required name
        res = self.client.post("/api/v1/custom-perks/", json={"role": "survivor", "description": "Test"})
        self.assertEqual(res.status_code, 400)

    def test_api_upvote_custom_perk(self):
        create_res = self.client.post("/api/v1/custom-perks/", json={
            "name": "Upvote Target Perk",
            "role": "survivor",
            "character_name": "Claudette Morel",
            "rarity": "Uncommon",
            "icon_preset": "heart",
            "description": "Self-heal speed increased by 10%.",
            "author": "Medic"
        })
        perk_id = create_res.get_json()["custom_perk"]["id"]

        upvote_res = self.client.post(f"/api/v1/custom-perks/{perk_id}/upvote")
        self.assertEqual(upvote_res.status_code, 200)
        upvote_data = upvote_res.get_json()
        self.assertEqual(upvote_data["custom_perk"]["upvotes"], 1)

    def test_api_upvote_nonexistent_perk(self):
        res = self.client.post("/api/v1/custom-perks/999999/upvote")
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
