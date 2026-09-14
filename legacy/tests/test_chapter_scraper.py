# legacy/tests/test_chapter_scraper.py
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


HOMEPAGE_CAPSULE_HTML = """
<div class="fpbox" id="fpDlcs">
  <div class="fplinks">
    <div class="dlcCategorySection">
      <div class="categoryLabel">Chapter DLC</div>
      <div class="categoryDlcs">
        <div class="dlcCapsule relative">
          <div class="dlcCpasuleImg relative">
            <a href="/wiki/The_HALLOWEEN%C2%AE_Chapter">
              <img alt="TheHalloweenChapterCapsule.png" src="/images/TheHalloweenChapterCapsule.png?a235af">
            </a>
          </div>
          <div class="dlcLink displayFlex">
            <a href="/wiki/The_HALLOWEEN%C2%AE_Chapter">The HALLOWEEN® Chapter</a>
          </div>
        </div>
      </div>
    </div>
    <div class="dlcCategorySection">
      <div class="categoryLabel">Retired Clothing Pack</div>
      <div class="categoryDlcs">
        <div class="dlcCapsule relative">
          <div class="dlcCpasuleImg relative">
            <a href="/wiki/Some_Outfit"><img alt="SomeOutfit.png" src="/images/SomeOutfit.png"></a>
          </div>
          <div class="dlcLink displayFlex"><a href="/wiki/Some_Outfit">Some Outfit</a></div>
        </div>
      </div>
    </div>
  </div>
</div>
"""


def test_scrape_chapter_capsule_images_parses_homepage_gallery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    driver = WikiGGScraperDriver()
    monkeypatch.setattr(driver, "fetch_page_html", lambda *a, **k: HOMEPAGE_CAPSULE_HTML)

    capsules = driver.scrape_chapter_capsule_images()

    assert "the halloween chapter" in capsules
    assert "TheHalloweenChapterCapsule" in capsules["the halloween chapter"]


def test_scrape_chapter_capsule_images_does_not_bleed_into_the_next_category(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only the "Chapter DLC" categoryDlcs section should be read -- a
    following category (e.g. "Retired Clothing Pack") sits in its own
    sibling categoryDlcs div and must not be picked up too."""
    driver = WikiGGScraperDriver()
    monkeypatch.setattr(driver, "fetch_page_html", lambda *a, **k: HOMEPAGE_CAPSULE_HTML)

    capsules = driver.scrape_chapter_capsule_images()

    assert "some outfit" not in capsules


def test_scrape_chapter_images_prefers_capsule_art_over_catalog_logo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    catalog_html = """
    <table class="wikitable">
      <tr>
        <td><a href="/wiki/The_HALLOWEEN%C2%AE_Chapter">The HALLOWEEN® Chapter</a></td>
        <td><img src="/images/thumb/Logo_theHalloweenChapter.png/267px-Logo_theHalloweenChapter.png"></td>
      </tr>
    </table>
    """

    def fake_fetch(page_title: str, *a: object, **k: object) -> str:
        if page_title in ("Downloadable_Content", "Chapters"):
            return catalog_html
        return HOMEPAGE_CAPSULE_HTML

    driver = WikiGGScraperDriver()
    monkeypatch.setattr(driver, "fetch_page_html", fake_fetch)

    images = driver.scrape_chapter_images()
    by_name = {img.name: img for img in images}
    assert "The HALLOWEEN® Chapter" in by_name
    assert "Capsule" in by_name["The HALLOWEEN® Chapter"].banner_url


def test_scrape_chapter_images_falls_back_to_logo_without_capsule_match(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    catalog_html = """
    <table class="wikitable">
      <tr>
        <td><a href="/wiki/Some_Other_Chapter">Some Other Chapter</a></td>
        <td><img src="/images/thumb/Logo_someOtherChapter.png/267px-Logo_someOtherChapter.png"></td>
      </tr>
    </table>
    """

    def fake_fetch(page_title: str, *a: object, **k: object) -> str:
        if page_title in ("Downloadable_Content", "Chapters"):
            return catalog_html
        return HOMEPAGE_CAPSULE_HTML

    driver = WikiGGScraperDriver()
    monkeypatch.setattr(driver, "fetch_page_html", fake_fetch)

    images = driver.scrape_chapter_images()
    by_name = {img.name: img for img in images}
    assert "Some Other Chapter" in by_name
    assert "Logo_someOtherChapter" in by_name["Some Other Chapter"].banner_url


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
