# backend/tests/unit/test_history_roster.py
import pytest
from sqlalchemy.orm import Session
from app.models import Killer, Perk
from app.services.history.roster import (
    ROW_SIZE,
    build_rows,
    get_general_killer_perk_names,
    get_killer_teachable_perk_names,
    get_owned_killer_names_by_release,
)
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService
from tests.unit.conftest import make_chapter


def seed_killer(name: str, release_number: int, perk_count: int = 2) -> Killer:
    """`release_number` is `== id` now, not a settable field, so it is passed
    straight through as the killer's id to control release order."""
    from app.core.extensions import db

    character = Killer(
        id=release_number, name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power"
    )
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                killer_id=character.id,
                is_teachable=True,
                role="Killer",
            )
        )
    db.session.commit()
    return character


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def roster_user(user_service: UserService) -> int:
    user, err = user_service.register_user("roster_player", "roster@test.com", "Pass1234!")
    assert err is None
    return user.id


@pytest.mark.unit
class TestBuildRows:
    """Tests for splitting release-ordered rosters into 5-killer batches."""

    def test_row_size_is_five(self) -> None:
        assert ROW_SIZE == 5

    def test_chunks_into_rows_of_five(self) -> None:
        names = [f"Killer {i}" for i in range(12)]
        rows = build_rows(names)
        assert len(rows) == 3
        assert rows[0] == names[0:5]
        assert rows[1] == names[5:10]
        assert rows[2] == names[10:12]

    def test_empty_list_yields_no_rows(self) -> None:
        assert build_rows([]) == []


@pytest.mark.unit
class TestGetOwnedKillerNamesByRelease:
    """Tests for querying owned killers sorted chronologically by release sequence."""

    def test_sorted_by_release_number(
        self, roster_user: int, ownership_service: OwnershipService
    ) -> None:
        seed_killer("The Nurse", release_number=4)
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)

        names = get_owned_killer_names_by_release(roster_user, ownership_service)
        assert names == ["The Trapper", "The Wraith", "The Nurse"]

    def test_unowned_killers_excluded(
        self, roster_user: int, ownership_service: OwnershipService
    ) -> None:
        seed_killer("The Trapper", release_number=1)
        char2 = seed_killer("The Wraith", release_number=2)
        ownership_service.set_character_ownership(roster_user, char2.id, is_owned=False, role="Killer")

        names = get_owned_killer_names_by_release(roster_user, ownership_service)
        assert names == ["The Trapper"]


@pytest.mark.unit
class TestPerkNameHelpers:
    """Tests for segregating general baseline killer perks from character teachables."""

    def test_general_perks_have_no_character(self, db_session: Session) -> None:
        db_session.add(Perk(name="Whispers", role="Killer"))
        db_session.add(Perk(name="A Nurse's Calling", role="Killer"))
        db_session.commit()

        names = get_general_killer_perk_names()
        assert "Whispers" in names
        assert "A Nurse's Calling" in names

    def test_general_perks_exclude_teachables(self, db_session: Session) -> None:
        seed_killer("The Trapper", release_number=1, perk_count=1)
        names = get_general_killer_perk_names()
        assert "The Trapper Perk 1" not in names

    def test_teachable_perks_for_killer(self, db_session: Session) -> None:
        seed_killer("The Trapper", release_number=1, perk_count=2)
        names = get_killer_teachable_perk_names("The Trapper")
        assert set(names) == {"The Trapper Perk 1", "The Trapper Perk 2"}

    def test_teachable_perks_for_unknown_killer(self) -> None:
        assert get_killer_teachable_perk_names("Nobody") == []
