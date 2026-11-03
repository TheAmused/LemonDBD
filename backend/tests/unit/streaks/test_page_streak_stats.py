# backend/tests/unit/streaks/test_page_streak_stats.py
import pytest
from sqlalchemy.orm import Session
from app.models import PageStreakPageLog, PageStreakRun, User
from app.services.page_streak.stats import fetch_page_streak_user_stats


@pytest.mark.unit
class TestPageStreakStats:
    """Page Streak keeps one run per killer, and every killer's stats are its own."""

    def test_no_run_for_the_killer_returns_zeroed_stats(self, sample_user: User) -> None:
        stats = fetch_page_streak_user_stats(sample_user.id, "The Trapper")
        assert stats == {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

    def test_counts_only_the_requested_killers_matches(self, db_session: Session, sample_user: User) -> None:
        # The totals live on the run (old logs get pruned), so they are set here along with the logs.
        trapper = PageStreakRun(user_id=sample_user.id, killer="The Trapper", total_wins=2, total_losses=1)
        wraith = PageStreakRun(user_id=sample_user.id, killer="The Wraith", total_wins=1)
        db_session.add_all([trapper, wraith])
        db_session.commit()

        db_session.add_all(
            [
                PageStreakPageLog(run_id=trapper.id, attempt=1, page_number=1, perks=[], result="win"),
                PageStreakPageLog(run_id=trapper.id, attempt=1, page_number=2, perks=[], result="win"),
                PageStreakPageLog(run_id=trapper.id, attempt=1, page_number=3, perks=[], result="loss"),
                PageStreakPageLog(run_id=wraith.id, attempt=1, page_number=1, perks=[], result="win"),
            ]
        )
        db_session.commit()

        stats = fetch_page_streak_user_stats(sample_user.id, "The Trapper")
        assert (stats["total_matches"], stats["wins"], stats["losses"]) == (3, 2, 1)
        assert stats["win_rate"] == pytest.approx(66.7)
        assert len(stats["recent_logs"]) == 3
        assert {log["killer"] for log in stats["recent_logs"]} == {"The Trapper"}

        other = fetch_page_streak_user_stats(sample_user.id, "The Wraith")
        assert (other["total_matches"], other["wins"], other["losses"]) == (1, 1, 0)
        assert {log["killer"] for log in other["recent_logs"]} == {"The Wraith"}
