import unittest
from app.services.scraper_service import ScraperService


class TestClassifyPortrait(unittest.TestCase):
    def test_killer_portrait_yields_category_and_number(self):
        self.assertEqual(
            ScraperService.classify_portrait(
                "https://static.wikia.nocookie.net/x/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"
            ),
            ("Killer", 1),
        )

    def test_survivor_portrait_yields_category_and_number(self):
        self.assertEqual(
            ScraperService.classify_portrait(
                "https://static.wikia.nocookie.net/x/images/a/a1/S07_AceVisconti_Portrait.png"
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
    <img data-src="https://x/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"/>
  </a>
  <a href="/wiki/The_Wraith" title="The Wraith">
    <img data-src="https://x/images/9/92/K02_TheWraith_Portrait.png"/>
  </a>
  <a href="/wiki/Bear_Traps" title="Bear Traps">
    <img data-src="https://x/images/0/0f/IconPowers_trap.png"/>
  </a>
  <a href="/wiki/Ace_Visconti" title="Ace Visconti">
    <img data-src="https://x/images/a/a1/S07_AceVisconti_Portrait.png"/>
  </a>
  <a href="/wiki/Entity" title="Entity">
    <img data-src="https://x/images/2/2b/Entity_Portrait.png"/>
  </a>
  <a href="/wiki/Generator" title="Generator">no image here</a>
</div>
"""


class TestParseCharacterPage(unittest.TestCase):
    def setUp(self):
        self.service = ScraperService()
        self.characters = self.service.parse_character_page(KILLER_PAGE_HTML)
        self.by_name = {c.name: c for c in self.characters}

    def test_only_portraits_become_characters(self):
        self.assertEqual(sorted(self.by_name), ["Ace Visconti", "Trapper", "Wraith"])

    def test_power_link_is_dropped(self):
        self.assertNotIn("Bear Traps", self.by_name)

    def test_concept_portrait_without_role_prefix_is_dropped(self):
        self.assertNotIn("Entity", self.by_name)

    def test_killer_category_comes_from_the_filename_not_the_page(self):
        self.assertEqual(self.by_name["Trapper"].category, "Killer")

    def test_survivor_on_the_killer_page_is_still_a_survivor(self):
        self.assertEqual(self.by_name["Ace Visconti"].category, "Survivor")

    def test_release_number_is_captured(self):
        self.assertEqual(self.by_name["Trapper"].release_number, 1)
        self.assertEqual(self.by_name["Wraith"].release_number, 2)
        self.assertEqual(self.by_name["Ace Visconti"].release_number, 7)

    def test_real_name_keeps_the_wiki_title(self):
        self.assertEqual(self.by_name["Trapper"].real_name, "The Trapper")

    def test_avatar_path_follows_the_category(self):
        self.assertEqual(self.by_name["Trapper"].avatar_local_path, "avatars/killers/trapper.png")
        self.assertEqual(self.by_name["Ace Visconti"].avatar_local_path, "avatars/survivors/ace_visconti.png")

    def test_avatar_url_is_the_portrait(self):
        self.assertIn("K01_TheTrapper_Portrait", self.by_name["Trapper"].avatar_url)

    def test_duplicate_links_produce_one_character(self):
        doubled = self.service.parse_character_page(KILLER_PAGE_HTML + KILLER_PAGE_HTML)
        self.assertEqual(len([c for c in doubled if c.name == "Trapper"]), 1)

    def test_page_without_portraits_yields_nothing(self):
        html = '<div class="mw-parser-output"><a href="/wiki/Hatch" title="Hatch">' \
               '<img data-src="https://x/images/1/1a/IconHelp_hatch.png"/></a></div>'
        self.assertEqual(self.service.parse_character_page(html), [])


if __name__ == "__main__":
    unittest.main()
