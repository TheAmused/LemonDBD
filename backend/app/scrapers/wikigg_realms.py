# backend/app/scrapers/wikigg_realms.py
from __future__ import annotations

from bs4 import BeautifulSoup

from app.scrapers.maps import FOLDER_REALM_MAP, OTHER_MAP_REALM_OVERRIDES
from app.scrapers.types import RealmImageData
from app.scrapers.utils import extract_high_res_url, normalize_name_key, sanitize_filename
from app.scrapers.wikigg import logger


class WikiGGRealmsMixin:
    """Realm banner-image scraping, mixed into WikiGGScraperDriver."""

    CANONICAL_REALM_NAMES = list(
        dict.fromkeys([*FOLDER_REALM_MAP.values(), *OTHER_MAP_REALM_OVERRIDES.values()])
    )

    # The wiki.gg "Realms" page's own gallery is a Twitter meme gallery (an
    # "Entity Realm Nature Guide"), not per-realm banner art - matching against
    # it produces zero or nonsensical matches. The real source of one banner
    # image per realm is the 21 numbered "RealmKeyArt_NN.png" files, which are
    # only linked from Template:Main_Page/Navigation (the homepage's realm
    # picker); individual realm pages mostly don't embed their own key art.
    # That template labels one realm ("Disturbed Ward") under its old/lore
    # name, so it needs an explicit alias here - the same rename this codebase
    # already tracks in scrapers/maps.py's FOLDER_REALM_MAP ("crotus pen").
    REALM_NAME_ALIASES = {
        "crotus prenn asylum": "Disturbed Ward",
    }

    def scrape_realm_images(self) -> list[RealmImageData]:
        """Fetches the wiki.gg homepage realm-navigation template (the only page
        that links all 21 numbered RealmKeyArt banner images together with a
        realm name) and matches each one against the canonical realm names this
        app already uses (see FOLDER_REALM_MAP / OTHER_MAP_REALM_OVERRIDES in
        scrapers/maps.py). Matching is by normalized name substring since the
        template's link titles don't always match our canonical spelling
        exactly (accents, "(Realm)" suffixes, old map names)."""
        results: list[RealmImageData] = []
        try:
            html_doc = self.fetch_page_html("Template:Main Page/Navigation")
            soup = BeautifulSoup(html_doc, "html.parser")
            content = soup.find("div", class_="mw-parser-output") or soup

            matched_names: set[str] = set()

            for img_tag in content.find_all("img"):
                src = img_tag.get("data-src") or img_tag.get("src") or ""
                if "RealmKeyArt" not in src:
                    continue

                link_tag = img_tag.find_parent("a")
                label_text = (link_tag.get("title") if link_tag else "") or img_tag.get("alt") or ""
                if not label_text:
                    continue

                label_text = self.REALM_NAME_ALIASES.get(normalize_name_key(label_text), label_text)
                norm_label = normalize_name_key(label_text)

                for realm_name in self.CANONICAL_REALM_NAMES:
                    if realm_name in matched_names:
                        continue
                    norm_realm = normalize_name_key(realm_name)
                    if norm_realm == norm_label or norm_realm in norm_label or norm_label in norm_realm:
                        image_url = extract_high_res_url(img_tag, self.BASE_DOMAIN)
                        if not image_url:
                            continue
                        slug = sanitize_filename(realm_name)
                        results.append(
                            RealmImageData(
                                name=realm_name,
                                image_url=image_url,
                                image_local_path=f"realms/{slug}.png",
                            )
                        )
                        matched_names.add(realm_name)
                        break

            logger.info(f"Matched {len(results)}/{len(self.CANONICAL_REALM_NAMES)} realm images from wiki.gg.")
        except Exception as e:
            logger.warning(f"Failed to scrape wiki.gg realm images: {e}")

        return results
