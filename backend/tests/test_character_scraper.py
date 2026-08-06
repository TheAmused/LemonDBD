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


if __name__ == "__main__":
    unittest.main()
