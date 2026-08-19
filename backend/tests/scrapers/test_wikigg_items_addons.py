# backend/tests/scrapers/test_wikigg_items_addons.py
import unittest
from app.scrapers.wikigg import WikiGGScraperDriver


ITEMS_HTML = """
<div class="mw-parser-output">
  <h2>Survivor Items</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/1/1a/IconItems_flashlight.png"/></td>
      <td><a href="/wiki/Flashlight" title="Flashlight">Flashlight</a></td>
      <td>Common</td>
      <td>Used to blind the Killer.</td>
    </tr>
  </table>
  <h2>Killer Items</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/2/2b/IconItems_addon.png"/></td>
      <td><a href="/wiki/Some_Killer_Item" title="Some Killer Item">Some Killer Item</a></td>
      <td>Rare</td>
      <td>A killer-only item.</td>
    </tr>
  </table>
</div>
"""

ADDONS_HTML = """
<div class="mw-parser-output">
  <h2>Flashlight Add-ons</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/3/3c/IconAddons_battery.png"/></td>
      <td><a href="/wiki/Battery" title="Battery">Battery</a></td>
      <td>Common</td>
      <td>Increases charge time.</td>
    </tr>
  </table>
  <h2>Toolbox Add-ons</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/4/4d/IconAddons_battery2.png"/></td>
      <td><a href="/wiki/Battery" title="Battery">Battery</a></td>
      <td>Common</td>
      <td>Increases repair speed.</td>
    </tr>
  </table>
</div>
"""


class TestParseWikiItems(unittest.TestCase):
    def setUp(self):
        self.driver = WikiGGScraperDriver()
        self.items = self.driver.parse_wiki_items(ITEMS_HTML)
        self.by_name = {i.name: i for i in self.items}

    def test_items_are_parsed(self):
        self.assertEqual(sorted(self.by_name), ["Flashlight", "Some Killer Item"])

    def test_category_follows_the_preceding_header(self):
        self.assertEqual(self.by_name["Flashlight"].category, "Survivor")
        self.assertEqual(self.by_name["Some Killer Item"].category, "Killer")

    def test_rarity_and_description_are_captured(self):
        self.assertEqual(self.by_name["Flashlight"].rarity, "Common")
        self.assertIn("blind", self.by_name["Flashlight"].description.lower())

    def test_icon_local_path_is_sanitized(self):
        self.assertEqual(self.by_name["Flashlight"].icon_local_path, "icons/items/flashlight.png")

    def test_header_rows_are_not_treated_as_items(self):
        self.assertNotIn("Survivor Items", self.by_name)
        self.assertNotIn("Killer Items", self.by_name)


class TestParseWikiAddons(unittest.TestCase):
    def setUp(self):
        self.driver = WikiGGScraperDriver()
        self.addons = self.driver.parse_wiki_addons(ADDONS_HTML)

    def test_addons_sharing_a_name_are_disambiguated_by_target(self):
        names = sorted(a.name for a in self.addons)
        self.assertEqual(names, ["Battery (Flashlight)", "Battery (Toolbox)"])

    def test_associated_target_is_captured(self):
        by_name = {a.name: a for a in self.addons}
        self.assertEqual(by_name["Battery (Flashlight)"].associated_target, "Flashlight")
        self.assertEqual(by_name["Battery (Toolbox)"].associated_target, "Toolbox")

    def test_icon_local_path_is_sanitized(self):
        by_name = {a.name: a for a in self.addons}
        self.assertEqual(by_name["Battery (Flashlight)"].icon_local_path, "icons/addons/battery_(flashlight).png")


if __name__ == "__main__":
    unittest.main()
