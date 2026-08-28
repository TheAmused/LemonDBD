# backend/tests/unit/scrapers/test_modular_drivers.py
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
