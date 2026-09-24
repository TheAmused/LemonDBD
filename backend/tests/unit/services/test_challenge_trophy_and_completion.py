# backend/tests/unit/services/test_challenge_trophy_and_completion.py
"""Unit tests for challenge-completion trophy rules, active-run tracking,
roster-milestone detection, gauntlet tier logic, gauntlet roll logic,
chaos perk draw, chaos checkpoint intervals, and history row-builder.

Pattern: each group of DB-touching tests shares a minimal in-memory SQLite
fixture built with create_app() + db.create_all().  Pure-logic functions (no
DB access) are called directly without any fixture.

All tests are marked @pytest.mark.unit.
"""
from __future__ import annotations

import pytest
from flask import Flask

from app import create_app
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.user import User
from app.models.chaos import ChaosRun
from app.models.gauntlet import GauntletRun
from app.models.history import HistoryRun
from app.models.challenge_completion import ChallengeCompletionRecord
from app.models.character import Killer, Survivor
from app.services.challenge_completions import (
    fetch_completed_variants_by_mode,
    fetch_completion_counts_by_mode,
    fetch_full_roster_counts_by_mode,
    fetch_active_run_variants_by_mode,
)
from app.services.roster_milestone import get_full_roster_milestone
from app.services.gauntlet.constants import (
    get_tier_info,
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
)
from app.services.gauntlet.roller import roll_gauntlet_target
from app.services.chaos.constants import checkpoint_interval
from app.services.chaos.roller import draw_chaos_perks
from app.services.history.roster import build_rows


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _make_app() -> Flask:
    """Return a configured Flask app backed by an isolated in-memory SQLite DB."""
    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    return test_app


def _make_user(username: str = "tester") -> User:
    user = User(
        username=username,
        email=f"{username}@test.com",
        password_hash="hashed",
        role="user",
    )
    db.session.add(user)
    db.session.flush()
    return user


def _make_chapter() -> Chapter:
    """Insert and return a minimal Chapter row (required FK for Killer/Survivor)."""
    chapter = Chapter(name="Base Game", dlc_type="base_game")
    db.session.add(chapter)
    db.session.flush()
    return chapter


def _make_killer(chapter_id: int, name: str = "The Trapper") -> Killer:
    killer = Killer(
        name=name,
        chapter_id=chapter_id,
        power_name="Bear Trap",
        power_description="",
        is_disabled=False,
    )
    db.session.add(killer)
    db.session.flush()
    return killer


def _make_survivor(chapter_id: int, name: str = "Meg Thomas") -> Survivor:
    survivor = Survivor(
        name=name,
        chapter_id=chapter_id,
        is_disabled=False,
    )
    db.session.add(survivor)
    db.session.flush()
    return survivor


# ---------------------------------------------------------------------------
# Fixture: minimal app for trophy / completion tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def completion_app() -> Flask:
    """App with a single user and db schema; no completion records pre-seeded."""
    app = _make_app()
    with app.app_context():
        db.create_all()
        _make_user()
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


# ---------------------------------------------------------------------------
# Rule 1 – Yellow vs Red trophy
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_yellow_completion_appears_in_completed_variants(completion_app: Flask) -> None:
    """full_roster=False → yellow; fetch_completed_variants_by_mode includes it."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=10,
            unlocked_characters_count=5, full_roster=False,
        ))
        db.session.commit()

        result = fetch_completed_variants_by_mode(user.id)

        assert "chaos" in result
        assert "easy" in result["chaos"]


@pytest.mark.unit
def test_red_completion_appears_in_completed_variants(completion_app: Flask) -> None:
    """full_roster=True → red; fetch_completed_variants_by_mode also includes it."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="chaos", variant="hell",
            attempts_taken=2, matches_played=30,
            unlocked_characters_count=20, full_roster=True,
        ))
        db.session.commit()

        result = fetch_completed_variants_by_mode(user.id)

        assert "chaos" in result
        assert "hell" in result["chaos"]


@pytest.mark.unit
def test_full_roster_counts_excludes_yellow_only_record(completion_app: Flask) -> None:
    """fetch_full_roster_counts_by_mode must NOT include yellow-only completions."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        # Yellow-only record
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=10,
            unlocked_characters_count=5, full_roster=False,
        ))
        db.session.commit()

        full_result = fetch_full_roster_counts_by_mode(user.id)
        any_result = fetch_completion_counts_by_mode(user.id)

        # Yellow record IS visible in the any-roster query
        assert "chaos" in any_result
        assert "easy" in any_result["chaos"]
        # But NOT in the full-roster query
        assert "chaos" not in full_result


@pytest.mark.unit
def test_completion_counts_includes_both_yellow_and_red(completion_app: Flask) -> None:
    """fetch_completion_counts_by_mode returns both yellow and red records."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=5,
            unlocked_characters_count=5, full_roster=False,
        ))
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="chaos", variant="hell",
            attempts_taken=3, matches_played=30,
            unlocked_characters_count=20, full_roster=True,
        ))
        db.session.commit()

        result = fetch_completion_counts_by_mode(user.id)

        assert "easy" in result.get("chaos", {})
        assert "hell" in result.get("chaos", {})


# ---------------------------------------------------------------------------
# Rule 2 – No server-side cascade (backend stores each variant independently)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_hell_completion_does_not_auto_insert_easy_row(completion_app: Flask) -> None:
    """Recording a hell completion must NOT auto-insert any row for easy."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=30,
            unlocked_characters_count=20, full_roster=False,
        ))
        db.session.commit()

        variants = fetch_completed_variants_by_mode(user.id)
        chaos_variants = variants.get("chaos", [])

        assert "hell" in chaos_variants
        assert "easy" not in chaos_variants


# ---------------------------------------------------------------------------
# Rule 3 – unlocked_characters_count (number next to the trophy)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_yellow_unlocked_count_returned_by_completion_counts(completion_app: Flask) -> None:
    """Yellow record with unlocked_characters_count=8 → 8 from fetch_completion_counts_by_mode."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="gauntlet", variant="killer_original",
            attempts_taken=1, matches_played=43,
            unlocked_characters_count=8, full_roster=False,
        ))
        db.session.commit()

        counts = fetch_completion_counts_by_mode(user.id)

        assert counts["gauntlet"]["killer_original"] == 8


@pytest.mark.unit
def test_red_unlocked_count_returned_by_full_roster_counts(completion_app: Flask) -> None:
    """Red record with unlocked_characters_count=10 → 10 from fetch_full_roster_counts_by_mode."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="gauntlet", variant="killer_original",
            attempts_taken=2, matches_played=43,
            unlocked_characters_count=10, full_roster=True,
        ))
        db.session.commit()

        counts = fetch_full_roster_counts_by_mode(user.id)

        assert counts["gauntlet"]["killer_original"] == 10


@pytest.mark.unit
def test_most_recent_completion_wins_for_count(completion_app: Flask) -> None:
    """When both yellow (8) and red (10) records exist, completion_counts returns
    the latest (red=10) count; yellow count (8) is present but superseded."""
    with completion_app.app_context():
        user = db.session.query(User).first()
        # Insert yellow first (older)
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="gauntlet", variant="killer_original",
            attempts_taken=1, matches_played=43,
            unlocked_characters_count=8, full_roster=False,
        ))
        db.session.flush()
        # Insert red second (newer) – higher id ensures most-recent ordering wins
        db.session.add(ChallengeCompletionRecord(
            user_id=user.id, mode="gauntlet", variant="killer_original",
            attempts_taken=2, matches_played=43,
            unlocked_characters_count=10, full_roster=True,
        ))
        db.session.commit()

        counts = fetch_completion_counts_by_mode(user.id)
        full_counts = fetch_full_roster_counts_by_mode(user.id)

        # Both queries should return the most-recent count (10) for this variant
        assert counts["gauntlet"]["killer_original"] == 10
        assert full_counts["gauntlet"]["killer_original"] == 10


# ---------------------------------------------------------------------------
# Fixture: app for active-run tracking tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def active_run_app() -> Flask:
    app = _make_app()
    with app.app_context():
        db.create_all()
        _make_user()
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


# ---------------------------------------------------------------------------
# Rule 4 – fetch_active_run_variants_by_mode
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_in_progress_gauntlet_appears_under_gauntlet_key(active_run_app: Flask) -> None:
    """GauntletRun with status=in_progress, role=killer, game_mode=original
    appears under 'gauntlet' key as 'killer_original'."""
    with active_run_app.app_context():
        user = db.session.query(User).first()
        db.session.add(GauntletRun(
            user_id=user.id, role="killer", game_mode="original",
            current_character_id="The Trapper",
            status="in_progress",
        ))
        db.session.commit()

        result = fetch_active_run_variants_by_mode(user.id)

        assert "gauntlet" in result
        assert "killer_original" in result["gauntlet"]


@pytest.mark.unit
def test_in_progress_chaos_appears_under_chaos_key(active_run_app: Flask) -> None:
    """ChaosRun with status=in_progress, difficulty=easy → 'chaos' key with 'easy'."""
    with active_run_app.app_context():
        user = db.session.query(User).first()
        db.session.add(ChaosRun(
            user_id=user.id, difficulty="easy",
            status="in_progress",
        ))
        db.session.commit()

        result = fetch_active_run_variants_by_mode(user.id)

        assert "chaos" in result
        assert "easy" in result["chaos"]


@pytest.mark.unit
def test_completed_runs_do_not_appear_in_active_variants(active_run_app: Flask) -> None:
    """Runs with status='completed' must NOT appear in fetch_active_run_variants_by_mode."""
    with active_run_app.app_context():
        user = db.session.query(User).first()
        db.session.add(GauntletRun(
            user_id=user.id, role="killer", game_mode="original",
            current_character_id="The Trapper",
            status="completed",
        ))
        db.session.add(ChaosRun(
            user_id=user.id, difficulty="easy",
            status="completed",
        ))
        db.session.commit()

        result = fetch_active_run_variants_by_mode(user.id)

        assert "gauntlet" not in result
        assert "chaos" not in result


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


# ---------------------------------------------------------------------------
# Rule 8 – Chaos draw_chaos_perks (pure logic)
# ---------------------------------------------------------------------------

def _fake_perks(names: list[str]) -> list[dict]:
    return [{"name": n, "description": ""} for n in names]


@pytest.mark.unit
def test_draw_chaos_perks_draws_exactly_4() -> None:
    pool = _fake_perks([f"Perk{i}" for i in range(20)])
    drawn, _ = draw_chaos_perks(pool, [])
    assert len(drawn) == 4


@pytest.mark.unit
def test_draw_chaos_perks_excludes_used_names() -> None:
    """No perk already in used_perk_names appears in the draw (pool large enough)."""
    all_names = [f"Perk{i}" for i in range(20)]
    used_names = all_names[:10]  # first 10 are "used"
    pool = _fake_perks(all_names)

    drawn, _ = draw_chaos_perks(pool, used_names)

    drawn_names = {p["name"] for p in drawn}
    assert drawn_names.isdisjoint(set(used_names))


@pytest.mark.unit
def test_draw_chaos_perks_returns_updated_used_list() -> None:
    """The returned used list includes all 4 drawn perk names."""
    pool = _fake_perks([f"Perk{i}" for i in range(20)])
    drawn, updated_used = draw_chaos_perks(pool, [])

    drawn_names = {p["name"] for p in drawn}
    assert drawn_names.issubset(set(updated_used))
    # The updated list must have at least the 4 new names
    assert len(updated_used) >= 4


@pytest.mark.unit
def test_draw_chaos_perks_resets_pool_when_exhausted_mid_draw() -> None:
    """When only 2 eligible perks remain, the pool resets so drawing can finish to 4."""
    # Give a pool of 4, but pre-use 2 → only 2 eligible before reset
    all_names = ["A", "B", "C", "D"]
    pool = _fake_perks(all_names)
    used = ["A", "B"]  # 2 eligible remain before reset

    drawn, updated_used = draw_chaos_perks(pool, used)

    assert len(drawn) == 4
    # All drawn perks must be from the pool
    drawn_names = [p["name"] for p in drawn]
    for name in drawn_names:
        assert name in all_names


# ---------------------------------------------------------------------------
# Rule 9 – Chaos checkpoint_interval (pure logic)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_checkpoint_interval_easy_is_5() -> None:
    assert checkpoint_interval("easy") == 5


@pytest.mark.unit
def test_checkpoint_interval_medium_is_10() -> None:
    assert checkpoint_interval("medium") == 10


@pytest.mark.unit
def test_checkpoint_interval_hell_is_0() -> None:
    assert checkpoint_interval("hell") == 0


# ---------------------------------------------------------------------------
# Rule 10 – History build_rows (pure logic, ROW_SIZE=5)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_build_rows_splits_into_rows_of_five() -> None:
    """build_rows(['A','B','C','D','E','F']) → [['A','B','C','D','E'],['F']]."""
    result = build_rows(["A", "B", "C", "D", "E", "F"])
    assert result == [["A", "B", "C", "D", "E"], ["F"]]


@pytest.mark.unit
def test_build_rows_empty_list_returns_empty() -> None:
    """build_rows([]) → []."""
    assert build_rows([]) == []
