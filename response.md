### backend/tests/unit/scrapers/__init__.py
```python
"""
Scraper Unit Tests Package
"""
```

### backend/tests/unit/scrapers/test_character_scraper.py
```python
import gc
import tempfile
import unittest
from pathlib import Path
import pytest

from app.services.db_service import DatabaseService
from app.services.perk_service import CharacterModel
from app.services.scraper_service import ScraperService


@pytest.mark.unit
class TestClassifyPortrait(unittest.TestCase):
    def test_killer_portrait_yields_category_and_number(self):
        self.assertEqual(
            ScraperService.classify_portrait(
                "https://deadbydaylight.wiki.gg/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"
            ),
            ("Killer", 1),
        )

    def test_survivor_portrait_yields_category_and_number(self):
        self.assertEqual(
            ScraperService.classify_portrait(
                "https://deadbydaylight.wiki.gg/images/a/a1/S07_AceVisconti_Portrait.png"
            ),
            ("Survivor", 7),
        )

    def test_double_digit_release_number(self):
        self.assertEqual(
            ScraperService.classify_portrait("https://x/images/c/c9/K23_TheTrickster_Portrait.png"),
            ("Killer", 23),
        )

    def test_power_icon_is_not_a_portrait(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/0/0f/IconPowers_trap.png"))

    def test_item_icon_is_not_a_portrait(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/1/1a/IconItems_flashlight.png"))

    def test_portrait_without_role_prefix_is_rejected(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/2/2b/Entity_Portrait.png"))

    def test_lowercase_prefix_is_rejected(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/2/2b/k01_TheTrapper_Portrait.png"))

    def test_empty_url(self):
        self.assertIsNone(ScraperService.classify_portrait(""))

    def test_portrait_substring_not_at_start_is_rejected(self):
        self.assertIsNone(
            ScraperService.classify_portrait(
                "https://x/images/0/0f/IconPowers_K01_x_Portrait.png"
            )
        )


@pytest.mark.unit
class TestNormaliseCharacterName(unittest.TestCase):
    def test_killer_loses_the_article(self):
        self.assertEqual(ScraperService.normalise_character_name("The Trapper", "Killer"), "Trapper")

    def test_killer_with_multiword_title(self):
        self.assertEqual(ScraperService.normalise_character_name("The Ghost Face", "Killer"), "Ghost Face")

    def test_killer_without_article_is_untouched(self):
        self.assertEqual(ScraperService.normalise_character_name("Xenomorph", "Killer"), "Xenomorph")

    def test_only_the_leading_article_is_stripped(self):
        self.assertEqual(ScraperService.normalise_character_name("The Unknown", "Killer"), "Unknown")

    def test_survivor_name_is_never_stripped(self):
        self.assertEqual(ScraperService.normalise_character_name("The Man", "Survivor"), "The Man")

    def test_whitespace_is_trimmed(self):
        self.assertEqual(ScraperService.normalise_character_name("  The Nurse  ", "Killer"), "Nurse")


KILLER_PAGE_HTML = """
<div class="mw-parser-output">
  <a href="/wiki/The_Trapper" title="The Trapper">
    <img src="https://deadbydaylight.wiki.gg/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"/>
  </a>
  <a href="/wiki/The_Wraith" title="The Wraith">
    <img src="https://deadbydaylight.wiki.gg/images/9/92/K02_TheWraith_Portrait.png"/>
  </a>
  <a href="/wiki/Bear_Traps" title="Bear Traps">
    <img src="https://deadbydaylight.wiki.gg/images/0/0f/IconPowers_trap.png"/>
  </a>
  <a href="/wiki/Ace_Visconti" title="Ace Visconti">
    <img src="https://deadbydaylight.wiki.gg/images/a/a1/S07_AceVisconti_Portrait.png"/>
  </a>
  <a href="/wiki/Entity" title="Entity">
    <img src="https://deadbydaylight.wiki.gg/images/2/2b/Entity_Portrait.png"/>
  </a>
  <a href="/wiki/Generator" title="Generator">no image here</a>
</div>
"""


@pytest.mark.unit
class TestParseCharacterPage(unittest.TestCase):
    def setUp(self):
        self.service = ScraperService()
        self.characters = self.service.parse_character_page(KILLER_PAGE_HTML)
        self.by_name = {c.name: c for c in self.characters}

    def test_only_portraits_become_characters(self):
        self.assertEqual(sorted(self.by_name), ["Ace Visconti", "The Trapper", "The Wraith"])

    def test_power_link_is_dropped(self):
        self.assertNotIn("Bear Traps", self.by_name)

    def test_concept_portrait_without_role_prefix_is_dropped(self):
        self.assertNotIn("Entity", self.by_name)

    def test_killer_category_comes_from_the_filename_not_the_page(self):
        self.assertEqual(self.by_name["The Trapper"].category, "Killer")

    def test_survivor_on_the_killer_page_is_still_a_survivor(self):
        self.assertEqual(self.by_name["Ace Visconti"].category, "Survivor")

    def test_release_number_is_captured(self):
        self.assertEqual(self.by_name["The Trapper"].release_number, 1)
        self.assertEqual(self.by_name["The Wraith"].release_number, 2)
        self.assertEqual(self.by_name["Ace Visconti"].release_number, 7)

    def test_avatar_path_follows_the_category(self):
        self.assertEqual(self.by_name["The Trapper"].avatar_local_path, "avatars/killers/the_trapper.png")
        self.assertEqual(self.by_name["Ace Visconti"].avatar_local_path, "avatars/survivors/ace_visconti.png")

    def test_avatar_url_is_the_portrait(self):
        self.assertIn("K01_TheTrapper_Portrait", self.by_name["The Trapper"].avatar_url)

    def test_duplicate_links_produce_one_character(self):
        doubled = self.service.parse_character_page(KILLER_PAGE_HTML + KILLER_PAGE_HTML)
        self.assertEqual(len([c for c in doubled if c.name == "The Trapper"]), 1)

    def test_page_without_portraits_yields_nothing(self):
        html = '<div class="mw-parser-output"><a href="/wiki/Hatch" title="Hatch">' \
               '<img src="https://x/images/1/1a/IconHelp_hatch.png"/></a></div>'
        self.assertEqual(self.service.parse_character_page(html), [])


@pytest.mark.unit
class TestCharacterModelCarriesReleaseNumber(unittest.TestCase):
    def test_model_accepts_and_returns_release_number(self):
        model = CharacterModel(
            name="Trapper",
            real_name="The Trapper",
            category="Killer",
            avatar_local_path="avatars/killers/trapper.png",
            release_number=1,
        )
        self.assertEqual(model.model_dump()["release_number"], 1)

    def test_release_number_defaults_when_absent(self):
        model = CharacterModel(name="Meg Thomas", real_name="Meg Thomas", category="Survivor")
        self.assertIsNone(model.model_dump()["release_number"])


PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Killer Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/f/f1/IconPerks_agitation.png"/></td>
      <td><a href="/wiki/Agitation" title="Agitation">Agitation</a></td>
      <td>You get excited.</td>
      <td><a href="/wiki/The_Trapper" title="The Trapper">The Trapper</a></td>
    </tr>
  </table>
</div>
"""

SURVIVOR_PAGE_HTML = """
<div class="mw-parser-output">
  <a href="/wiki/The_Troupe" title="The Troupe">
    <img src="https://deadbydaylight.wiki.gg/images/e/e0/S42_TheTroupe_Portrait.png/revision/latest"/>
  </a>
</div>
"""

TROUPE_PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Survivor Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/a/a2/IconPerks_bardic.png"/></td>
      <td><a href="/wiki/Bardic_Inspiration" title="Bardic Inspiration">Bardic Inspiration</a></td>
      <td>You sing.</td>
      <td><a href="/wiki/Troupe" title="Troupe">Aestri</a></td>
    </tr>
  </table>
</div>
"""


@pytest.mark.unit
class TestPerkOwnerMatching(unittest.TestCase):
    def test_survivor_stored_with_an_article_matches_a_link_without_one(self):
        service = ScraperService()
        characters = service.parse_character_page(SURVIVOR_PAGE_HTML)
        perks = service.parse_perks(TROUPE_PERKS_HTML, characters)

        bardic = next(p for p in perks if p.name == "Bardic Inspiration")
        self.assertEqual(bardic.character, "The Troupe")
        self.assertEqual(bardic.character_avatar_path, "avatars/survivors/the_troupe.png")

    def test_perk_matches_a_killer_by_name(self):
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        perks = service.parse_perks(PERKS_HTML, characters)

        agitation = next(p for p in perks if p.name == "Agitation")
        self.assertEqual(agitation.character, "The Trapper")
        self.assertEqual(agitation.character_avatar_path, "avatars/killers/the_trapper.png")

    def test_perk_with_no_owner_column_falls_back_to_general(self):
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        html = """
        <div class="mw-parser-output">
          <h2>Killer Perks</h2>
          <table class="wikitable">
            <tr><th>Icon</th><th>Name</th><th>Description</th></tr>
            <tr>
              <td><img src="https://x/images/f/f1/IconPerks_ig.png"/></td>
              <td><a href="/wiki/Iron_Grasp" title="Iron Grasp">Iron Grasp</a></td>
              <td>They wiggle 4% slower.</td>
            </tr>
          </table>
        </div>
        """
        perks = service.parse_perks(html, characters)
        iron_grasp = next(p for p in perks if p.name == "Iron Grasp")
        self.assertEqual(iron_grasp.character, "General")


@pytest.mark.unit
class TestPruneStaleCharacterRows(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_prune_stale.db")
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        conn = self.db_service.get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO gauntlet_runs (role, current_character_id, current_streak) VALUES (?, ?, ?);",
            ("killer", "Blood Bond", 3),
        )
        blood_bond_run_id = cur.lastrowid
        cur.execute(
            "INSERT INTO gauntlet_runs (role, current_character_id, current_streak) VALUES (?, ?, ?);",
            ("killer", "Trapper", 1),
        )
        cur.execute(
            "INSERT INTO page_streak_runs (killer, pages_json) VALUES (?, ?);",
            ("The Clown", "[]"),
        )
        clown_run_id = cur.lastrowid
        cur.execute(
            "INSERT INTO gauntlet_match_logs (run_id, role, character_id, result, perks_json, "
            "streak_before, streak_after) VALUES (?, ?, ?, ?, ?, ?, ?);",
            (blood_bond_run_id, "killer", "Blood Bond", "win", "[]", 2, 3),
        )
        cur.execute(
            "INSERT INTO page_streak_page_logs (run_id, attempt, page_number, perks_json, result) "
            "VALUES (?, ?, ?, ?, ?);",
            (clown_run_id, 1, 1, "[]", "win"),
        )
        conn.commit()
        conn.close()

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def _count(self, table):
        conn = self.db_service.get_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) AS n FROM {table};")
        n = cur.fetchone()["n"]
        conn.close()
        return n

    def test_rows_with_unknown_characters_are_deleted(self):
        deleted = self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        self.assertEqual(deleted["gauntlet_runs"], 1)
        self.assertEqual(self._count("gauntlet_runs"), 1)

    def test_rows_with_known_characters_survive(self):
        self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        conn = self.db_service.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT current_character_id FROM gauntlet_runs;")
        remaining = [row["current_character_id"] for row in cur.fetchall()]
        conn.close()
        self.assertEqual(remaining, ["Trapper"])

    def test_page_streak_rows_are_pruned_too(self):
        deleted = self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        self.assertEqual(deleted["page_streak_runs"], 1)
        self.assertEqual(self._count("page_streak_runs"), 0)

    def test_an_empty_valid_set_is_ignored(self):
        deleted = self.db_service.prune_stale_character_rows(set())
        self.assertEqual(deleted, {})
        self.assertEqual(self._count("gauntlet_runs"), 2)

    def test_child_rows_are_cascaded_with_their_parent(self):
        self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        self.assertEqual(self._count("gauntlet_match_logs"), 0)
        self.assertEqual(self._count("page_streak_page_logs"), 0)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/scrapers/test_modular_drivers.py
```python
from unittest.mock import MagicMock
import pytest

from app.scrapers.drivers import (
    BaseWikiDriver,
    WikiGGDriverDE,
    WikiGGDriverEN,
    WikiGGDriverES,
    WikiGGDriverFR,
    WikiGGDriverIT,
    WikiGGDriverJP,
    WikiGGDriverPL,
    WikiGGScraperDriver,
    LANGUAGE_DRIVERS,
)
from app.scrapers.types import AddonData, CharacterData, ItemData, PerkData


@pytest.mark.unit
def test_language_drivers_registry():
    assert "en" in LANGUAGE_DRIVERS
    assert "pl" in LANGUAGE_DRIVERS
    assert "de" in LANGUAGE_DRIVERS
    assert "es" in LANGUAGE_DRIVERS
    assert "ja" in LANGUAGE_DRIVERS
    assert "jp" in LANGUAGE_DRIVERS
    assert "fr" in LANGUAGE_DRIVERS
    assert "it" in LANGUAGE_DRIVERS
    assert LANGUAGE_DRIVERS["en"] is WikiGGDriverEN
    assert LANGUAGE_DRIVERS["pl"] is WikiGGDriverPL
    assert LANGUAGE_DRIVERS["de"] is WikiGGDriverDE
    assert LANGUAGE_DRIVERS["es"] is WikiGGDriverES
    assert LANGUAGE_DRIVERS["jp"] is WikiGGDriverJP


@pytest.mark.unit
def test_base_driver_api_urls():
    en = BaseWikiDriver(lang_code="en")
    assert en.api_url == "https://deadbydaylight.wiki.gg/api.php"
    pl = BaseWikiDriver(lang_code="pl")
    assert pl.api_url == "https://deadbydaylight.wiki.gg/pl/api.php"
    de = BaseWikiDriver(lang_code="de")
    assert de.api_url == "https://deadbydaylight.wiki.gg/de/api.php"
    es = BaseWikiDriver(lang_code="es")
    assert es.api_url == "https://deadbydaylight.wiki.gg/es/api.php"


@pytest.mark.unit
def test_wiki_gg_driver_pl_enrichment():
    driver = WikiGGDriverPL()
    chars = [
        CharacterData(
            name="The Trapper",
            real_name="Evan MacMillan",
            wiki_slug="The_Trapper",
            short_name="the_trapper",
            category="Killer",
            avatar_url="",
            avatar_local_path="",
            code_prefix="K",
            release_number=1,
        )
    ]
    perks = [
        PerkData(
            name="Sprint Burst",
            character="Meg Thomas",
            character_real_name="Meg Thomas",
            character_avatar_path="",
            category="Survivor",
            description="Sprint fast.",
            icon_url="https://deadbydaylight.wiki.gg/images/IconPerks_sprintBurst.png",
            icon_local_path="icons/perks/sprint_burst.png",
        )
    ]
    items = [
        ItemData(
            name="Med-Kit",
            category="Survivor",
            role="Survivor",
            description="Heals you.",
            icon_url="https://deadbydaylight.wiki.gg/images/IconItems_medkit.png",
            icon_local_path="icons/items/medkit.png",
            rarity="Common",
        )
    ]
    addons = [
        AddonData(
            name="Padded Jaws",
            associated_target="The Trapper",
            category="Killer",
            description="Padded.",
            icon_url="https://deadbydaylight.wiki.gg/images/IconAddon_paddedJaws.png",
            icon_local_path="icons/addons/padded_jaws.png",
            rarity="Common",
        )
    ]

    mock_perk_html = """
    <table>
        <tr>
            <th><img src="/images/IconPerks_sprintBurst.png" /></th>
            <th><a href="/pl/wiki/Sprint">Sprint</a></th>
            <td>Nabierasz sil po ucieczce.</td>
        </tr>
    </table>
    """
    mock_char_html = """
    <table>
        <tr>
            <td><img src="/images/K01_Portrait.png" /></td>
            <td>Evan MacMillan - Traper</td>
        </tr>
    </table>
    """

    def mock_fetch(page):
        if page == "Umiejętności":
            return mock_perk_html
        if page == "Zabójcy":
            return mock_char_html
        return ""

    driver.fetch_page_html = MagicMock(side_effect=mock_fetch)
    driver.enrich_translations(chars, perks, items, addons)

    assert "pl" in perks[0].translations
    assert perks[0].translations["pl"]["name"] == "Sprint"
    assert "Nabierasz sil" in perks[0].translations["pl"]["description"]
    assert "pl" in chars[0].translations
    assert chars[0].translations["pl"]["name"] == "Traper"


@pytest.mark.unit
def test_wiki_gg_driver_de_enrichment():
    driver = WikiGGDriverDE()
    perks = [
        PerkData(
            name="Hardened",
            character="Lara Croft",
            character_real_name="Lara Croft",
            character_avatar_path="",
            category="Survivor",
            description="Hardened.",
            icon_url="https://deadbydaylight.wiki.gg/images/IconPerks_hardened.png",
            icon_local_path="icons/perks/hardened.png",
        )
    ]
    chars = []
    items = []
    addons = []

    mock_talente_html = """
    <table>
        <tr>
            <th><img src="/images/128px-abgehaertet.png" /></th>
            <th><a href="/de/wiki/Abgehaertet">Abgehärtet</a><br/><small>Hardened</small></th>
            <td>Nachdem du ein Totem zerstoert hast.</td>
        </tr>
    </table>
    """
    driver.fetch_page_html = MagicMock(return_value=mock_talente_html)
    driver.enrich_translations(chars, perks, items, addons)

    assert "de" in perks[0].translations
    assert perks[0].translations["de"]["name"] == "Abgehärtet"
    assert "Nachdem du ein Totem" in perks[0].translations["de"]["description"]


@pytest.mark.unit
def test_wiki_gg_scraper_orchestrator_selective():
    orchestrator = WikiGGScraperDriver()
    orchestrator.scrape_characters_dynamically = MagicMock(return_value=[])
    orchestrator.fetch_page_html = MagicMock(return_value="")
    orchestrator.parse_perks = MagicMock(return_value=[])
    orchestrator.parse_wiki_items = MagicMock(return_value=[])
    orchestrator.parse_wiki_addons = MagicMock(return_value=[])
    orchestrator.scrape_offerings = MagicMock(return_value=[])
    orchestrator.scrape_translations = MagicMock()

    orchestrator.scrape_all(languages=["pl", "de"])
    orchestrator.scrape_translations.assert_called_once_with([], [], [], [], languages=["pl", "de"])
```

### backend/tests/unit/scrapers/test_roster_image_scraper.py
```python
import pytest
from app.scrapers.roster_images import RosterImageScraperDriver
from app.services.scraper_service import ScraperService


@pytest.mark.unit
def test_roster_image_scraper_driver_init():
    driver = RosterImageScraperDriver(timeout=15)
    assert driver.timeout == 15
    assert "User-Agent" in driver.session.headers


@pytest.mark.unit
def test_roster_image_scraper_scrape_portraits_mocked():
    driver = RosterImageScraperDriver()
    results = driver.scrape_roster_portraits("hooked_on_you")

    assert len(results) > 0
    names = [r["character_name"] for r in results]
    assert any("Huntress" in name for name in names)
    assert any("Trapper" in name for name in names)
    for r in results:
        assert r["edition"] == "hooked_on_you"
        assert r["relative_path"].startswith("avatars/")
        assert r["image_url"].startswith("http")


@pytest.mark.unit
def test_scraper_service_roster_integration(tmp_path):
    service = ScraperService(base_dir=tmp_path)
    assert hasattr(service, "scrape_roster_edition_images")
    assert hasattr(service, "sync_roster_edition_assets")
    assert service.roster_driver is not None
```

### backend/tests/unit/scrapers/test_scraper_config.py
```python
import json
import tempfile
import unittest
from pathlib import Path
import pytest

from app.services.scraper_service import ScraperConfig, ScraperService


@pytest.mark.unit
class TestScraperConfig(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)
        self.service = ScraperService(base_dir=self.base_dir)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_scraper_config_defaults(self):
        config = ScraperConfig()
        self.assertEqual(config.source, "wikigg")
        self.assertFalse(config.fallback_to_wiki)
        self.assertEqual(config.last_used_source, "wikigg")
        self.assertIsNone(config.last_run_timestamp)

    def test_load_config_returns_defaults_when_file_missing(self):
        config = self.service.load_config()
        self.assertIsInstance(config, ScraperConfig)
        self.assertEqual(config.source, "wikigg")
        self.assertFalse(config.fallback_to_wiki)
        self.assertEqual(config.last_used_source, "wikigg")
        self.assertIsNone(config.last_run_timestamp)

    def test_save_and_load_config_with_dict(self):
        updated = self.service.save_config({
            "source": "wiki",
            "fallback_to_wiki": False,
            "last_used_source": "wiki",
            "last_run_timestamp": "2026-08-10T12:00:00Z"
        })
        self.assertIsInstance(updated, ScraperConfig)
        self.assertEqual(updated.source, "wiki")
        self.assertFalse(updated.fallback_to_wiki)

        loaded = self.service.load_config()
        self.assertEqual(loaded.source, "wiki")
        self.assertFalse(loaded.fallback_to_wiki)
        self.assertEqual(loaded.last_used_source, "wiki")
        self.assertEqual(loaded.last_run_timestamp, "2026-08-10T12:00:00Z")

        config_path = self.base_dir / "data" / "scraper_config.json"
        self.assertTrue(config_path.exists())
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["source"], "wiki")

    def test_save_and_load_config_with_dataclass(self):
        config_obj = ScraperConfig(
            source="custom",
            fallback_to_wiki=False,
            last_used_source="custom",
            last_run_timestamp="2026-01-01T00:00:00Z"
        )
        saved = self.service.save_config(config_obj)
        self.assertEqual(saved.source, "custom")

        loaded = self.service.load_config()
        self.assertEqual(loaded.source, "custom")
        self.assertFalse(loaded.fallback_to_wiki)
        self.assertEqual(loaded.last_used_source, "custom")
        self.assertEqual(loaded.last_run_timestamp, "2026-01-01T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/scrapers/test_wikigg_items_addons.py
```python
import unittest
import pytest
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


@pytest.mark.unit
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


@pytest.mark.unit
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


@pytest.mark.unit
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
                power=KillerPowerData(name="Bear Traps"),
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
```

### backend/tests/unit/scrapers/test_wikigg_translations.py
```python
import unittest
from unittest.mock import MagicMock
import pytest
from app.scrapers.wikigg import WikiGGScraperDriver
from app.scrapers.types import CharacterData, PerkData, ItemData, AddonData, KillerPowerData


@pytest.mark.unit
class TestWikiGGTranslations(unittest.TestCase):
    def setUp(self):
        self.driver = WikiGGScraperDriver()

    def test_translation_enrichment_mock(self):
        characters = [
            CharacterData(
                name="The Trapper",
                real_name="Evan MacMillan",
                wiki_slug="The_Trapper",
                short_name="the_trapper",
                category="Killer",
                avatar_url="https://deadbydaylight.wiki.gg/images/K01_charSelect_portrait.png",
                avatar_local_path="portraits/the_trapper.png",
                release_number=1,
                code_prefix="K",
                power=KillerPowerData(name="Bear Trap", description="Trap Survivors."),
            )
        ]
        perks = [
            PerkData(
                name="Decisive Strike",
                character="Laurie Strode",
                character_real_name="Laurie Strode",
                character_avatar_path="",
                category="Survivor",
                description="Stab the killer when grabbed.",
                icon_url="https://deadbydaylight.wiki.gg/images/IconPerks_decisiveStrike.png",
                icon_local_path="icons/perks/decisive_strike.png",
            )
        ]
        items = [
            ItemData(
                name="Flashlight",
                category="Flashlight",
                role="Survivor",
                description="Blinds killers.",
                icon_url="https://deadbydaylight.wiki.gg/images/IconItems_flashlight.png",
                icon_local_path="icons/items/flashlight.png",
                rarity="Common",
            )
        ]
        addons = [
            AddonData(
                name="Battery",
                associated_target="Flashlight",
                category="Survivor",
                description="Extends battery life.",
                icon_url="https://deadbydaylight.wiki.gg/images/IconAddons_battery.png",
                icon_local_path="icons/addons/battery.png",
                rarity="Common",
            )
        ]

        pl_perks_html = """
        <table class="wikitable">
          <tr><th>Icon</th><th>Name</th><th>Description</th></tr>
          <tr>
            <td><img src="https://deadbydaylight.wiki.gg/images/thumb/IconPerks_decisiveStrike.png/32px-IconPerks_decisiveStrike.png"/></td>
            <td><a href="/pl/wiki/Zdecydowany_Cios">Zdecydowany Cios</a></td>
            <td>Ugodź zabójcę po pochwyceniu.</td>
          </tr>
        </table>
        """

        pl_killers_html = """
        <table>
          <tr>
            <td><img src="https://deadbydaylight.wiki.gg/images/thumb/K01_charSelect_portrait.png/32px-K01_charSelect_portrait.png"/> Evan MacMillan - Traper</td>
          </tr>
        </table>
        """

        pl_items_html = """
        <table class="wikitable">
          <tr><th>Icon</th><th>Name</th><th>Description</th></tr>
          <tr>
            <td><img src="https://deadbydaylight.wiki.gg/images/IconItems_flashlight.png"/></td>
            <td><a href="/pl/wiki/Latarka">Latarka</a></td>
            <td>Oślepia zabójców.</td>
          </tr>
        </table>
        """

        pl_addons_html = """
        <table class="wikitable">
          <tr><th>Icon</th><th>Name</th><th>Description</th></tr>
          <tr>
            <td><img src="https://deadbydaylight.wiki.gg/images/IconAddons_battery.png"/></td>
            <td><a href="/pl/wiki/Bateria">Bateria</a></td>
            <td>Wydłuża czas działania baterii.</td>
          </tr>
        </table>
        """

        def mock_fetch_lang(lang, page):
            if lang == "pl":
                if "Umiej" in page:
                    return pl_perks_html
                elif "Zab" in page:
                    return pl_killers_html
                elif "Przedmioty" in page:
                    return pl_items_html
                elif "Dodatki" in page:
                    return pl_addons_html
            return ""

        self.driver.fetch_lang_page_html = MagicMock(side_effect=mock_fetch_lang)
        self.driver.scrape_translations(characters, perks, items, addons)

        assert "en" in perks[0].translations
        assert perks[0].translations["en"]["name"] == "Decisive Strike"
        assert characters[0].translations["en"]["name"] == "The Trapper"
        assert characters[0].translations["en"]["power_name"] == "Bear Trap"

        assert "pl" in perks[0].translations
        assert perks[0].translations["pl"]["name"] == "Zdecydowany Cios"
        assert perks[0].translations["pl"]["description"] == "Ugodź zabójcę po pochwyceniu."

        assert "pl" in characters[0].translations
        assert characters[0].translations["pl"]["name"] == "Traper"

        assert "pl" in items[0].translations
        assert items[0].translations["pl"]["name"] == "Latarka"

        assert "pl" in addons[0].translations
        assert addons[0].translations["pl"]["name"] == "Bateria"


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/__init__.py
```python
"""
API Route Unit Tests Package
"""
```

### backend/tests/unit/api/test_chaos_routes.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


@pytest.mark.unit
class TestChaosRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        user, err = self.user_service.register_user("routeuser", "route@test.com", "password123")
        self.assertIsNone(err)
        self.user_id = user.id
        self.token = self.user_service.authenticate("routeuser", "password123")[1]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=hell")
        self.assertEqual(resp.status_code, 401)

    def test_get_run_auto_creates(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        run = resp.get_json()["run"]
        self.assertEqual(run["difficulty"], "hell")
        self.assertEqual(len(run["current_perks"]), 4)
        self.assertEqual(run["checkpoint_interval"], 0)

    def test_run_requires_valid_difficulty(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=nonsense", headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    def test_reveal_endpoint(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/reveal", json={"run_id": run["id"]}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()["run"]["perks_revealed"])

    def test_result_lifecycle(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertIn("The Trapper", body["run"]["completed_killers"])
        self.assertEqual(body["run"]["current_streak"], 1)

    def test_result_requires_killer_id(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_reset_endpoint(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        resp = self.client.post(
            "/api/v1/chaos-streak/run/reset", json={"difficulty": "hell"}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["run"]["current_streak"], 0)

    def test_stats_endpoint(self):
        resp = self.client.get("/api/v1/chaos-streak/stats?difficulty=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["stats"]["total_matches"], 0)

    def test_runs_are_isolated_per_difficulty(self):
        hell_run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        easy_run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=easy", headers=self.headers
        ).get_json()["run"]
        self.assertNotEqual(hell_run["id"], easy_run["id"])


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_character_detail_route.py
```python
import unittest
import pytest
from app import create_app


@pytest.mark.unit
class TestCharacterDetailRoute(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        with self.app.app_context():
            from app.core.extensions import db
            from app.models import Character, Perk
            from sqlalchemy import select
            db.create_all()
            existing = db.session.scalars(select(Character).where(Character.name == "Meg Thomas")).first()
            if not existing:
                c = Character(name="Meg Thomas", role="Survivor", release_number=2)
                db.session.add(c)
                db.session.flush()
            else:
                c = existing
            perk = db.session.scalars(select(Perk).where(Perk.name == "Sprint Burst")).first()
            if not perk:
                db.session.add(Perk(name="Sprint Burst", character_id=c.id, description="Run fast", icon_url="url", icon_local_path="path"))
            else:
                perk.character_id = c.id
            db.session.commit()

    def test_character_detail(self):
        response = self.client.get("/api/v1/characters/Meg%20Thomas/detail")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("data", data)
        detail = data["data"]
        self.assertIn("character", detail)
        self.assertIn("perks", detail)
        self.assertIn("addons", detail)
        self.assertEqual(detail["character"]["name"], "Meg Thomas")
        self.assertIsInstance(detail["perks"], list)
        self.assertTrue(len(detail["perks"]) > 0)
        for perk in detail["perks"]:
            self.assertIn("name", perk)
            self.assertIn("description", perk)
            self.assertIn("icon_url", perk)
            self.assertIn("icon_local_path", perk)

    def test_character_detail_not_found(self):
        response = self.client.get("/api/v1/characters/NonExistentCharacter12345/detail")
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertIn("error", data)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_character_slug_routes.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig


@pytest.mark.unit
class TestCharacterSlugRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        with self.app.app_context():
            from app.core.extensions import db
            from app.models import Character, Perk
            from sqlalchemy import select
            db.create_all()
            
            meg = db.session.scalars(select(Character).where(Character.name == "Meg Thomas")).first()
            if not meg:
                meg = Character(name="Meg Thomas", role="Survivor", release_number=2)
                db.session.add(meg)
                db.session.flush()
                db.session.add(Perk(name="Sprint Burst", character_id=meg.id, description="Run fast", icon_url="url", icon_local_path="path"))
            
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            if not trapper:
                trapper = Character(name="The Trapper", role="Killer", release_number=1, real_name="Evan MacMillan")
                db.session.add(trapper)
                db.session.flush()
                db.session.add(Perk(name="Agitation", character_id=trapper.id, description="Carry fast", icon_url="url", icon_local_path="path"))
            else:
                trapper.real_name = "Evan MacMillan"

            nemesis = db.session.scalars(select(Character).where(Character.name == "The Nemesis")).first()
            if not nemesis:
                nemesis = Character(
                    name="The Nemesis",
                    role="Killer",
                    release_number=24,
                    real_name="Nemesis-T Type",
                    wiki_slug="The_Nemesis",
                    short_name="the_nemesis",
                    chapter_name="Chapter 20: Resident Evil",
                    chapter_number="20",
                    dlc_type="licensed_chapter",
                    is_licensed=True,
                    release_year=2021,
                    dlc_counterparts="Leon S. Kennedy, Jill Valentine",
                    lore="The Nemesis-T Type was an experimental Bio-Organic Weapon...",
                )
                db.session.add(nemesis)
            else:
                nemesis.chapter_name = "Chapter 20: Resident Evil"
                nemesis.chapter_number = "20"
                nemesis.dlc_type = "licensed_chapter"
                nemesis.is_licensed = True
                nemesis.release_year = 2021
                nemesis.dlc_counterparts = "Leon S. Kennedy, Jill Valentine"
                if not nemesis.lore:
                    nemesis.lore = "The Nemesis-T Type was an experimental Bio-Organic Weapon..."

            db.session.commit()

    def test_lookup_by_exact_name(self):
        res = self.client.get("/api/v1/characters/Meg%20Thomas/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "Meg Thomas")

    def test_lookup_by_underscore_slug(self):
        res = self.client.get("/api/v1/characters/meg_thomas/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "Meg Thomas")

    def test_lookup_by_hyphen_slug(self):
        res = self.client.get("/api/v1/characters/the-trapper/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "The Trapper")

    def test_lookup_by_real_name(self):
        res = self.client.get("/api/v1/characters/evan_macmillan/detail")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["data"]["character"]["name"], "The Trapper")

    def test_character_database_dlc_fields(self):
        with self.app.app_context():
            from app.services.scraper_service import ScraperService
            ScraperService().seed_canonical_characters()
            
        res = self.client.get("/api/v1/characters/the_nemesis/detail")
        self.assertEqual(res.status_code, 200)
        char = res.get_json()["data"]["character"]
        self.assertEqual(char["name"], "The Nemesis")
        self.assertEqual(char["chapter_name"], "Chapter 20: Resident Evil")
        self.assertEqual(char["chapter_number"], "20")
        self.assertEqual(char["dlc_type"], "licensed_chapter")
        self.assertTrue(char["is_licensed"])
        self.assertEqual(char["release_year"], 2021)
        self.assertIn("Leon S. Kennedy", char["dlc_counterparts"])
        self.assertTrue(len(char["lore"]) > 0)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_db_export_import.py
```python
import io
import json
import pytest
from sqlalchemy import select
from app import create_app
from app.core.extensions import db
from app.core.security import generate_token
from app.models.character import Character
from app.models.perk import Perk
from app.models.user import User


@pytest.fixture
def app():
    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with test_app.app_context():
        db.create_all()
        admin_user = db.session.scalars(select(User).where(User.username == "admin_test")).first()
        if not admin_user:
            admin_user = User(
                username="admin_test",
                email="admin@test.com",
                password_hash="hash",
                role="admin",
            )
            db.session.add(admin_user)

        reg_user = db.session.scalars(select(User).where(User.username == "player_test")).first()
        if not reg_user:
            reg_user = User(
                username="player_test",
                email="player@test.com",
                password_hash="hash",
                role="user",
            )
            db.session.add(reg_user)

        char = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
        if not char:
            char = Character(name="The Trapper", role="Killer", short_name="Trapper")
            db.session.add(char)

        perk = db.session.scalars(select(Perk).where(Perk.name == "Brutal Strength")).first()
        if not perk:
            perk = Perk(name="Brutal Strength", category="Killer")
            db.session.add(perk)

        db.session.commit()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def admin_token(app):
    with app.app_context():
        user = db.session.scalars(select(User).where(User.username == "admin_test")).first()
        return generate_token(user.id, role=user.role)


@pytest.fixture
def user_token(app):
    with app.app_context():
        user = db.session.scalars(select(User).where(User.username == "player_test")).first()
        return generate_token(user.id, role=user.role)


@pytest.mark.unit
def test_export_database_all(client, admin_token):
    res = client.get(
        "/api/v1/admin/database/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["version"] == "1.0"
    assert "data" in data
    assert "characters" in data["data"]
    assert "perks" in data["data"]
    assert len(data["data"]["characters"]) >= 1
    assert any(c["name"] == "The Trapper" for c in data["data"]["characters"])


@pytest.mark.unit
def test_export_database_selective(client, admin_token):
    res = client.get(
        "/api/v1/admin/database/export?targets=perks",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "perks" in data["data"]
    assert "characters" not in data["data"]


@pytest.mark.unit
def test_export_database_download_header(client, admin_token):
    res = client.get(
        "/api/v1/admin/database/export?download=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert "attachment; filename=lemondbd_export_" in res.headers.get("Content-Disposition", "")


@pytest.mark.unit
def test_export_database_unauthorized(client, user_token):
    res = client.get(
        "/api/v1/admin/database/export",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert res.status_code == 403

    res_no_auth = client.get("/api/v1/admin/database/export")
    assert res_no_auth.status_code == 401


@pytest.mark.unit
def test_import_database_merge_json_body(client, admin_token):
    payload = {
        "version": "1.0",
        "data": {
            "characters": [
                {
                    "name": "The Wraith",
                    "role": "Killer",
                    "real_name": "Philip Ojomo",
                    "translations": {"pl": {"name": "Upiór"}},
                }
            ],
            "perks": [
                {
                    "name": "Shadowborn",
                    "category": "Killer",
                    "character_name": "The Wraith",
                    "description": "Increases FOV.",
                }
            ],
        },
    }

    res = client.post(
        "/api/v1/admin/database/import",
        headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
        json={"mode": "merge", "data": payload["data"]},
    )
    assert res.status_code == 200
    res_data = res.get_json()
    assert res_data["status"] == "success"
    assert res_data["summary"]["characters"]["created"] == 1
    assert res_data["summary"]["perks"]["created"] == 1

    char = db.session.scalars(select(Character).where(Character.name == "The Wraith")).first()
    assert char is not None
    assert char.real_name == "Philip Ojomo"
    assert char.translations == {"pl": {"name": "Upiór"}}

    perk = db.session.scalars(select(Perk).where(Perk.name == "Shadowborn")).first()
    assert perk is not None
    assert perk.character_id == char.id


@pytest.mark.unit
def test_import_database_multipart_file(client, admin_token):
    backup = {
        "version": "1.0",
        "data": {
            "characters": [
                {"name": "Dwight Fairfield", "role": "Survivor", "short_name": "Dwight"}
            ],
            "items": [
                {"name": "Med-Kit", "category": "Medical", "role": "Survivor"}
            ],
        },
    }
    file_bytes = io.BytesIO(json.dumps(backup).encode("utf-8"))

    res = client.post(
        "/api/v1/admin/database/import",
        headers={"Authorization": f"Bearer {admin_token}"},
        data={"file": (file_bytes, "backup.json"), "mode": "merge"},
        content_type="multipart/form-data",
    )
    assert res.status_code == 200
    res_data = res.get_json()
    assert res_data["status"] == "success"
    assert res_data["summary"]["characters"]["created"] == 1
    assert res_data["summary"]["items"]["created"] == 1


@pytest.mark.unit
def test_import_database_replace_mode(client, admin_token):
    assert db.session.scalars(select(Character).where(Character.name == "The Trapper")).first() is not None

    payload = {
        "characters": [
            {"name": "The Nurse", "role": "Killer", "short_name": "Nurse"}
        ]
    }

    res = client.post(
        "/api/v1/admin/database/import",
        headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
        json={"mode": "replace", "targets": ["characters"], "data": payload},
    )
    assert res.status_code == 200

    assert db.session.scalars(select(Character).where(Character.name == "The Trapper")).first() is None
    assert db.session.scalars(select(Character).where(Character.name == "The Nurse")).first() is not None


@pytest.mark.unit
def test_import_database_invalid_payload(client, admin_token):
    res = client.post(
        "/api/v1/admin/database/import",
        headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
        data="not json",
    )
    assert res.status_code == 400
```

### backend/tests/unit/api/test_fullscreen_maps_routes.py
```python
import unittest
import pytest
from app import create_app


@pytest.mark.unit
class TestFullscreenMapsRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_get_map_detail_with_seed_and_floor_params(self):
        response = self.client.get("/api/v1/maps/coal_tower?seed=seed_b&floor=2")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("map", data)
        map_detail = data["map"]
        self.assertIn("tiles", map_detail)
        self.assertIn("objectives", map_detail)
        self.assertEqual(map_detail.get("seed_variant"), "seed_b")
        self.assertEqual(map_detail.get("floor"), 2)

    def test_get_map_detail_default_seed_a_floor_1(self):
        response = self.client.get("/api/v1/maps/coal_tower?seed=seed_a&floor=1")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("map", data)
        map_detail = data["map"]
        self.assertIn("tiles", map_detail)
        self.assertIn("objectives", map_detail)
        self.assertEqual(map_detail.get("seed_variant"), "seed_a")
        self.assertEqual(map_detail.get("floor"), 1)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_gauntlet_routes.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Killer",
        ))
    db.session.commit()
    return character


@pytest.mark.unit
class TestGauntletRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        seed_killer("Nurse")
        seed_killer("Trapper")

        user_service = UserService()
        user, err = user_service.register_user("streakuser", "gauntlet@test.com", "password123")
        assert err is None
        self.user_id = user.id
        self.token = user_service.generate_token(user.id)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        self.assertEqual(self.client.get("/api/v1/gauntlet-streak/run?role=killer").status_code, 401)
        self.assertEqual(
            self.client.post("/api/v1/gauntlet-streak/run/reset", json={"role": "killer"}).status_code, 401
        )
        self.assertEqual(self.client.get("/api/v1/gauntlet-streak/stats?role=killer").status_code, 401)

    def test_run_requires_valid_role(self):
        res = self.client.get("/api/v1/gauntlet-streak/run?role=bogus", headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_get_run_auto_creates(self):
        res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        run = res.get_json()["run"]
        self.assertEqual(run["role"], "killer")
        self.assertEqual(run["status"], "in_progress")
        self.assertIn("tier_info", run)

    def test_result_lifecycle(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]

        res = self.client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["previous_run"]["current_streak"], 1)
        self.assertIn("run", data)

    def test_reveal_endpoint(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]

        res = self.client.post(
            "/api/v1/gauntlet-streak/reveal",
            json={"run_id": run_id},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["run"]["target_revealed"])

    def test_run_carries_the_targets_character_perks(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run = run_res.get_json()["run"]

        perks = run["current_loadout"]["character_perks"]
        self.assertTrue(perks)
        self.assertTrue(all(p["character"] == run["current_character_id"] for p in perks))

    def test_reset_endpoint(self):
        self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        res = self.client.post(
            "/api/v1/gauntlet-streak/run/reset",
            json={"role": "killer"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        run = res.get_json()["run"]
        self.assertEqual(run["current_streak"], 0)
        self.assertFalse(run["target_revealed"])

    def test_stats_endpoint(self):
        res = self.client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("stats", res.get_json())

    def test_runs_are_isolated_per_user(self):
        user_service = UserService()
        other, err = user_service.register_user("otherstreakuser", "other-gauntlet@test.com", "password123")
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]
        self.client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=self.headers,
        )

        other_run = self.client.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=other_headers
        ).get_json()["run"]
        self.assertEqual(other_run["current_streak"], 0)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_generator_routes.py
```python
import unittest
import pytest
from app import create_app


@pytest.mark.unit
class TestGeneratorRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_get_config_returns_200(self):
        response = self.client.get("/api/v1/generator/config")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("config", data)

    def test_update_config_returns_200(self):
        response = self.client.post("/api/v1/generator/config", json={"gen_mode": "wheel"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("config", data)
        self.assertEqual(data["config"]["gen_mode"], "wheel")

    def test_get_drawn_perks_returns_200(self):
        response = self.client.get("/api/v1/generator/drawn?role=Survivor")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("drawn_perks", data)
        self.assertIsInstance(data["drawn_perks"], list)

    def test_add_drawn_perks_returns_200(self):
        response = self.client.post(
            "/api/v1/generator/draw",
            json={"role": "Survivor", "perks": ["Sprint Burst", "Adrenaline"]},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("drawn_perks", data)
        self.assertIn("Sprint Burst", data["drawn_perks"])

    def test_reset_drawn_perks_returns_200(self):
        response = self.client.post("/api/v1/generator/reset", json={"role": "Survivor"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["drawn_perks"], [])


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_history_routes.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


@pytest.mark.unit
class TestHistoryRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)
        user, err = self.user_service.register_user("routeuser", "route@test.com", "password123")
        self.assertIsNone(err)
        self.user_id = user.id
        self.token = self.user_service.authenticate("routeuser", "password123")[1]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=hell")
        self.assertEqual(resp.status_code, 401)

    def test_get_run_auto_creates(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        run = resp.get_json()["run"]
        self.assertEqual(run["mode"], "hell")
        self.assertEqual(run["current_row_killers"], ["The Trapper", "The Wraith"])

    def test_run_requires_valid_mode(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=easy", headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    def test_result_lifecycle(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()["run"]
        self.assertIn("The Trapper", body["completed_killers"])
        self.assertGreater(len(body["newly_unlocked_perks"]), 0)

    def test_result_requires_killer_id(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_reset_endpoint(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        resp = self.client.post(
            "/api/v1/history-streak/run/reset", json={"mode": "hell"}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["run"]["total_killers_beaten"], 0)

    def test_stats_endpoint(self):
        resp = self.client.get("/api/v1/history-streak/stats?mode=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["stats"]["total_matches"], 0)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_item_routes.py
```python
import unittest
import pytest
from app import create_app
from app.services.perk_service import PerkService


@pytest.mark.unit
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
```

### backend/tests/unit/api/test_page_streak_routes.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.services.page_streak_service import PageStreakService
from app.services.user_service import UserService
from tests.unit.test_page_streak_service import FakePerkService, make_perks, seed_perks


@pytest.mark.unit
class TestPageStreakRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.perks = make_perks(32, character="Nurse")
        seed_perks(self.perks)
        self.app.config["PAGE_STREAK_SERVICE"] = PageStreakService(
            perk_service=FakePerkService(self.perks),
        )

        user_service = UserService()
        user, err = user_service.register_user("streakuser", "streak@test.com", "password123")
        assert err is None
        self.user_id = user.id
        self.token = user_service.generate_token(user.id)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        self.assertEqual(self.client.get("/api/v1/page-streak/roster").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/page-streak/run?killer=Nurse").status_code, 401)
        self.assertEqual(
            self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}).status_code, 401
        )

    def test_roster_endpoint(self):
        res = self.client.get("/api/v1/page-streak/roster", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(len(body["data"]), 1)
        self.assertEqual(body["data"][0]["killer"], "Nurse")
        self.assertEqual(body["data"][0]["status"], "not_started")

    def test_run_lifecycle(self):
        res = self.client.get("/api/v1/page-streak/run?killer=Nurse", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["run"])

        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        run = res.get_json()["run"]
        self.assertEqual(run["current_page"], 1)

        build = run["pages"][0][:4]
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 1, "perks": build, "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 2)

        res = self.client.post("/api/v1/page-streak/run/reset", json={"killer": "Nurse"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 1)

    def test_result_validation_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 2, "perks": ["Perk 001"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_start_requires_killer(self):
        res = self.client.post("/api/v1/page-streak/run/start", json={}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_run_requires_killer_query_param(self):
        res = self.client.get("/api/v1/page-streak/run", headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_start_twice_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_runs_are_isolated_per_user(self):
        user_service = UserService()
        other, err = user_service.register_user("otherstreakuser", "other@test.com", "password123")
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)

        res = self.client.get("/api/v1/page-streak/run?killer=Nurse", headers=other_headers)
        self.assertIsNone(res.get_json()["run"])

        res = self.client.get("/api/v1/page-streak/roster", headers=other_headers)
        self.assertEqual(res.get_json()["data"][0]["status"], "not_started")


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/api/test_scraper_routes.py
```python
import unittest
from unittest.mock import MagicMock, patch
import pytest

from app import create_app
from app.services.scraper_service import ScraperConfig, ScraperService


@pytest.mark.unit
class TestScraperRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    @patch("app.core.security.get_current_user", return_value=MagicMock(is_admin=True, role="admin", is_anonymous=False))
    @patch.object(ScraperService, "load_config")
    @patch.object(ScraperService, "save_config")
    def test_get_and_post_scrape_config(self, mock_save_config, mock_load_config, mock_user):
        mock_load_config.return_value = ScraperConfig(source="nightlight", fallback_to_wiki=True)
        mock_save_config.return_value = ScraperConfig(source="wiki", fallback_to_wiki=False)

        response = self.client.get("/api/v1/scrape/config")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("source", data)
        self.assertIn("fallback_to_wiki", data)
        self.assertEqual(data["source"], "nightlight")
        self.assertTrue(data["fallback_to_wiki"])

        payload = {"source": "wiki", "fallback_to_wiki": False}
        post_response = self.client.post("/api/v1/scrape/config", json=payload)
        self.assertEqual(post_response.status_code, 200)
        post_data = post_response.get_json()
        self.assertIn("message", post_data)
        self.assertIn("config", post_data)
        self.assertEqual(post_data["config"]["source"], "wiki")
        self.assertFalse(post_data["config"]["fallback_to_wiki"])
        mock_save_config.assert_called_once_with(payload)

    @patch("app.core.security.get_current_user", return_value=MagicMock(is_admin=True, role="admin", is_anonymous=False))
    @patch("app.routes.perks.threading.Thread")
    @patch.object(ScraperService, "get_status", return_value={"is_running": False})
    def test_trigger_scrape_with_overrides(self, mock_status, mock_thread, mock_user):
        response = self.client.post(
            "/api/v1/scrape",
            json={"source": "wiki", "fallback": False},
        )
        self.assertEqual(response.status_code, 202)
        mock_thread.assert_called_once()
        _, kwargs = mock_thread.call_args
        self.assertIn("kwargs", kwargs)
        self.assertEqual(kwargs["kwargs"].get("override_source"), "wiki")
        self.assertEqual(kwargs["kwargs"].get("override_fallback"), False)


if __name__ == "__main__":
    unittest.main()
```
