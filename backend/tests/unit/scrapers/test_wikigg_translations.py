# backend/tests/unit/scrapers/test_wikigg_translations.py
from unittest.mock import MagicMock
import pytest
from app.scrapers.wikigg import WikiGGScraperDriver
from app.scrapers.types import CharacterData, PerkData, ItemData, AddonData, KillerPowerData


@pytest.mark.unit
class TestWikiGGTranslations:
    """Tests for multi-locale translation scraping, enrichment, and parsing."""

    def test_translation_enrichment_mock(self) -> None:
        driver = WikiGGScraperDriver()
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

        def mock_fetch_lang(lang: str, page: str) -> str:
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

        driver.fetch_lang_page_html = MagicMock(side_effect=mock_fetch_lang)
        driver.scrape_translations(characters, perks, items, addons)

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

    def test_fetch_lang_page_html_dispatches_known_locale_and_falls_back_for_unknown(self) -> None:
        """fetch_lang_page_html must route a registered locale (e.g. "pl") to
        that locale's own driver, and fall back to self.fetch_page_html for
        any language with no dedicated driver -- including "en", which has
        no entry in LANGUAGE_DRIVERS since English is scraped directly."""
        driver = WikiGGScraperDriver()
        driver.fetch_page_html = MagicMock(return_value="<html>en-fallback</html>")

        pl_driver_instance = MagicMock()
        pl_driver_instance.fetch_page_html.return_value = "<html>pl-page</html>"
        pl_driver_cls = MagicMock(return_value=pl_driver_instance)

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("app.scrapers.drivers.LANGUAGE_DRIVERS", {"pl": pl_driver_cls})

            assert driver.fetch_lang_page_html("pl", "Umiejętności") == "<html>pl-page</html>"
            pl_driver_cls.assert_called_once_with(base_dir=driver.base_dir)
            pl_driver_instance.fetch_page_html.assert_called_once_with("Umiejętności")

            assert driver.fetch_lang_page_html("en", "Perks") == "<html>en-fallback</html>"
            driver.fetch_page_html.assert_called_once_with("Perks")
