# backend/tests/unit/test_chapter_scraper.py
import pytest
from bs4 import BeautifulSoup

from app.scrapers.wikigg import WikiGGScraperDriver

HEADING_BLOCK_HTML = """
<div class="mw-parser-output">
  <h3>Test Chapter</h3>
  <p>An introductory paragraph with no image at all.</p>
  <p>Featuring <a href="/wiki/Some_Survivor">Some Survivor</a></p>
  <p><img src="/images/thumb/a/b/TestChapter_Banner.png/300px-TestChapter_Banner.png"></p>
</div>
"""


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


def test_heading_block_accumulator_finds_image_on_later_sibling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The h3/h4 heading-block branch of scrape_dlcs_from_wiki walks sibling
    elements looking for a banner image. This proves the accumulator does not
    stop at the first imageless sibling and instead keeps walking until it
    finds one, matching against whichever sibling actually holds the <img>."""
    driver = WikiGGScraperDriver()
    monkeypatch.setattr(driver, "fetch_page_html", lambda *a, **k: HEADING_BLOCK_HTML)

    dlcs = driver.scrape_dlcs_from_wiki()

    by_name = {dlc["dlc_name"]: dlc for dlc in dlcs}
    assert "Test Chapter" in by_name
    image_url = by_name["Test Chapter"]["dlc_image_url"]
    assert image_url is not None
    assert "TestChapter_Banner" in image_url
