# backend/tests/unit/gauntlet_support.py
"""Seed helpers and fixtures shared by the gauntlet service test modules."""
import pytest
from app.models import Killer, Perk, Survivor
from app.services.gauntlet_service import GauntletService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService
from tests.unit.conftest import make_chapter


def seed_killer(name: str, perk_count: int = 3, id: int | None = None) -> Killer:
    from app.core.extensions import db

    character = Killer(id=id, name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power")
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


def seed_survivor(name: str = "Meg Thomas", perk_count: int = 1) -> Survivor:
    from app.core.extensions import db

    character = Survivor(name=name, chapter_id=make_chapter(db.session).id)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                survivor_id=character.id,
                is_teachable=True,
                role="Survivor",
            )
        )
    db.session.commit()
    return character


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.fixture
def gauntlet_service() -> GauntletService:
    return GauntletService()


@pytest.fixture
def gauntlet_user(user_service: UserService) -> int:
    user, err = user_service.register_user("gauntlet_master", "master@example.com", "Password123!")
    assert err is None
    return user.id
