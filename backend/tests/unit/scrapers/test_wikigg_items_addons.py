# backend/tests/unit/scrapers/test_wikigg_items_addons.py
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
        self.assertEqual(self.by_name["Flashlight"].role, "Survivor")
        self.assertEqual(self.by_name["Flashlight"].category, "Flashlight")
        self.assertEqual(self.by_name["Some Killer Item"].role, "Killer")

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


KILLER_ADDONS_HTML = """
<div class="mw-parser-output">
  <h2>Overview</h2>
  <h3>Numbers</h3>
  <table class="wikitable">
    <tr><th>Rarity</th><th>Count</th></tr>
    <tr><td>Common</td><td>100</td></tr>
  </table>

  <h2>Killer Power Add-ons</h2>
  <h3>Quantum Instantiation</h3>
  <p><i>Quantum Instantiation</i> is the Power of The <a href="/wiki/Singularity">Singularity</a>.</p>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr><td><img src="icon1.png"/></td><td><a href="/wiki/Broken_Security_Key">Broken Security Key</a></td><td>Common</td><td>Desc 1</td></tr>
  </table>

  <p><i>The Redeemer</i> is the Power of The <a href="/wiki/Deathslinger">Deathslinger</a>.</p>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr><td><img src="icon2.png"/></td><td><a href="/wiki/Modified_Ammo_Belt">Modified Ammo Belt</a></td><td>Common</td><td>Desc 2</td></tr>
  </table>

  <h3>Bear Trap</h3>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr><td><img src="icon3.png"/></td><td><a href="/wiki/Bear_Oil">Bear Oil</a></td><td>Common</td><td>Desc 3</td></tr>
  </table>

  <h3>Eyes in the Sky</h3>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr><td><img src="icon4.png"/></td><td><a href="/wiki/Adi_Valente_1">Adi Valente Issue 1</a></td><td>Common</td><td>Desc 4</td></tr>
  </table>
</div>
"""


class TestKillerAddonParsingAndEdgeCases(unittest.TestCase):
    def setUp(self):
        self.driver = WikiGGScraperDriver()
        from app.scrapers.types import CharacterData, KillerPowerData
        self.characters = [
            CharacterData(
                name="The Singularity",
                real_name="HUX-A7-13",
                wiki_slug="The_Singularity",
                short_name="the_singularity",
                category="Killer",
                avatar_url="",
                avatar_local_path="",
                power=KillerPowerData(name="Quantum Instantiation"),
            ),
            CharacterData(
                name="The Deathslinger",
                real_name="Caleb Quinn",
                wiki_slug="The_Deathslinger",
                short_name="the_deathslinger",
                category="Killer",
                avatar_url="",
                avatar_local_path="",
                power=KillerPowerData(name="The Redeemer"),
            ),
            CharacterData(
                name="The Trapper",
                real_name="Evan MacMillan",
                wiki_slug="The_Trapper",
                short_name="the_trapper",
                category="Killer",
                avatar_url="",
                avatar_local_path="",
                power=KillerPowerData(name="Bear Traps"),  # plural
            ),
            CharacterData(
                name="The Skull Merchant",
                real_name="Adriana Imai",
                wiki_slug="The_Skull_Merchant",
                short_name="the_skull_merchant",
                category="Killer",
                avatar_url="",
                avatar_local_path="",
                power=KillerPowerData(name="Eyes in the Sky"),
            ),
            CharacterData(
                name="The Slasher",
                real_name="Jason Voorhees",
                wiki_slug="The_Slasher",
                short_name="the_slasher",
                category="Killer",
                avatar_url="",
                avatar_local_path="",
                power=KillerPowerData(name="Omnipresent Evil"),
            ),
        ]

    def test_paragraph_intro_resolves_missing_heading(self):
        addons = self.driver.parse_wiki_addons(KILLER_ADDONS_HTML, self.characters)
        by_target = {a.name: a.associated_target for a in addons}

        self.assertEqual(by_target.get("Broken Security Key"), "The Singularity")
        self.assertEqual(by_target.get("Modified Ammo Belt"), "The Deathslinger")
        self.assertEqual(by_target.get("Bear Oil"), "The Trapper")
        self.assertEqual(by_target.get("Adi Valente Issue 1"), "The Skull Merchant")

    def test_numbers_overview_table_is_skipped(self):
        addons = self.driver.parse_wiki_addons(KILLER_ADDONS_HTML, self.characters)
        names = [a.name for a in addons]
        self.assertNotIn("Common", names)
        self.assertNotIn("Numbers", [a.associated_target for a in addons])


if __name__ == "__main__":
    unittest.main()
