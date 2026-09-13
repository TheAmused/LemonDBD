# backend/tests/unit/test_challenge_completions.py
import pytest
from sqlalchemy.orm import Session

from app.models import ChallengeCompletionRecord, ChaosRun, GauntletRun, HistoryRun, User
from app.services.challenge_completions import (
    delete_completions,
    fetch_active_run_variants_by_mode,
    fetch_completed_variants,
    fetch_completed_variants_by_mode,
    fetch_completion_counts_by_mode,
    fetch_full_roster_counts_by_mode,
    record_challenge_completion,
)


@pytest.mark.unit
class TestChallengeCompletions:
    """Tests for the shared completion-history helpers backing "already won" badges."""

    def test_fetch_completed_variants_by_mode_groups_distinct_rows(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2,
        )
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=2, matches_played=5, unlocked_characters_count=2,
        )
        record_challenge_completion(
            user_id=sample_user.id, mode="gauntlet", variant="killer_original",
            attempts_taken=1, matches_played=4, unlocked_characters_count=2,
        )
        db_session.commit()

        status = fetch_completed_variants_by_mode(sample_user.id)
        assert set(status["chaos"]) == {"easy", "hell"}
        assert status["gauntlet"] == ["killer_original"]
        assert "history" not in status

    def test_fetch_completed_variants_scopes_to_one_mode(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="history", variant="medium",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2,
        )
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="medium",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2,
        )
        db_session.commit()

        assert fetch_completed_variants(sample_user.id, "history") == {"medium"}

    def test_completions_are_isolated_per_user(
        self, db_session: Session, sample_user: User
    ) -> None:
        other = User(username="other_completer", email="other_c@test.com", password_hash="x")
        db_session.add(other)
        db_session.commit()

        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2,
        )
        db_session.commit()

        assert fetch_completed_variants(other.id, "chaos") == set()

    def test_delete_completions_only_touches_the_given_mode(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="page_streak", variant="The Trapper",
            attempts_taken=1, matches_played=3, unlocked_characters_count=0,
        )
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2,
        )
        db_session.commit()

        delete_completions(sample_user.id, "page_streak")
        db_session.commit()

        assert fetch_completed_variants(sample_user.id, "page_streak") == set()
        assert fetch_completed_variants(sample_user.id, "chaos") == {"hell"}
        assert db_session.query(ChallengeCompletionRecord).count() == 1


@pytest.mark.unit
class TestCompletionCounts:
    """Tests for the killer count shown next to the normal (gold) badge,
    regardless of whether the clear was a full-roster one."""

    def test_reports_the_count_for_any_completion(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2, full_roster=False,
        )
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=5, full_roster=True,
        )
        db_session.commit()

        counts = fetch_completion_counts_by_mode(sample_user.id)
        assert counts == {"chaos": {"easy": 2, "hell": 5}}

    def test_the_most_recent_completion_wins_the_frozen_count(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=5, full_roster=False,
        )
        db_session.commit()
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=8, full_roster=False,
        )
        db_session.commit()

        counts = fetch_completion_counts_by_mode(sample_user.id)
        assert counts["chaos"]["hell"] == 8

    def test_no_completions_returns_empty(self, db_session: Session, sample_user: User) -> None:
        assert fetch_completion_counts_by_mode(sample_user.id) == {}


@pytest.mark.unit
class TestFullRosterCounts:
    """Tests for the red 'full roster' card badge lookup and its frozen count."""

    def test_only_full_roster_completions_are_reported(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2, full_roster=False,
        )
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=5, full_roster=True,
        )
        db_session.commit()

        counts = fetch_full_roster_counts_by_mode(sample_user.id)
        assert counts == {"chaos": {"hell": 5}}

    def test_the_most_recent_completion_wins_the_frozen_count(
        self, db_session: Session, sample_user: User
    ) -> None:
        """A hardest-tier variant (unlike page-streak's roster_complete) can
        be re-completed after a reset -- the badge should reflect whichever
        completion happened last, not the first."""
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=5, full_roster=True,
        )
        db_session.commit()
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="hell",
            attempts_taken=1, matches_played=3, unlocked_characters_count=6, full_roster=True,
        )
        db_session.commit()

        counts = fetch_full_roster_counts_by_mode(sample_user.id)
        assert counts["chaos"]["hell"] == 6

    def test_no_full_roster_completions_returns_empty(
        self, db_session: Session, sample_user: User
    ) -> None:
        record_challenge_completion(
            user_id=sample_user.id, mode="chaos", variant="easy",
            attempts_taken=1, matches_played=3, unlocked_characters_count=2, full_roster=False,
        )
        db_session.commit()

        assert fetch_full_roster_counts_by_mode(sample_user.id) == {}


@pytest.mark.unit
class TestActiveRunVariants:
    """Tests for the in-progress-run lookup that lets the frontend tell a
    finished tier apart from one being replayed after a reset."""

    def test_only_in_progress_runs_are_reported(
        self, db_session: Session, sample_user: User
    ) -> None:
        db_session.add_all([
            ChaosRun(user_id=sample_user.id, difficulty="medium", status="in_progress"),
            ChaosRun(user_id=sample_user.id, difficulty="hell", status="completed"),
            HistoryRun(user_id=sample_user.id, mode="hell", status="in_progress"),
            GauntletRun(
                user_id=sample_user.id, role="killer", game_mode="original",
                current_character_id="The Trapper", status="in_progress",
            ),
        ])
        db_session.commit()

        active = fetch_active_run_variants_by_mode(sample_user.id)
        assert active["chaos"] == ["medium"]
        assert active["history"] == ["hell"]
        assert active["gauntlet"] == ["killer_original"]

    def test_no_active_runs_omits_the_mode_key(
        self, db_session: Session, sample_user: User
    ) -> None:
        db_session.add(ChaosRun(user_id=sample_user.id, difficulty="hell", status="completed"))
        db_session.commit()

        active = fetch_active_run_variants_by_mode(sample_user.id)
        assert "chaos" not in active
        assert active == {}

    def test_active_runs_are_isolated_per_user(
        self, db_session: Session, sample_user: User
    ) -> None:
        other = User(username="other_active_runner", email="other_ar@test.com", password_hash="x")
        db_session.add(other)
        db_session.commit()

        db_session.add(ChaosRun(user_id=sample_user.id, difficulty="hell", status="in_progress"))
        db_session.commit()

        assert fetch_active_run_variants_by_mode(other.id) == {}
