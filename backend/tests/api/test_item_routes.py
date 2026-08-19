import unittest
from app import create_app
from app.services.perk_service import PerkService, ItemModel, AddonModel


class TestItemRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_list_items(self):
        response = self.client.get("/api/v1/items")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("count", data)
        self.assertIn("data", data)
        self.assertIsInstance(data["data"], list)

    def test_list_addons(self):
        response = self.client.get("/api/v1/addons")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("count", data)
        self.assertIn("data", data)
        self.assertIsInstance(data["data"], list)

        # Test search and category query parameters
        response_filtered = self.client.get("/api/v1/addons?category=Med-Kit&search=Bandage")
        self.assertEqual(response_filtered.status_code, 200)
        data_filtered = response_filtered.get_json()
        self.assertIn("count", data_filtered)
        self.assertIn("data", data_filtered)
        self.assertIsInstance(data_filtered["data"], list)

    def test_perk_service_items_and_addons(self):
        service = PerkService()
        service._items_cache = [
            ItemModel(
                name="Emergency Med-Kit",
                category="Med-Kit",
                role="Survivor",
                description="Heals survivors quickly",
                rarity="Rare",
            ),
            ItemModel(
                name="Flashlight",
                category="Flashlight",
                role="Survivor",
                description="Blinds killers",
                rarity="Uncommon",
            ),
        ]
        service._addons_cache = [
            AddonModel(
                name="Gel Dressings",
                associated_target="Emergency Med-Kit",
                category="Med-Kit",
                description="Adds charges",
                rarity="Rare",
            ),
            AddonModel(
                name="Heavy Duty Battery",
                associated_target="Flashlight",
                category="Flashlight",
                description="Increases battery duration",
                rarity="Uncommon",
            ),
        ]

        # Test get_items filtering
        medkits = service.get_items(category="Med-Kit")
        self.assertEqual(len(medkits), 1)
        self.assertEqual(medkits[0]["name"], "Emergency Med-Kit")

        search_result = service.get_items(search="blind")
        self.assertEqual(len(search_result), 1)
        self.assertEqual(search_result[0]["name"], "Flashlight")

        # Test get_addons filtering
        medkit_addons = service.get_addons(category="Med-Kit")
        self.assertEqual(len(medkit_addons), 1)
        self.assertEqual(medkit_addons[0]["name"], "Gel Dressings")

        target_addons = service.get_addons(target="Flashlight")
        self.assertEqual(len(target_addons), 1)
        self.assertEqual(target_addons[0]["name"], "Heavy Duty Battery")

        addon_search = service.get_addons(search="charges")
        self.assertEqual(len(addon_search), 1)
        self.assertEqual(addon_search[0]["name"], "Gel Dressings")


if __name__ == "__main__":
    unittest.main()
