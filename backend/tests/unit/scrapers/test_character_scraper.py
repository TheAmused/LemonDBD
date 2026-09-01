# backend/tests/unit/scrapers/test_character_scraper.py
import gc
import tempfile
from pathlib import Path
from typing import Generator
import pytest
from app.services.db_service import DatabaseService
from app.services.perk_service import CharacterModel
from app.services.scraper_service import ScraperService


@pytest.mark.unit
class TestClassifyPortrait:
    """Tests for classifying DBD wiki character portrait URLs by role and release sequence number."""

    @pytest.mark.parametrize(
        "url, expected_result",
        [
            (
                "https://deadbydaylight.wiki.gg/images/8/81/K01_TheTrapper_Portrait.png/revision/latest",
                ("Killer", 1),
            ),
            (
                "https://deadbydaylight.wiki.gg/images/a/a1/S07_AceVisconti_Portrait.png",
                ("Survivor", 7),
            ),
            (
                "https://x/images/c/c9/K23_TheTrickster_Portrait.png",
                ("Killer", 23),
            ),
            (
                "https://deadbydaylight.wiki.gg/images/e/e0/S42_TheTroupe_Portrait.png",
                ("Survivor", 42),
            ),
            ("https://x/images/0/0f/IconPowers_trap.png", None),
            ("https://x/images/1/1a/IconItems_flashlight.png", None),
            ("https://x/images/2/2b/Entity_Portrait.png", None),
            ("https://x/images/2/2b/k01_TheTrapper_Portrait.png", None),
            ("", None),
            ("https://x/images/0/0f/IconPowers_K01_x_Portrait.png", None),
        ],
    )
    def test_classify_portrait_matrix(
        self, url: str, expected_result: tuple[str, int] | None
    ) -> None:
        assert ScraperService.classify_portrait(url) == expected_result


@pytest.mark.unit
class TestNormaliseCharacterName:
    """Tests for standardizing DBD killer and survivor display names."""

    @pytest.mark.parametrize(
        "raw_name, role, expected_normalized",
        [
            ("The Trapper", "Killer", "Trapper"),
            ("The Ghost Face", "Killer", "Ghost Face"),
            ("Xenomorph", "Killer", "Xenomorph"),
            ("The Unknown", "Killer", "Unknown"),
            ("The Man", "Survivor", "The Man"),
            ("  The Nurse  ", "Killer", "Nurse"),
            ("Dwight Fairfield", "Survivor", "Dwight Fairfield"),
        ],
    )
    def test_normalise_character_name_matrix(
        self, raw_name: str, role: str, expected_normalized: str
    ) -> None:
        assert ScraperService.normalise_character_name(raw_name, role) == expected_normalized


KILLER_PAGE_HTML = """
<div class="mw-parser-output">
  <a href="/wiki/The_Trapper" title="The Trapper">
    <img src="https://deadbydaylight.wiki.gg/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"/>
  </a>
  <a href="/wiki/The_Wraith" title="The Wraith">
    <img src="https://deadbydaylight.wiki.gg/images/9/92/K02_TheWraith_Portrait.png"/>
  </a>
  <a href="/wiki/Bear_Traps" title="Bear Traps">
    <img src="https://deadbydaylight.wiki.gg/images/0/0f/IconPowers_trap.png"/>
  </a>
  <a href="/wiki/Ace_Visconti" title="Ace Visconti">
    <img src="https://deadbydaylight.wiki.gg/images/a/a1/S07_AceVisconti_Portrait.png"/>
  </a>
  <a href="/wiki/Entity" title="Entity">
    <img src="https://deadbydaylight.wiki.gg/images/2/2b/Entity_Portrait.png"/>
  </a>
  <a href="/wiki/Generator" title="Generator">no image here</a>
</div>
"""


@pytest.mark.unit
class TestParseCharacterPage:
    """Tests for parsing raw Wiki HTML into structured Character models."""

    @pytest.fixture(autouse=True)
    def setup_parsed_characters(self) -> None:
        self.service = ScraperService()
        self.characters = self.service.parse_character_page(KILLER_PAGE_HTML)
        self.by_name = {c.name: c for c in self.characters}

    def test_only_portraits_become_characters(self) -> None:
        assert sorted(self.by_name) == ["Ace Visconti", "The Trapper", "The Wraith"]

    def test_power_link_is_dropped(self) -> None:
        assert "Bear Traps" not in self.by_name

    def test_concept_portrait_without_role_prefix_is_dropped(self) -> None:
        assert "Entity" not in self.by_name

    def test_killer_category_comes_from_the_filename_not_the_page(self) -> None:
        assert self.by_name["The Trapper"].category == "Killer"

    def test_survivor_on_the_killer_page_is_still_a_survivor(self) -> None:
        assert self.by_name["Ace Visconti"].category == "Survivor"

    def test_release_number_is_captured(self) -> None:
        assert self.by_name["The Trapper"].release_number == 1
        assert self.by_name["The Wraith"].release_number == 2
        assert self.by_name["Ace Visconti"].release_number == 7

    def test_avatar_path_follows_the_category(self) -> None:
        assert self.by_name["The Trapper"].avatar_local_path == "avatars/killers/the_trapper.webp"
        assert self.by_name["Ace Visconti"].avatar_local_path == "avatars/survivors/ace_visconti.webp"

    def test_avatar_url_is_the_portrait(self) -> None:
        assert "K01_TheTrapper_Portrait" in self.by_name["The Trapper"].avatar_url

    def test_duplicate_links_produce_one_character(self) -> None:
        doubled = self.service.parse_character_page(KILLER_PAGE_HTML + KILLER_PAGE_HTML)
        assert len([c for c in doubled if c.name == "The Trapper"]) == 1

    def test_page_without_portraits_yields_nothing(self) -> None:
        html = (
            '<div class="mw-parser-output"><a href="/wiki/Hatch" title="Hatch">'
            '<img src="https://x/images/1/1a/IconHelp_hatch.png"/></a></div>'
        )
        assert self.service.parse_character_page(html) == []


@pytest.mark.unit
class TestCharacterModelCarriesReleaseNumber:
    """Tests for CharacterModel schema fields and serialization."""

    def test_model_accepts_and_returns_release_number(self) -> None:
        model = CharacterModel(
            name="Trapper",
            real_name="The Trapper",
            category="Killer",
            avatar_local_path="avatars/killers/trapper.png",
            release_number=1,
        )
        assert model.model_dump()["release_number"] == 1

    def test_release_number_defaults_when_absent(self) -> None:
        model = CharacterModel(name="Meg Thomas", real_name="Meg Thomas", category="Survivor")
        assert model.model_dump()["release_number"] is None


PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Killer Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/f/f1/IconPerks_agitation.png"/></td>
      <td><a href="/wiki/Agitation" title="Agitation">Agitation</a></td>
      <td>You get excited.</td>
      <td><a href="/wiki/The_Trapper" title="The Trapper">The Trapper</a></td>
    </tr>
  </table>
</div>
"""

SURVIVOR_PAGE_HTML = """
<div class="mw-parser-output">
  <a href="/wiki/The_Troupe" title="The Troupe">
    <img src="https://deadbydaylight.wiki.gg/images/e/e0/S42_TheTroupe_Portrait.png/revision/latest"/>
  </a>
</div>
"""

TROUPE_PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Survivor Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img src="https://deadbydaylight.wiki.gg/images/a/a2/IconPerks_bardic.png"/></td>
      <td><a href="/wiki/Bardic_Inspiration" title="Bardic Inspiration">Bardic Inspiration</a></td>
      <td>You sing.</td>
      <td><a href="/wiki/Troupe" title="Troupe">Aestri</a></td>
    </tr>
  </table>
</div>
"""


@pytest.mark.unit
class TestPerkOwnerMatching:
    """Tests for mapping wiki HTML table perk records to canonical characters."""

    def test_survivor_stored_with_an_article_matches_a_link_without_one(self) -> None:
        service = ScraperService()
        characters = service.parse_character_page(SURVIVOR_PAGE_HTML)
        perks = service.parse_perks(TROUPE_PERKS_HTML, characters)

        bardic = next(p for p in perks if p.name == "Bardic Inspiration")
        assert bardic.character == "The Troupe"
        assert bardic.character_avatar_path == "avatars/survivors/the_troupe.webp"

    def test_perk_matches_a_killer_by_name(self) -> None:
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        perks = service.parse_perks(PERKS_HTML, characters)

        agitation = next(p for p in perks if p.name == "Agitation")
        assert agitation.character == "The Trapper"
        assert agitation.character_avatar_path == "avatars/killers/the_trapper.webp"

    def test_perk_with_no_owner_column_falls_back_to_general(self) -> None:
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        html = """
        <div class="mw-parser-output">
          <h2>Killer Perks</h2>
          <table class="wikitable">
            <tr><th>Icon</th><th>Name</th><th>Description</th></tr>
            <tr>
              <td><img src="https://x/images/f/f1/IconPerks_ig.png"/></td>
              <td><a href="/wiki/Iron_Grasp" title="Iron Grasp">Iron Grasp</a></td>
              <td>They wiggle 4% slower.</td>
            </tr>
          </table>
        </div>
        """
        perks = service.parse_perks(html, characters)
        iron_grasp = next(p for p in perks if p.name == "Iron Grasp")
        assert iron_grasp.character == "General"


@pytest.mark.unit
class TestPruneStaleCharacterRows:
    """Tests for pruning orphaned database rows when canonical roster is pruned."""

    @pytest.fixture
    def db_service_with_stale_data(self) -> Generator[DatabaseService, None, None]:
        temp_dir = tempfile.TemporaryDirectory()
        db_path = str(Path(temp_dir.name) / "test_prune_stale.db")
        service = DatabaseService(db_path=db_path)
        service.init_db()

        conn = service.get_connection()
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

        yield service

        gc.collect()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    def _count(self, service: DatabaseService, table: str) -> int:
        conn = service.get_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) AS n FROM {table};")
        n = cur.fetchone()["n"]
        conn.close()
        return int(n)

    def test_rows_with_unknown_characters_are_deleted(
        self, db_service_with_stale_data: DatabaseService
    ) -> None:
        deleted = db_service_with_stale_data.prune_stale_character_rows({"Trapper", "Clown"})
        assert deleted["gauntlet_runs"] == 1
        assert self._count(db_service_with_stale_data, "gauntlet_runs") == 1

    def test_rows_with_known_characters_survive(
        self, db_service_with_stale_data: DatabaseService
    ) -> None:
        db_service_with_stale_data.prune_stale_character_rows({"Trapper", "Clown"})
        conn = db_service_with_stale_data.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT current_character_id FROM gauntlet_runs;")
        remaining = [row["current_character_id"] for row in cur.fetchall()]
        conn.close()
        assert remaining == ["Trapper"]

    def test_page_streak_rows_are_pruned_too(
        self, db_service_with_stale_data: DatabaseService
    ) -> None:
        deleted = db_service_with_stale_data.prune_stale_character_rows({"Trapper", "Clown"})
        assert deleted["page_streak_runs"] == 1
        assert self._count(db_service_with_stale_data, "page_streak_runs") == 0

    def test_an_empty_valid_set_is_ignored(
        self, db_service_with_stale_data: DatabaseService
    ) -> None:
        deleted = db_service_with_stale_data.prune_stale_character_rows(set())
        assert deleted == {}
        assert self._count(db_service_with_stale_data, "gauntlet_runs") == 2

    def test_child_rows_are_cascaded_with_their_parent(
        self, db_service_with_stale_data: DatabaseService
    ) -> None:
        db_service_with_stale_data.prune_stale_character_rows({"Trapper", "Clown"})
        assert self._count(db_service_with_stale_data, "gauntlet_match_logs") == 0
        assert self._count(db_service_with_stale_data, "page_streak_page_logs") == 0
