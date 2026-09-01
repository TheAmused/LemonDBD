# backend/tests/unit/scrapers/test_addon_canonicalisation.py
"""Add-on naming must be decided once, after every source has been merged.

Regression cover for duplicate add-on rows: the global Add-ons page suffixed a
name with "(Target)" only when it was ambiguous, while the per-character page
suffixed it always. The same add-on therefore reached the database twice under
two names, and the icon was saved under a name the database never referenced.
"""
import pytest

from app.scrapers.types import CharacterData
from app.scrapers.wikigg import WikiGGScraperDriver


def _rows(*specs):
    return [
        {
            "name": n,
            "target": t,
            "category": "Killer",
            "description": d,
            "icon_url": i,
            "rarity": r,
        }
        for n, t, d, i, r in specs
    ]


@pytest.mark.unit
class TestCanonicaliseAddons:
    def test_unique_addon_gets_no_target_suffix(self):
        addons = WikiGGScraperDriver.canonicalise_addons(
            _rows(("Magnetised Manacles", "The Judgment", "desc", "http://i/x.png", "Rare"))
        )
        assert [a.name for a in addons] == ["Magnetised Manacles"]
        assert addons[0].icon_local_path == "icons/addons/magnetised_manacles.webp"

    def test_same_addon_from_two_sources_is_not_duplicated(self):
        """The global page and the character page describe one add-on, not two."""
        addons = WikiGGScraperDriver.canonicalise_addons(
            _rows(
                ("Magnetised Manacles", "The Judgment", "desc", "http://i/x.png", "Rare"),
                ("Magnetised Manacles", "The Judgment", "desc", "http://i/x.png", "Rare"),
            )
        )
        assert len(addons) == 1
        assert addons[0].name == "Magnetised Manacles"

    def test_name_shared_by_two_targets_is_disambiguated(self):
        addons = WikiGGScraperDriver.canonicalise_addons(
            _rows(
                ("Battery", "Flashlight", "a", "http://i/a.png", "Common"),
                ("Battery", "Toolbox", "b", "http://i/b.png", "Common"),
            )
        )
        assert sorted(a.name for a in addons) == ["Battery (Flashlight)", "Battery (Toolbox)"]

    def test_icon_path_always_matches_the_stored_name(self):
        """The file the downloader writes and the path the API serves must agree."""
        from app.scrapers.utils import sanitize_filename

        addons = WikiGGScraperDriver.canonicalise_addons(
            _rows(
                ("Ether 15 vol%", "The Clown", "d", "http://i/e.png", "Rare"),
                ("Battery", "Flashlight", "a", "http://i/a.png", "Common"),
                ("Battery", "Toolbox", "b", "http://i/b.png", "Common"),
            )
        )
        for a in addons:
            assert a.icon_local_path == f"icons/addons/{sanitize_filename(a.name)}.webp"

    def test_richer_record_wins_when_a_source_omits_fields(self):
        addons = WikiGGScraperDriver.canonicalise_addons(
            _rows(
                ("Undying Flame", "The Judgment", "", "", "Rare"),
                ("Undying Flame", "The Judgment", "full text", "http://i/u.png", "Rare"),
            )
        )
        assert len(addons) == 1
        assert addons[0].description == "full text"
        assert addons[0].icon_url == "http://i/u.png"


CHARACTER_PAGE_HTML = """
<div class="mw-parser-output">
  <h2>Add-ons</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/1/1a/IconAddon_manacles.png"/></td>
      <td><a href="/wiki/Magnetised_Manacles">Magnetised Manacles</a></td>
      <td>Rare</td>
      <td>Slows the survivor.</td>
    </tr>
  </table>
</div>
"""

GLOBAL_PAGE_HTML = """
<div class="mw-parser-output">
  <h2>The Judgment Add-ons</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Rarity</th><th>Description</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/1/1a/IconAddon_manacles.png"/></td>
      <td><a href="/wiki/Magnetised_Manacles">Magnetised Manacles</a></td>
      <td>Rare</td>
      <td>Slows the survivor.</td>
    </tr>
  </table>
</div>
"""


@pytest.mark.unit
class TestBothScrapePassesAgree:
    def test_global_and_character_rows_merge_into_one_addon(self, monkeypatch):
        driver = WikiGGScraperDriver()
        char = CharacterData(
            name="The Judgment",
            real_name="Koenrad",
            wiki_slug="The_Judgment",
            short_name="Judgment",
            category="Killer",
            avatar_url="",
            avatar_local_path="",
        )
        monkeypatch.setattr(driver, "fetch_page_html", lambda *a, **k: CHARACTER_PAGE_HTML)

        rows = driver.collect_addon_rows(GLOBAL_PAGE_HTML, [char])
        rows += driver.collect_character_addon_rows(char)

        addons = driver.canonicalise_addons(rows)
        names = [a.name for a in addons]
        assert names == ["Magnetised Manacles"], f"duplicate add-on rows: {names}"
