# backend/tests/api/test_item_routes.py
import unittest
from app import create_app
from app.services.perk_service import PerkService


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
        with self.app.app_context():
            from app.core.extensions import db
            from app.models import Item, Addon
            from sqlalchemy import select
            db.create_all()
            existing_medkit = db.session.scalars(select(Item).where(Item.name == "Emergency Med-Kit")).first()
            if not existing_medkit:
                db.session.add(Item(name="Emergency Med-Kit", category="Med-Kit", role="Survivor", description="Heals survivors quickly", rarity="Rare"))
            else:
                existing_medkit.category = "Med-Kit"
            existing_flash = db.session.scalars(select(Item).where(Item.name == "Flashlight")).first()
            if not existing_flash:
                db.session.add(Item(name="Flashlight", category="Flashlight", role="Survivor", description="Blinds killers", rarity="Uncommon"))
            else:
                existing_flash.category = "Flashlight"
                existing_flash.description = "Blinds killers"
            existing_gel = db.session.scalars(select(Addon).where(Addon.name == "Gel Dressings")).first()
            if not existing_gel:
                db.session.add(Addon(name="Gel Dressings", associated_target="Emergency Med-Kit", category="Med-Kit", description="Adds charges", rarity="Rare"))
            else:
                existing_gel.category = "Med-Kit"
                existing_gel.associated_target = "Emergency Med-Kit"
                existing_gel.description = "Adds charges"

            existing_battery = db.session.scalars(select(Addon).where(Addon.name == "Heavy Duty Battery")).first()
            if not existing_battery:
                db.session.add(Addon(name="Heavy Duty Battery", associated_target="Flashlight", category="Flashlight", description="Increases battery duration", rarity="Uncommon"))
            else:
                existing_battery.category = "Flashlight"
                existing_battery.associated_target = "Flashlight"
            db.session.commit()

            service = PerkService()
            medkits = service.get_items(category="Med-Kit")
            self.assertTrue(len(medkits) >= 1)
            self.assertTrue(any(i["name"] == "Emergency Med-Kit" for i in medkits))

            search_result = service.get_items(search="blind")
            self.assertTrue(len(search_result) >= 1)
            self.assertTrue(any(i["name"] == "Flashlight" for i in search_result))

            medkit_addons = service.get_addons(category="Med-Kit")
            self.assertTrue(len(medkit_addons) >= 1)
            self.assertTrue(any(a["name"] == "Gel Dressings" for a in medkit_addons))

            target_addons = service.get_addons(target="Flashlight")
            self.assertTrue(len(target_addons) >= 1)
            self.assertTrue(any(a["name"] == "Heavy Duty Battery" for a in target_addons))

            addon_search = service.get_addons(search="charges")
            self.assertTrue(len(addon_search) >= 1)
            self.assertTrue(any(a["name"] == "Gel Dressings" for a in addon_search))


if __name__ == "__main__":
    unittest.main()
