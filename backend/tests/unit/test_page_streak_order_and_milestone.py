# backend/tests/unit/test_page_streak_order_and_milestone.py
"""Page-streak roster ordering and the full-roster milestone."""
import pytest
from app.models import Killer
from app.services.ownership_service import OwnershipService
from app.services.page_streak_service import PageStreakService
from tests.unit.conftest import make_chapter
from tests.unit.page_streak_support import (
    FakePerkService,
    OrderedFakePerkService,
    make_perks,
    seed_perks,
    seed_killers,
)
from tests.unit.page_streak_support import (  # noqa: F401  (pytest fixtures)
    user_service,
    ownership_service,
    streak_user,
)


@pytest.mark.unit
class TestPageStreakRosterOrder:
    """Tests for ordering roster by release sequence or alphabetical fallback."""

    @pytest.fixture(autouse=True)
    def setup_roster_order(self, streak_user: int) -> None:
        self.user_id = streak_user
        perks: list[dict[str, object]] = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(perks)
        seed_killers(["Wraith", "Trapper", "Nurse", "Animatronic"])

        characters = [
            {"name": "Nurse", "category": "Killer", "release_number": 4},
            {"name": "Trapper", "category": "Killer", "release_number": 1},
            {"name": "Wraith", "category": "Killer", "release_number": 2},
            {"name": "Meg Thomas", "category": "Survivor", "release_number": 2},
        ]
        self.perks = perks
        self.characters = characters
        self.service = PageStreakService(perk_service=OrderedFakePerkService(perks, characters))

    def test_killers_are_ordered_by_release_number(self) -> None:
        assert self.service.get_killers(self.user_id) == ["Trapper", "Wraith", "Nurse", "Animatronic"]

    def test_killer_without_a_release_number_is_kept_at_the_end(self) -> None:
        assert "Animatronic" in self.service.get_killers(self.user_id)

    def test_roster_uses_the_same_order(self) -> None:
        roster_names = [entry["killer"] for entry in self.service.get_roster(self.user_id)]
        assert roster_names == ["Trapper", "Wraith", "Nurse", "Animatronic"]

    def test_falls_back_to_alphabetical_order_without_release_numbers(self) -> None:
        service = PageStreakService(perk_service=FakePerkService(self.perks))
        assert service.get_killers(self.user_id) == ["Animatronic", "Nurse", "Trapper", "Wraith"]


@pytest.mark.unit
class TestPageStreakRosterMilestone:
    """Tests for the mode-wide 'full roster' badge (owned killers vs. the whole
    game), computed LIVE on every read -- unlike gauntlet/chaos/history, Page
    Streak has no bounded run to freeze a pool against, so nothing here is
    ever written to ChallengeCompletionRecord; it's recomputed fresh each
    time from current ownership + the permanent per-killer completions."""

    @pytest.fixture(autouse=True)
    def setup_milestone(self, streak_user: int) -> None:
        self.user_id = streak_user
        self.perks = make_perks(4, character="Trapper") + make_perks(4, character="Nurse")
        for i, perk in enumerate(self.perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(self.perks)
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def win_killer(self, killer: str) -> dict[str, object]:
        run = self.service.start_run(self.user_id, killer)
        page = run["pages"][0]
        build = page[: self.service.expected_build_size(page)]
        return self.service.submit_result(self.user_id, killer, 1, build, "win")

    def test_not_full_when_a_killer_exists_that_is_not_owned(
        self, ownership_service: OwnershipService
    ) -> None:
        from app.core.extensions import db

        ghostface = Killer(name="Ghostface", chapter_id=make_chapter(db.session).id, power_name="Ghostface Power")
        db.session.add(ghostface)
        db.session.commit()
        ownership_service.set_character_ownership(self.user_id, ghostface.id, is_owned=False, role="Killer")

        self.win_killer("Trapper")
        updated = self.win_killer("Nurse")
        assert updated["status"] == "completed"

        milestone = self.service.get_roster_milestone(self.user_id)
        assert milestone["completed"] is True
        assert milestone["full_roster"] is False
        assert milestone["killer_count"] == 2

    def test_full_when_the_owned_roster_is_the_whole_game(self) -> None:
        self.win_killer("Trapper")
        self.win_killer("Nurse")

        milestone = self.service.get_roster_milestone(self.user_id)
        assert milestone["completed"] is True
        assert milestone["full_roster"] is True
        assert milestone["killer_count"] == 2

    def test_a_new_owned_killer_drops_the_badge_until_it_is_also_cleared(self) -> None:
        """Live, not permanent: gaining a killer (a new one shipping to the
        game and defaulting to owned, or the player unlocking one) makes the
        roster incomplete again until that killer is cleared too."""
        from app.core.extensions import db

        self.win_killer("Trapper")
        self.win_killer("Nurse")
        assert self.service.get_roster_milestone(self.user_id)["full_roster"] is True

        db.session.add(Killer(name="Ghostface", chapter_id=make_chapter(db.session).id, power_name="Ghostface Power"))  # owned by default
        db.session.commit()

        milestone = self.service.get_roster_milestone(self.user_id)
        assert milestone == {"completed": False, "full_roster": False, "killer_count": None}

    def test_a_new_owned_killer_mid_grind_also_blocks_the_badge(self) -> None:
        """No grace period here (unlike gauntlet/chaos/history's frozen-run
        pools): a killer that becomes owned mid-grind must be cleared too
        before the badge shows, even though the player was already grinding
        toward what used to be the whole roster."""
        from app.core.extensions import db

        self.win_killer("Trapper")

        db.session.add(Killer(name="Ghostface", chapter_id=make_chapter(db.session).id, power_name="Ghostface Power"))  # owned by default
        db.session.commit()

        updated = self.win_killer("Nurse")
        assert updated["status"] == "completed"

        milestone = self.service.get_roster_milestone(self.user_id)
        assert milestone == {"completed": False, "full_roster": False, "killer_count": None}

    def test_no_milestone_before_the_owned_roster_is_fully_cleared(self) -> None:
        self.win_killer("Trapper")
        milestone = self.service.get_roster_milestone(self.user_id)
        assert milestone == {"completed": False, "full_roster": False, "killer_count": None}
