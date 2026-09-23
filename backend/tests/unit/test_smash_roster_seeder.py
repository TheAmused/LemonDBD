# backend/tests/unit/test_smash_roster_seeder.py
"""Tests for smash-or-pass roster seeder integrity across rosters and translations."""

import json
import pytest
from app.seeds.smash_roster_seeder import ROSTERS_DIR

REQUIRED_TRANSLATION_FIELDS = (
    "name",
    "archetype",
    "tagline",
    "bio",
    "quote",
    "meme",
    "turn_on",
    "dealbreaker",
    "dating_vibe",
)

EXPECTED_HOOKED_ON_YOU_WATERMARKS = {
    "the_trapper_hoy": ("THE TRAPPER", "ISLAND"),
    "the_huntress_hoy": ("THE HUNTRESS", "ISLAND"),
    "the_spirit_hoy": ("THE SPIRIT", "ISLAND"),
    "the_wraith_hoy": ("THE WRAITH", "ISLAND"),
    "claudette_morel_hoy": ("CLAUDETTE", "MOREL"),
    "dwight_fairfield_hoy": ("DWIGHT", "FAIRFIELD"),
    "the_ocean": ("THE", "OCEAN"),
    "the_narrator": ("THE", "NARRATOR"),
}

SUPPORTED_LOCALES = ("pl", "de", "es", "ja")


@pytest.mark.unit
class TestHookedOnYouRosterIntegrity:
    @pytest.fixture
    def hoy_raw(self) -> dict:
        file_path = ROSTERS_DIR / "hooked_on_you.json"
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @pytest.fixture
    def hoy_roster(self, hoy_raw: dict) -> dict:
        return hoy_raw["rosters"][0]

    @pytest.fixture
    def hoy_entities(self, hoy_roster: dict) -> list[dict]:
        return hoy_roster.get("entities", [])

    def test_roster_is_active(self, hoy_roster: dict) -> None:
        assert hoy_roster.get("is_active") is True, "hooked_on_you roster must have is_active: True"

    def test_roster_metadata_translations(self, hoy_roster: dict) -> None:
        translations = hoy_roster.get("translations") or {}
        for locale in SUPPORTED_LOCALES:
            assert locale in translations, f"hooked_on_you missing roster translation for '{locale}'"
            assert translations[locale].get("name"), f"hooked_on_you missing translated name for '{locale}'"
            assert translations[locale].get("description"), f"hooked_on_you missing translated description for '{locale}'"

    def test_exactly_eight_characters(self, hoy_entities: list[dict]) -> None:
        assert len(hoy_entities) == 8, f"expected exactly 8 characters, got {len(hoy_entities)}"

    def test_expected_slugs_and_watermarks(self, hoy_entities: list[dict]) -> None:
        by_slug = {e["slug"]: e for e in hoy_entities}
        assert set(by_slug.keys()) == set(EXPECTED_HOOKED_ON_YOU_WATERMARKS.keys()), (
            f"slug mismatch: {set(by_slug.keys()) ^ set(EXPECTED_HOOKED_ON_YOU_WATERMARKS.keys())}"
        )
        for slug, (wl, wr) in EXPECTED_HOOKED_ON_YOU_WATERMARKS.items():
            char = by_slug[slug]
            assert char.get("watermark_left") == wl, f"{slug}: expected watermark_left={wl!r}, got {char.get('watermark_left')!r}"
            assert char.get("watermark_right") == wr, f"{slug}: expected watermark_right={wr!r}, got {char.get('watermark_right')!r}"

    def test_clean_names_no_parentheses(self, hoy_entities: list[dict]) -> None:
        for char in hoy_entities:
            slug = char.get("slug")
            name = char.get("name", "")
            assert name, f"{slug}: missing name"
            assert "(" not in name and ")" not in name, f"{slug}: name {name!r} contains parentheses"

    def test_watermarks_non_empty_no_parentheses(self, hoy_entities: list[dict]) -> None:
        for char in hoy_entities:
            slug = char.get("slug")
            wl = char.get("watermark_left", "")
            wr = char.get("watermark_right", "")
            assert wl, f"{slug}: missing watermark_left"
            assert wr, f"{slug}: missing watermark_right"
            assert "(" not in wl and ")" not in wl, f"{slug}: watermark_left {wl!r} contains parentheses"
            assert "(" not in wr and ")" not in wr, f"{slug}: watermark_right {wr!r} contains parentheses"

    def test_english_flags_range_and_uniqueness(self, hoy_entities: list[dict]) -> None:
        for char in hoy_entities:
            slug = char.get("slug")
            g_flags = char.get("green_flags") or []
            r_flags = char.get("red_flags") or []
            assert 4 <= len(g_flags) <= 6, f"{slug}: expected 4-6 green_flags, got {len(g_flags)}"
            assert 4 <= len(r_flags) <= 6, f"{slug}: expected 4-6 red_flags, got {len(r_flags)}"
            assert len(set(g_flags)) == len(g_flags), f"{slug}: duplicate green_flags found: {g_flags}"
            assert len(set(r_flags)) == len(r_flags), f"{slug}: duplicate red_flags found: {r_flags}"

    def test_translations_complete_and_flags_integrity(self, hoy_entities: list[dict]) -> None:
        for char in hoy_entities:
            slug = char.get("slug")
            translations = char.get("translations") or {}
            en_g_count = len(char.get("green_flags") or [])
            en_r_count = len(char.get("red_flags") or [])

            for locale in SUPPORTED_LOCALES:
                assert locale in translations, f"{slug}: missing translation for locale '{locale}'"
                t_data = translations[locale]

                # Check required text fields
                for field in REQUIRED_TRANSLATION_FIELDS:
                    val = t_data.get(field)
                    assert val, f"{slug}: locale '{locale}' missing or empty field '{field}'"
                    if field == "name":
                        assert "(" not in val and ")" not in val, f"{slug}: locale '{locale}' name contains parentheses: {val!r}"

                # Check flags
                g_flags = t_data.get("green_flags") or []
                r_flags = t_data.get("red_flags") or []
                assert 4 <= len(g_flags) <= 6, f"{slug}: locale '{locale}' expected 4-6 green_flags, got {len(g_flags)}"
                assert 4 <= len(r_flags) <= 6, f"{slug}: locale '{locale}' expected 4-6 red_flags, got {len(r_flags)}"
                assert len(set(g_flags)) == len(g_flags), f"{slug}: locale '{locale}' duplicate green_flags: {g_flags}"
                assert len(set(r_flags)) == len(r_flags), f"{slug}: locale '{locale}' duplicate red_flags: {r_flags}"
                assert len(g_flags) == en_g_count, f"{slug}: locale '{locale}' green_flags count ({len(g_flags)}) != EN count ({en_g_count})"
                assert len(r_flags) == en_r_count, f"{slug}: locale '{locale}' red_flags count ({len(r_flags)}) != EN count ({en_r_count})"



EXPECTED_LEGENDARY_WATERMARKS = {
    "william_birkin": ("WILLIAM", "BIRKIN"),
    "hunk": ("AGENT", "HUNK"),
    "james_sunderland": ("JAMES", "SUNDERLAND"),
    "maria": ("MARIA", "SILENT HILL"),
    "cybil_bennett": ("CYBIL", "BENNETT"),
    "lisa_garland": ("LISA", "GARLAND"),
    "naughty_bear": ("NAUGHTY", "BEAR"),
    "baba_yaga": ("BABA", "YAGA"),
    "the_look_see": ("THE", "LOOK-SEE"),
    "minotaur": ("THE", "MINOTAUR"),
    "tiffany_valentine": ("TIFFANY", "VALENTINE"),
    "chatterer": ("THE", "CHATTERER"),
    "geralt_of_rivia": ("GERALT", "OF RIVIA"),
    "chris_redfield": ("CHRIS", "REDFIELD"),
    "claire_redfield": ("CLAIRE", "REDFIELD"),
    "carlos_oliveira": ("CARLOS", "OLIVEIRA"),
    "sheva_alomar": ("SHEVA", "ALOMAR"),
    "tubarao": ("OPERATOR", "TUBARÃO"),
    "alucard": ("ADRIAN", "ALUCARD"),
    "soma_cruz": ("SOMA", "CRUZ"),
    "richter_belmont": ("RICHTER", "BELMONT"),
    "saga_anderson": ("SAGA", "ANDERSON"),
    "rose_marigold": ("ROSE", "MARIGOLD"),
    "rain_carradine": ("RAIN", "CARRADINE"),
    "william_hudson": ("PRIVATE", "HUDSON"),
    "glenn_rhee": ("GLENN", "RHEE"),
    "daryl_dixon": ("DARYL", "DIXON"),
    "maggie_rhee": ("MAGGIE", "RHEE"),
    "robin_buckley": ("ROBIN", "BUCKLEY"),
    "jonathan_byers": ("JONATHAN", "BYERS"),
    "eddie_munson": ("EDDIE", "MUNSON"),
    "forest_guide": ("FOREST", "GUIDE"),
    "hinako_shimizu": ("HINAKO", "SHIMIZU"),
    "attack_titan": ("ATTACK", "TITAN"),
    "armored_titan": ("ARMORED", "TITAN"),
    "war_hammer_titan": ("WAR HAMMER", "TITAN"),
    "mina": ("MINA", "HARKER"),
    "tomie_kawakami": ("TOMIE", "KAWAKAMI"),
    "rize_kamishiro": ("RIZE", "KAMISHIRO"),
    "yellow_rabbit": ("YELLOW", "RABBIT"),
    "glitchtrap": ("THE", "GLITCHTRAP"),
    "henry_creel": ("HENRY", "CREEL"),
    "xenomorph_queen": ("QUEEN", "XENOMORPH"),
    "true_form_dracula": ("TRUE FORM", "DRACULA"),
    "samurai_eddie": ("SAMURAI", "EDDIE"),
    "were_elk": ("WERE", "ELK"),
    "leshen": ("ANCIENT", "LESHEN"),
    "artist_miss_fuchi": ("MISS", "FUCHI"),
    "artist_boulet": ("CARMINA", "BOULET"),
    "dredge_half_spirits_torments": ("TWISTED", "TORMENT"),
    "xenomorph_king": ("KING", "XENOMORPH"),
}


@pytest.mark.unit
class TestLegendaryRosterIntegrity:
    @pytest.fixture
    def legendary_raw(self) -> dict:
        file_path = ROSTERS_DIR / "legendary_cosplay.json"
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @pytest.fixture
    def legendary_roster(self, legendary_raw: dict) -> dict:
        return legendary_raw["rosters"][0]

    @pytest.fixture
    def legendary_entities(self, legendary_roster: dict) -> list[dict]:
        return legendary_roster.get("entities", [])

    def test_roster_is_active(self, legendary_roster: dict) -> None:
        assert legendary_roster.get("is_active") is True, "legendary roster must have is_active: True"

    def test_roster_metadata_translations(self, legendary_roster: dict) -> None:
        translations = legendary_roster.get("translations") or {}
        for locale in SUPPORTED_LOCALES:
            assert locale in translations, f"legendary roster missing translation for '{locale}'"
            assert translations[locale].get("name"), f"legendary roster missing translated name for '{locale}'"
            assert translations[locale].get("description"), f"legendary roster missing translated description for '{locale}'"

    def test_exactly_fifty_one_characters(self, legendary_entities: list[dict]) -> None:
        assert len(legendary_entities) == 51, f"expected exactly 51 characters, got {len(legendary_entities)}"

    def test_expected_slugs_and_watermarks(self, legendary_entities: list[dict]) -> None:
        by_slug = {e["slug"]: e for e in legendary_entities}
        assert set(by_slug.keys()) == set(EXPECTED_LEGENDARY_WATERMARKS.keys()), (
            f"slug mismatch: {set(by_slug.keys()) ^ set(EXPECTED_LEGENDARY_WATERMARKS.keys())}"
        )
        for slug, (wl, wr) in EXPECTED_LEGENDARY_WATERMARKS.items():
            char = by_slug[slug]
            assert char.get("watermark_left") == wl, f"{slug}: expected watermark_left={wl!r}, got {char.get('watermark_left')!r}"
            assert char.get("watermark_right") == wr, f"{slug}: expected watermark_right={wr!r}, got {char.get('watermark_right')!r}"

    def test_clean_names_no_parentheses(self, legendary_entities: list[dict]) -> None:
        for char in legendary_entities:
            slug = char.get("slug")
            name = char.get("name", "")
            assert name, f"{slug}: missing name"
            assert "(" not in name and ")" not in name, f"{slug}: name {name!r} contains parentheses"

    def test_watermarks_non_empty_no_parentheses(self, legendary_entities: list[dict]) -> None:
        for char in legendary_entities:
            slug = char.get("slug")
            wl = char.get("watermark_left", "")
            wr = char.get("watermark_right", "")
            assert wl, f"{slug}: missing watermark_left"
            assert wr, f"{slug}: missing watermark_right"
            assert "(" not in wl and ")" not in wl, f"{slug}: watermark_left {wl!r} contains parentheses"
            assert "(" not in wr and ")" not in wr, f"{slug}: watermark_right {wr!r} contains parentheses"

    def test_english_flags_range_and_uniqueness(self, legendary_entities: list[dict]) -> None:
        for char in legendary_entities:
            slug = char.get("slug")
            g_flags = char.get("green_flags") or []
            r_flags = char.get("red_flags") or []
            assert 4 <= len(g_flags) <= 6, f"{slug}: expected 4-6 green_flags, got {len(g_flags)}"
            assert 4 <= len(r_flags) <= 6, f"{slug}: expected 4-6 red_flags, got {len(r_flags)}"
            assert len(set(g_flags)) == len(g_flags), f"{slug}: duplicate green_flags found: {g_flags}"
            assert len(set(r_flags)) == len(r_flags), f"{slug}: duplicate red_flags found: {r_flags}"

    def test_translations_complete_and_flags_integrity(self, legendary_entities: list[dict]) -> None:
        for char in legendary_entities:
            slug = char.get("slug")
            translations = char.get("translations") or {}
            en_g_count = len(char.get("green_flags") or [])
            en_r_count = len(char.get("red_flags") or [])

            for locale in SUPPORTED_LOCALES:
                assert locale in translations, f"{slug}: missing translation for locale '{locale}'"
                t_data = translations[locale]

                # Check required text fields
                for field in REQUIRED_TRANSLATION_FIELDS:
                    val = t_data.get(field)
                    assert val, f"{slug}: locale '{locale}' missing or empty field '{field}'"
                    if field == "name":
                        assert "(" not in val and ")" not in val, f"{slug}: locale '{locale}' name contains parentheses: {val!r}"

                # Check flags
                g_flags = t_data.get("green_flags") or []
                r_flags = t_data.get("red_flags") or []
                assert 4 <= len(g_flags) <= 6, f"{slug}: locale '{locale}' expected 4-6 green_flags, got {len(g_flags)}"
                assert 4 <= len(r_flags) <= 6, f"{slug}: locale '{locale}' expected 4-6 red_flags, got {len(r_flags)}"
                assert len(set(g_flags)) == len(g_flags), f"{slug}: locale '{locale}' duplicate green_flags: {g_flags}"
                assert len(set(r_flags)) == len(r_flags), f"{slug}: locale '{locale}' duplicate red_flags: {r_flags}"
                assert len(g_flags) == en_g_count, f"{slug}: locale '{locale}' green_flags count ({len(g_flags)}) != EN count ({en_g_count})"
                assert len(r_flags) == en_r_count, f"{slug}: locale '{locale}' red_flags count ({len(r_flags)}) != EN count ({en_r_count})"

    def test_no_boilerplate_templates(self, legendary_entities: list[dict]) -> None:
        forbidden_phrases = (
            "always bringing chaos and unhinged energy",
            "ist eine ikonische Gestalt",
            "es una figura destacada",
            "はエンティティの試練において際立った存在感を放つ",
        )
        for char in legendary_entities:
            slug = char.get("slug")
            # Check English bio and meme
            en_texts = [char.get("bio", ""), char.get("meme", "")]
            for text in en_texts:
                for phrase in forbidden_phrases:
                    assert phrase not in text, f"{slug}: EN text contains boilerplate phrase {phrase!r}"

            # Check translated bio and meme
            translations = char.get("translations") or {}
            for locale, t_data in translations.items():
                loc_texts = [t_data.get("bio", ""), t_data.get("meme", "")]
                for text in loc_texts:
                    for phrase in forbidden_phrases:
                        assert phrase not in text, f"{slug}: locale '{locale}' text contains boilerplate phrase {phrase!r}"
