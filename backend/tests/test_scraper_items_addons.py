import unittest
from unittest.mock import MagicMock, patch
from app.services.scraper_service import (
    ItemData,
    AddonData,
    CharacterData,
    NightlightScraperDriver,
    WikiScraperDriver,
    ScraperService,
)


class TestScraperItemsAndAddons(unittest.TestCase):
    def test_strict_perk_filtering(self):
        chunk_js = """
        {
            "101": {"n": "Sprint Burst", "i": "Sprint_Burst", "u": "/perks/sprint-burst", "r": 1, "c": 1001},
            "102": {"n": "Flashlight", "i": "Flashlight", "u": "/items/flashlight", "k": "Item", "r": 1},
            "103": {"n": "Battery", "i": "Battery", "u": "", "k": "Addon", "r": 1},
            "104": {"n": "Self-Care", "i": "Self_Care", "u": "/perks/self-care", "r": 1, "c": 1002}
        }
        """
        driver = NightlightScraperDriver()
        perks = driver.parse_nightlight_perks(chunk_js, stream_payload="")
        perk_names = [p.name for p in perks]
        self.assertIn("Sprint Burst", perk_names)
        self.assertIn("Self-Care", perk_names)
        self.assertNotIn("Flashlight", perk_names)
        self.assertNotIn("Battery", perk_names)

    def test_parse_nightlight_items_and_addons(self):
        chunk_js = """
        {
            "201": {"n": "Flashlight", "i": "Flashlight", "u": "/items/flashlight", "k": "Item", "r": 1, "rar": "Rare"},
            "202": {"n": "Emergency Med-Kit", "i": "Medkit", "u": "/items/med-kit", "k": "Item", "r": 1, "rar": "Very Rare"},
            "301": {"n": "Battery", "i": "Battery", "u": "/addons/battery", "k": "Addon", "c": "Flashlight", "r": 1, "rar": "Uncommon"},
            "302": {"n": "Brand New Part", "i": "BNP", "u": "/addons/brand-new-part", "k": "Addon", "c": "Toolbox", "r": 1, "rar": "Ultra Rare"}
        }
        """
        stream_payload = """
        <div data-item="Flashlight"><p>Creates a beam of light.</p></div>
        <div data-item="Emergency Med-Kit"><p>Heals survivors quickly.</p></div>
        <div data-addon="Battery"><p>Increases flashlight duration.</p></div>
        <div data-addon="Brand New Part"><p>Instantly repairs a generator.</p></div>
        """
        driver = NightlightScraperDriver()
        items, addons = driver.parse_nightlight_items_and_addons(chunk_js, stream_payload, characters=[])

        self.assertEqual(len(items), 2)
        self.assertEqual(len(addons), 2)

        flashlight = next(i for i in items if i.name == "Flashlight")
        self.assertIsInstance(flashlight, ItemData)
        self.assertEqual(flashlight.name, "Flashlight")
        self.assertEqual(flashlight.role, "Survivor")
        self.assertEqual(flashlight.rarity, "Rare")
        self.assertIn("beam of light", flashlight.description)
        self.assertEqual(flashlight.icon_local_path, "icons/items/flashlight.png")

        battery = next(a for a in addons if a.name == "Battery")
        self.assertIsInstance(battery, AddonData)
        self.assertEqual(battery.name, "Battery")
        self.assertEqual(battery.associated_target, "Flashlight")
        self.assertEqual(battery.rarity, "Uncommon")
        self.assertIn("flashlight duration", battery.description)
        self.assertEqual(battery.icon_local_path, "icons/addons/battery.png")

    def test_wiki_items_and_addons_scraping(self):
        wiki_items_html = """
        <div class="mw-parser-output">
            <h2>Survivor Items</h2>
            <table class="wikitable">
                <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
                <tr>
                    <td><img src="https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/1a/Flashlight.png/revision/latest/scale-to-width-down/64" data-src="https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/1a/Flashlight.png/revision/latest/scale-to-width-down/256" /></td>
                    <td><a href="/wiki/Flashlight" title="Flashlight">Flashlight</a></td>
                    <td>Rare</td>
                    <td>Creates a bright beam of light to blind Killers.</td>
                </tr>
            </table>
        </div>
        """

        wiki_addons_html = """
        <div class="mw-parser-output">
            <h3>Flashlight Add-ons</h3>
            <table class="wikitable">
                <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
                <tr>
                    <td><img src="https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2b/HeavyDutyBattery.png/revision/latest/scale-to-width-down/64" data-src="https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2b/HeavyDutyBattery.png/revision/latest/scale-to-width-down/256" /></td>
                    <td><a href="/wiki/Heavy_Duty_Battery" title="Heavy Duty Battery">Heavy Duty Battery</a></td>
                    <td>Uncommon</td>
                    <td>Increases Flashlight battery capacity by +4 seconds.</td>
                </tr>
            </table>
        </div>
        """

        driver = WikiScraperDriver()
        items = driver.parse_wiki_items(wiki_items_html)
        addons = driver.parse_wiki_addons(wiki_addons_html)

        self.assertEqual(len(items), 1)
        self.assertEqual(len(addons), 1)

        item = items[0]
        self.assertIsInstance(item, ItemData)
        self.assertEqual(item.name, "Flashlight")
        self.assertFalse("/scale-to-width-down/" in item.icon_url)
        self.assertTrue(item.icon_url.endswith("/revision/latest"))

        addon = addons[0]
        self.assertIsInstance(addon, AddonData)
        self.assertEqual(addon.name, "Heavy Duty Battery")
        self.assertEqual(addon.associated_target, "Flashlight")
        self.assertFalse("/scale-to-width-down/" in addon.icon_url)
        self.assertTrue(addon.icon_url.endswith("/revision/latest"))


if __name__ == "__main__":
    unittest.main()
