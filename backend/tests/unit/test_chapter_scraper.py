# backend/tests/unit/test_chapter_scraper.py
from bs4 import BeautifulSoup

from app.scrapers.wikigg import WikiGGScraperDriver


def test_extracts_dlc_banner_image_from_table_row() -> None:
    html = """
    <table class="wikitable">
      <tr>
        <td><a href="/wiki/The_Last_Breath">The Last Breath</a></td>
        <td><img src="/images/thumb/x/y/TheLastBreath_Banner.png/300px-TheLastBreath_Banner.png"></td>
      </tr>
    </table>
    """
    tr = BeautifulSoup(html, "html.parser").find("tr")
    driver = WikiGGScraperDriver()
    url = driver._extract_dlc_image_url(tr)
    assert url is not None
    assert "TheLastBreath_Banner" in url


def test_extract_dlc_image_url_returns_none_without_image() -> None:
    html = """
    <table class="wikitable">
      <tr>
        <td><a href="/wiki/The_Last_Breath">The Last Breath</a></td>
      </tr>
    </table>
    """
    tr = BeautifulSoup(html, "html.parser").find("tr")
    driver = WikiGGScraperDriver()
    assert driver._extract_dlc_image_url(tr) is None
