# backend/tests/unit/test_minigame_service.py
from datetime import date
import pytest
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.perk import Perk
from app.models.map import Realm
from app.services.minigame_service import MinigameService


@pytest.fixture
def seeded_minigame_data(app, test_db):
    """Seed test chapter, survivor, killer, perk, and realm."""
    chap = Chapter(
        id=1,
        name="Base Game",
        release_date=date(2016, 6, 14),
        release_year=2016,
        is_licensed=False,
        dlc_type="base_game",
    )
    db.session.add(chap)
    db.session.flush()

    surv = Survivor(
        id=1,
        name="Dwight Fairfield",
        real_name="Dwight Fairfield",
        chapter_id=1,
    )
    db.session.add(surv)

    killer = Killer(
        id=1,
        name="The Trapper",
        real_name="Evan MacMillan",
        chapter_id=1,
        power_name="Bear Trap",
        movement_speed_ms=4.6,
        terror_radius="32 metres",
        terror_radius_meters=32,
        height="Tall",
    )
    db.session.add(killer)

    perk = Perk(
        id=1,
        name="Sprint Burst",
        role="Survivor",
        is_teachable=True,
        survivor_id=1,
        perk_types=["exhaustion"],
    )
    db.session.add(perk)

    realm = Realm(
        id=1,
        name="The MacMillan Estate",
    )
    db.session.add(realm)
    db.session.commit()


def test_get_or_create_daily_caches_in_db(app, test_db, seeded_minigame_data):
    service = MinigameService()
    d = date(2026, 9, 29)

    challenge1 = service.get_or_create_daily(game_mode="classic", target_date=d)
    assert challenge1 is not None
    assert challenge1["game_mode"] == "classic"
    assert len(challenge1["rounds"]) >= 1

    # Second call should fetch cached challenge with same ID
    challenge2 = service.get_or_create_daily(game_mode="classic", target_date=d)
    assert challenge1["id"] == challenge2["id"]


def test_classic_evaluation_correct(app, test_db, seeded_minigame_data):
    service = MinigameService()
    round_data = {
        "mode": "classic_character",
        "target_type": "killer",
        "target_id": 1,
        "max_attempts": 6,
    }

    result = service.evaluate_guess(
        round_data=round_data,
        guess_type="killer",
        guess_id=1,
        attempt_number=1,
    )

    assert result["is_correct"] is True
    assert result["attributes"]["role"] == "correct"
    assert result["attributes"]["gender"] == "correct"
    assert result["attributes"]["release_year"]["status"] == "correct"


def test_classic_evaluation_incorrect(app, test_db, seeded_minigame_data):
    service = MinigameService()
    round_data = {
        "mode": "classic_character",
        "target_type": "killer",
        "target_id": 1,
        "max_attempts": 6,
    }

    result = service.evaluate_guess(
        round_data=round_data,
        guess_type="survivor",
        guess_id=1,
        attempt_number=1,
    )

    assert result["is_correct"] is False
    assert result["attributes"]["role"] == "incorrect"
    assert result["attributes"]["gender"] == "correct"  # Both Dwight and Trapper are male
    assert result["attributes"]["release_year"]["status"] == "correct"


def test_realm_evaluation(app, test_db, seeded_minigame_data):
    service = MinigameService()
    round_data = {
        "mode": "realm_guesser",
        "target_type": "realm",
        "target_id": 1,
        "max_attempts": 6,
    }

    # Wrong guess
    res_wrong = service.evaluate_guess(round_data, "realm", 999, attempt_number=1)
    assert res_wrong["is_correct"] is False

    # Correct guess
    res_correct = service.evaluate_guess(round_data, "realm", 1, attempt_number=2)
    assert res_correct["is_correct"] is True


def test_classic_perk_evaluation(app, test_db, seeded_minigame_data):
    service = MinigameService()
    round_data = {
        "mode": "classic_perk",
        "target_type": "perk",
        "target_id": 1,
        "max_attempts": 6,
    }

    res_correct = service.evaluate_guess(round_data, "perk", 1, attempt_number=1)
    assert res_correct["is_correct"] is True
    assert res_correct["attributes"]["role"]["status"] == "correct"
    assert res_correct["attributes"]["character_name"]["status"] == "correct"
    assert res_correct["attributes"]["is_teachable"]["status"] == "correct"
