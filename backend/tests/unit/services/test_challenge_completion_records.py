# backend/tests/unit/services/test_challenge_completion_records.py
"""Yellow / red completion trophies and in-progress run tracking. Each DB-touching group uses a minimal in-memory SQLite app."""
from __future__ import annotations
import pytest
from flask import Flask
from app.core.extensions import db
from app.models.user import User
from app.models.chaos import ChaosRun
from app.models.gauntlet import GauntletRun
from app.models.challenge_completion import ChallengeCompletionRecord
from app.services.challenge_completions import (
    fetch_completed_variants_by_mode,
    fetch_completion_counts_by_mode,
    fetch_full_roster_counts_by_mode,
    fetch_active_run_variants_by_mode,
)
from tests.unit.challenge_trophy_support import (
    _make_app,
    _make_user,
)


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
