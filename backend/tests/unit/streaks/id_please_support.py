# backend/tests/unit/streaks/id_please_support.py
"""Seed helpers shared by the ID, Please service and route tests."""
from app.core.extensions import db
from app.models import Killer, Perk, Survivor
from app.services.id_please_service import IdPleaseService
from app.services.user import UserService
from tests.unit.conftest import make_chapter


def seed_roster(killers: int, survivors: int, general_perks: int = 4) -> tuple[list[Killer], list[Survivor]]:
    """`killers`/`survivors` characters with three perks each, plus `general_perks` per side that every account has."""
    chapter = make_chapter(db.session)
    killer_rows = [Killer(name=f"Killer {i:02d}", chapter_id=chapter.id, power_name="Power") for i in range(killers)]
    survivor_rows = [Survivor(name=f"Survivor {i:02d}", chapter_id=chapter.id) for i in range(survivors)]
    db.session.add_all([*killer_rows, *survivor_rows])
    db.session.flush()
    for row in killer_rows:
        db.session.add_all(Perk(name=f"{row.name} Perk {n}", role="Killer", killer_id=row.id) for n in range(3))
    for row in survivor_rows:
        db.session.add_all(Perk(name=f"{row.name} Perk {n}", role="Survivor", survivor_id=row.id) for n in range(3))
    db.session.add_all(Perk(name=f"General Killer {n}", role="Killer") for n in range(general_perks))
    db.session.add_all(Perk(name=f"General Survivor {n}", role="Survivor") for n in range(general_perks))
    db.session.commit()
    return killer_rows, survivor_rows


def make_user(login: str = "idplayer") -> int:
    user, err = UserService().register_user(login, login, f"{login}@test.com", "Pass1234!")
    assert err is None
    return user.id


def new_run(service: IdPleaseService, user_id: int, difficulty: str = "milestones") -> dict:
    return service.get_or_create_run(user_id, difficulty)


def start(service: IdPleaseService, user_id: int, difficulty: str = "milestones", side: str = "survivor", perks=(0, 1, 2, 3)) -> dict:
    run = new_run(service, user_id, difficulty)
    return service.submit_opening(user_id, run["id"], side, list(perks))


def play(service: IdPleaseService, user_id: int, run: dict, results: list[str]) -> dict:
    for result in results:
        run = service.submit_result(user_id, run["id"], run["current_match"], result)
    return run
