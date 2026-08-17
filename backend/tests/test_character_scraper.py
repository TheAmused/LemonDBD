import json
import unittest
from app.services.scraper_service import ScraperService, CharacterData, NightlightScraperDriver


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

    def test_real_name_does_not_repeat_the_title(self):
        # The UI shows real_name in parentheses when it differs from name, so a killer
        # must not render as "Trapper (The Trapper)".
        self.assertEqual(self.by_name["Trapper"].real_name, "Trapper")
        self.assertEqual(self.by_name["Ace Visconti"].real_name, "Ace Visconti")

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


class TestCharacterModelCarriesReleaseNumber(unittest.TestCase):
    def test_model_accepts_and_returns_release_number(self):
        from app.services.perk_service import CharacterModel

        model = CharacterModel(
            name="Trapper",
            real_name="The Trapper",
            category="Killer",
            avatar_local_path="avatars/killers/trapper.png",
            release_number=1,
        )
        self.assertEqual(model.model_dump()["release_number"], 1)

    def test_release_number_defaults_when_absent(self):
        from app.services.perk_service import CharacterModel

        model = CharacterModel(name="Meg Thomas", real_name="Meg Thomas", category="Survivor")
        self.assertIsNone(model.model_dump()["release_number"])


PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Killer Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img data-src="https://x/images/f/f1/IconPerks_agitation.png"/></td>
      <td>Agitation</td>
      <td>You get excited.</td>
      <td><a href="/wiki/The_Trapper" title="The Trapper">The Trapper</a></td>
    </tr>
  </table>
</div>
"""


SURVIVOR_PAGE_HTML = """
<div class="mw-parser-output">
  <a href="/wiki/The_Troupe" title="The Troupe">
    <img data-src="https://x/images/e/e0/S42_TheTroupe_Portrait.png/revision/latest"/>
  </a>
</div>
"""

TROUPE_PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Survivor Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img data-src="https://x/images/a/a2/IconPerks_bardic.png"/></td>
      <td>Bardic Inspiration</td>
      <td>You sing.</td>
      <td><a href="/wiki/Troupe" title="Troupe">Aestri</a></td>
    </tr>
  </table>
</div>
"""


class TestPerkOwnerMatching(unittest.TestCase):
    def test_survivor_stored_with_an_article_matches_a_link_without_one(self):
        # "The Troupe" is stored with its article, but the perks page links it as
        # /wiki/Troupe with the title "Troupe". Without both spellings registered,
        # its three perks silently fall through to "General".
        service = ScraperService()
        characters = service.parse_character_page(SURVIVOR_PAGE_HTML)
        perks = service.parse_perks(TROUPE_PERKS_HTML, characters)

        bardic = next(p for p in perks if p.name == "Bardic Inspiration")
        self.assertEqual(bardic.character, "The Troupe")
        self.assertEqual(bardic.character_avatar_path, "avatars/survivors/the_troupe.png")

    def test_perk_matches_a_killer_whose_name_lost_its_article(self):
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        perks = service.parse_perks(PERKS_HTML, characters)

        agitation = next(p for p in perks if p.name == "Agitation")
        self.assertEqual(agitation.character, "Trapper")
        self.assertEqual(agitation.character_real_name, "Trapper")
        self.assertEqual(agitation.character_avatar_path, "avatars/killers/trapper.png")

    def test_owner_resolves_by_title_when_the_link_has_no_usable_slug(self):
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        for c in characters:
            c.wiki_slug = ""
        perks = service.parse_perks(PERKS_HTML, characters)

        agitation = next(p for p in perks if p.name == "Agitation")
        self.assertEqual(agitation.character, "Trapper")


class TestExtractQuoteAttribution(unittest.TestCase):
    def test_extracts_name_after_a_dash(self):
        text = '"I understand computers... systems." - Kwon Tae-young'
        self.assertEqual(ScraperService.extract_quote_attribution(text), "Kwon Tae-young")

    def test_extracts_name_after_an_en_dash_with_no_space(self):
        text = '"Go on. Run." –Portia Maye'
        self.assertEqual(ScraperService.extract_quote_attribution(text), "Portia Maye")

    def test_multi_line_description_only_looks_at_the_final_line(self):
        text = 'Whenever you gain Bloodlust, gain Undetectable for 30s.\n"Where did she go" - The Huntress'
        self.assertEqual(ScraperService.extract_quote_attribution(text), "The Huntress")

    def test_filters_out_notebook_and_unknown_attributions(self):
        self.assertIsNone(ScraperService.extract_quote_attribution('"Nothing is permanent." -Unknown, Notebook'))
        self.assertIsNone(ScraperService.extract_quote_attribution('"In the shadows." -Notebook'))

    def test_no_quote_attribution_returns_none(self):
        text = "While carrying a Survivor: they wiggle 4% slower."
        self.assertIsNone(ScraperService.extract_quote_attribution(text))

    def test_empty_text_returns_none(self):
        self.assertIsNone(ScraperService.extract_quote_attribution(""))
        self.assertIsNone(ScraperService.extract_quote_attribution(None))


class TestExtractHeaderCaptionOwner(unittest.TestCase):
    def test_extracts_owner_from_a_metadata_caption(self):
        text = "A Place For Us\nSurvivor\n- Kwon Tae-young\n<"
        self.assertEqual(ScraperService.extract_header_caption_owner(text), "Kwon Tae-young")

    def test_works_for_killer_role_too(self):
        text = "Some Perk\nKiller\n- The Trapper"
        self.assertEqual(ScraperService.extract_header_caption_owner(text), "The Trapper")

    def test_filters_out_notebook_and_unknown_attributions(self):
        self.assertIsNone(ScraperService.extract_header_caption_owner("Whispers\nKiller\n- Unknown, Notebook"))

    def test_real_flavor_text_without_the_caption_shape_returns_none(self):
        text = "While carrying a Survivor: They wiggle 4% slower."
        self.assertIsNone(ScraperService.extract_header_caption_owner(text))

    def test_empty_text_returns_none(self):
        self.assertIsNone(ScraperService.extract_header_caption_owner(""))
        self.assertIsNone(ScraperService.extract_header_caption_owner(None))


class TestNightlightPerksMatchViaQuoteAttribution(unittest.TestCase):
    def test_perk_with_no_character_tag_is_matched_via_its_quote(self):
        driver = NightlightScraperDriver()
        chunk_js = json.dumps([
            {"name": "A Place For Us", "role": "Survivor", "u": "/perks/a-place-for-us", "icon": "a-place-for-us"}
        ])
        stream_payload = (
            '<div data-perk="A Place For Us">While healing another Survivor, you both gain Elusive. '
            '&quot;I wonder if I will ever understand.&quot; - Kwon Tae-young</div>'
        )
        characters = [
            CharacterData(
                name="Kwon Tae-young",
                real_name="Kwon Tae-young",
                wiki_slug="Kwon_Tae-young",
                short_name="kwon_tae_young",
                category="Survivor",
                avatar_url="",
                avatar_local_path="avatars/survivors/kwon_tae_young.png",
            )
        ]

        perks = driver.parse_nightlight_perks(chunk_js, stream_payload, characters=characters)

        self.assertEqual(len(perks), 1)
        self.assertEqual(perks[0].character, "Kwon Tae-young")
        self.assertEqual(perks[0].icon_local_path, "icons/survivors/kwon_tae_young/a_place_for_us.png")

    def test_perk_with_only_a_metadata_caption_is_still_matched(self):
        """Regression test for the real production bug: when Nightlight has no
        real flavor text for a perk yet, the 300-char fallback snippet lands on
        a bare 'Name\\nRole\\n- Character' caption instead, which
        clean_description_text() correctly discards as junk. The character
        must still be recovered from that caption before it's thrown away."""
        driver = NightlightScraperDriver()
        chunk_js = json.dumps([
            {"name": "A Place For Us", "role": "Survivor", "u": "/perks/a-place-for-us", "icon": "a-place-for-us"}
        ])
        # No data-perk div for this name, so parsing falls back to the raw
        # 300-char snippet search, which here only contains the caption.
        stream_payload = "A Place For Us\nSurvivor\n- Kwon Tae-young\n<"
        characters = [
            CharacterData(
                name="Kwon Tae-young",
                real_name="Kwon Tae-young",
                wiki_slug="Kwon_Tae-young",
                short_name="kwon_tae_young",
                category="Survivor",
                avatar_url="",
                avatar_local_path="avatars/survivors/kwon_tae_young.png",
            )
        ]

        perks = driver.parse_nightlight_perks(chunk_js, stream_payload, characters=characters)

        self.assertEqual(len(perks), 1)
        self.assertEqual(perks[0].character, "Kwon Tae-young")

    def test_perk_with_no_matching_quote_still_falls_back_to_general(self):
        driver = NightlightScraperDriver()
        chunk_js = json.dumps([
            {"name": "Iron Grasp", "role": "Killer", "u": "/perks/iron-grasp", "icon": "iron-grasp"}
        ])
        stream_payload = (
            '<div data-perk="Iron Grasp">While carrying a Survivor: They wiggle 4% slower.</div>'
        )

        perks = driver.parse_nightlight_perks(chunk_js, stream_payload, characters=[])

        self.assertEqual(len(perks), 1)
        self.assertEqual(perks[0].character, "General")


import os
from app.services.db_service import DatabaseService


class TestPruneStaleCharacterRows(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_prune_stale.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
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
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

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
        # Guards the PRAGMA foreign_keys = ON in prune_stale_character_rows: without it
        # SQLite ignores ON DELETE CASCADE and leaves orphaned history behind.
        self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        self.assertEqual(self._count("gauntlet_match_logs"), 0)
        self.assertEqual(self._count("page_streak_page_logs"), 0)


if __name__ == "__main__":
    unittest.main()
