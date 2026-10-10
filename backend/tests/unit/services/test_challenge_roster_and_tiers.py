# backend/tests/unit/services/test_challenge_roster_and_tiers.py
"""Roster-milestone detection, gauntlet tier info and gauntlet target rolling."""
from __future__ import annotations
import pytest
from flask import Flask
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer
from app.services.roster_milestone import get_full_roster_milestone
from app.services.gauntlet.constants import (
    get_tier_info,
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
)
from app.services.gauntlet.roller import roll_gauntlet_target
from tests.unit.challenge_trophy_support import (
    _make_app,
    _make_chapter,
    _make_killer,
)


# ---------------------------------------------------------------------------
# Fixture: app with Killer rows for roster-milestone tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def roster_app() -> Flask:
    """App seeded with a Chapter and three Killer rows for milestone checks."""
    app = _make_app()
    with app.app_context():
        db.create_all()
        chapter = _make_chapter()
        # Three killers; ids will be 1, 2, 3 in insertion order
        _make_killer(chapter.id, "Alpha Killer")
        _make_killer(chapter.id, "Beta Killer")
        _make_killer(chapter.id, "Gamma Killer")
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


# ---------------------------------------------------------------------------
# Rule 5 – get_full_roster_milestone
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_milestone_full_roster_owned_equals_total(roster_app: Flask) -> None:
    """Owned IDs == every killer the app knows about → (True, N).

    The seeder populates real killers at app startup; this test uses ALL of
    them so owned_count == game_total, regardless of the exact number.
    """
    with roster_app.app_context():
        all_killers = db.session.query(Killer).all()
        owned_ids = [k.id for k in all_killers]  # every killer in DB

        is_full, total = get_full_roster_milestone(owned_ids, role="Killer")

        assert is_full is True
        assert total == len(owned_ids)


@pytest.mark.unit
def test_milestone_partial_roster_returns_false(roster_app: Flask) -> None:
    """Owning a strict subset of same-timestamp killers → (False, N).

    get_full_roster_milestone computes `game_total` as the count of killers
    with `created_at <= max(owned_created_at)`. Two killers forced to the
    same timestamp means the cutoff includes both regardless of which one
    is in the owned set, so owning only 1 of the 2 gives (False, 2).
    """
    from datetime import datetime, timezone
    from sqlalchemy import update

    with roster_app.app_context():
        # Create two killers and force them to share an identical created_at.
        chapter = db.session.query(Chapter).first()
        k_a = Killer(name="__Twin A__", chapter_id=chapter.id, power_name="PA")
        k_b = Killer(name="__Twin B__", chapter_id=chapter.id, power_name="PB")
        db.session.add_all([k_a, k_b])
        db.session.flush()

        # Push both far into the future so no seeded killer shares the timestamp.
        shared_ts = datetime(2099, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        db.session.execute(
            update(Killer)
            .where(Killer.id.in_([k_a.id, k_b.id]))
            .values(created_at=shared_ts)
        )
        db.session.commit()

        # Own only k_a (not k_b). Both share the same created_at = shared_ts.
        # cutoff = max(owned ts) = shared_ts → game_total counts ALL killers with
        # created_at <= shared_ts (includes seeded killers AND k_b). owned = 1.
        # Since total includes at least k_a and k_b, total >= 2 and 1 < total → False.
        is_full, total = get_full_roster_milestone([k_a.id], role="Killer")

        assert is_full is False
        assert total >= 2  # at minimum k_a + k_b are counted


@pytest.mark.unit
def test_milestone_empty_owned_list_returns_false_zero(roster_app: Flask) -> None:
    """Empty owned list → (False, 0)."""
    with roster_app.app_context():
        is_full, total = get_full_roster_milestone([], role="Killer")

        assert is_full is False
        assert total == 0


# ---------------------------------------------------------------------------
# Rule 6 – Gauntlet get_tier_info (pure logic, no DB)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_tier_info_killer_streak_0_is_bloodbath() -> None:
    info = get_tier_info(streak=0, role="killer")
    assert info["tier_level"] == 0
    assert info["name"] == "The Bloodbath"
    assert info["perk_limit"] == 3


@pytest.mark.unit
def test_tier_info_killer_streak_10_is_obsession() -> None:
    info = get_tier_info(streak=10, role="killer")
    assert info["tier_level"] == 1
    assert info["name"] == "The Obsession"
    assert info["perk_limit"] == 2


@pytest.mark.unit
def test_tier_info_killer_streak_30_is_entity() -> None:
    info = get_tier_info(streak=30, role="killer")
    assert info["tier_level"] == 3
    assert info["name"] == "The Entity"
    assert info["perk_limit"] == 0


@pytest.mark.unit
def test_tier_info_survivor_streak_0_is_warm_up() -> None:
    info = get_tier_info(streak=0, role="survivor")
    assert info["tier_level"] == 0
    assert info["name"] == "The Warm Up"
    assert info["perk_limit"] == 4


@pytest.mark.unit
def test_tier_info_survivor_streak_40_is_legend() -> None:
    info = get_tier_info(streak=40, role="survivor")
    assert info["tier_level"] == 4
    assert info["name"] == "The Legend"
    assert info["perk_limit"] == 0


@pytest.mark.unit
def test_tier_info_killer_roster_limit_is_43() -> None:
    info = get_tier_info(streak=0, role="killer")
    assert info["roster_limit"] == ORIGINAL_KILLER_ROSTER_LIMIT
    assert ORIGINAL_KILLER_ROSTER_LIMIT == 43


@pytest.mark.unit
def test_tier_info_survivor_roster_limit_is_52() -> None:
    info = get_tier_info(streak=0, role="survivor")
    assert info["roster_limit"] == ORIGINAL_SURVIVOR_ROSTER_LIMIT
    assert ORIGINAL_SURVIVOR_ROSTER_LIMIT == 52


# ---------------------------------------------------------------------------
# Rule 7 – Gauntlet roll_gauntlet_target (needs app context for build_loadout
#           → get_character_teachable_perks DB call, even if result is empty)
# ---------------------------------------------------------------------------

@pytest.fixture()
def roll_app() -> Flask:
    """Minimal app context for roll_gauntlet_target; no characters needed because
    the test characters ('A', 'B', 'C') have no DB rows, so perk lookup returns []."""
    app = _make_app()
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_roll_gauntlet_target_picks_only_remaining(roll_app: Flask) -> None:
    """owned=['A','B','C'], completed=['A','B'], target=None → always picks 'C'."""
    with roll_app.app_context():
        for _ in range(10):  # repeat to rule out random luck
            target, loadout, tier_info = roll_gauntlet_target(
                role="killer",
                current_streak=0,
                completed_characters=["A", "B"],
                owned_characters=["A", "B", "C"],
                target_character=None,
            )
            assert target == "C"
            assert loadout["character"] == "C"


@pytest.mark.unit
def test_roll_gauntlet_target_fallback_when_all_completed(roll_app: Flask) -> None:
    """When completed == owned (all done), falls back to the full pool."""
    with roll_app.app_context():
        owned = ["A", "B", "C"]
        for _ in range(20):
            target, _, _ = roll_gauntlet_target(
                role="killer",
                current_streak=0,
                completed_characters=list(owned),  # every one beaten
                owned_characters=owned,
                target_character=None,
            )
            assert target in owned
