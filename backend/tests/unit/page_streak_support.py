# backend/tests/unit/page_streak_support.py
"""Fake perk services, seed helpers and fixtures shared by the page-streak service test modules."""
import pytest
from sqlalchemy import select
from app.models import Killer, Perk, Survivor
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from tests.unit.conftest import make_chapter


_ROLE_MODELS = {"Killer": Killer, "Survivor": Survivor}


GENERAL_CHARACTER = "General"


class FakePerkService:
    def __init__(self, perks: list[dict[str, object]]) -> None:
        self._perks = perks

    def get_perks(self, category: str | None = None, limit: int | None = None, **kwargs: object) -> dict[str, object]:
        data = [p for p in self._perks if category is None or p.get("category") == category]
        return {"data": data, "pagination": {"total": len(data)}}


class ClampingFakePerkService:
    def __init__(self, perks: list[dict[str, object]]) -> None:
        self._perks = perks

    def get_perks(self, category: str | None = None, page: int = 1, limit: int = 50, **kwargs: object) -> dict[str, object]:
        data = [p for p in self._perks if category is None or p.get("category") == category]
        total = len(data)
        page = max(1, page)
        limit = max(1, min(limit, 200))
        start = (page - 1) * limit
        end = start + limit
        return {
            "data": data[start:end],
            "pagination": {"total": total, "page": page, "limit": limit},
        }


class OrderedFakePerkService(FakePerkService):
    def __init__(self, perks: list[dict[str, object]], characters: list[dict[str, object]]) -> None:
        super().__init__(perks)
        self._characters = characters

    def get_characters(self, category: str | None = None) -> list[dict[str, object]]:
        if category is None:
            return list(self._characters)
        return [c for c in self._characters if c.get("category") == category]


def make_perks(count: int, category: str = "Killer", character: str = "Trapper", start: int = 1) -> list[dict[str, object]]:
    return [
        {
            "name": f"Perk {i:03d}",
            "character": character,
            "category": category,
        }
        for i in range(start, start + count)
    ]


def seed_perks(perks: list[dict[str, object]]) -> None:
    from app.core.extensions import db

    char_cache: dict[str, Killer | Survivor] = {}
    for p in perks:
        char_name = str(p.get("character", ""))
        role = str(p["category"])
        model = _ROLE_MODELS[role]
        character = None
        if char_name and char_name != GENERAL_CHARACTER:
            character = char_cache.get(char_name)
            if character is None:
                character = db.session.scalars(
                    select(model).where(model.name == char_name)
                ).first()
                if character is None:
                    kwargs = {"power_name": f"{char_name} Power"} if model is Killer else {}
                    character = model(name=char_name, chapter_id=make_chapter(db.session).id, **kwargs)
                    db.session.add(character)
                    db.session.flush()
                char_cache[char_name] = character
        db.session.add(
            Perk(
                name=str(p["name"]),
                survivor_id=character.id if character and role == "Survivor" else None,
                killer_id=character.id if character and role == "Killer" else None,
                is_teachable=True,
                role=role,
            )
        )
    db.session.commit()


def seed_killers(names: list[str]) -> None:
    from app.core.extensions import db

    for name in names:
        if db.session.scalars(select(Killer).where(Killer.name == name)).first():
            continue
        db.session.add(Killer(name=name, chapter_id=make_chapter(db.session).id, power_name=f"{name} Power"))
    db.session.commit()


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.fixture
def streak_user(user_service: UserService) -> int:
    user, err = user_service.register_user("streak_player", "streak@example.com", "Password123!")
    assert err is None
    return user.id
