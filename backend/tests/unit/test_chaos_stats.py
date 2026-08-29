# backend/tests/unit/test_chaos_stats.py
import pytest
from sqlalchemy.orm import Session
from app.models import ChaosMatchLog, ChaosRun, User
from app.services.chaos.stats import fetch_chaos_user_stats


@pytest.mark.unit
class TestChaosStats:
    """Tests for aggregating Chaos mode user match statistics and win rates."""

    def test_no_runs_yet_returns_zeroed_stats(self, sample_user: User) -> None:
        stats = fetch_chaos_user_stats(sample_user.id, "hell")
        assert stats == {
            "total_matches": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "recent_logs": [],
        }

    def test_counts_wins_and_losses_for_given_difficulty_only(
        self, db_session: Session, sample_user: User
    ) -> None:
        hell_run = ChaosRun(user_id=sample_user.id, difficulty="hell")
        easy_run = ChaosRun(user_id=sample_user.id, difficulty="easy")
        db_session.add_all([hell_run, easy_run])
        db_session.commit()

        db_session.add_all(
            [
                ChaosMatchLog(
                    run_id=hell_run.id,
                    killer_id="The Trapper",
                    result="win",
                    perks_json="[]",
                    addon_rarities_json="[]",
                    streak_before=0,
                    streak_after=1,
                ),
                ChaosMatchLog(
                    run_id=hell_run.id,
                    killer_id="The Wraith",
                    result="loss",
                    perks_json="[]",
                    addon_rarities_json="[]",
                    streak_before=1,
                    streak_after=0,
                ),
                ChaosMatchLog(
                    run_id=easy_run.id,
                    killer_id="The Hillbilly",
                    result="win",
                    perks_json="[]",
                    addon_rarities_json="[]",
                    streak_before=0,
                    streak_after=1,
                ),
            ]
        )
        db_session.commit()

        stats = fetch_chaos_user_stats(sample_user.id, "hell")
        assert stats["total_matches"] == 2
        assert stats["wins"] == 1
        assert stats["losses"] == 1
        assert stats["win_rate"] == 50.0
        assert len(stats["recent_logs"]) == 2

    def test_stats_isolation_across_different_users(
        self, db_session: Session, sample_user: User
    ) -> None:
        other_user = User(username="other_player", email="other@test.com", password_hash="x")
        db_session.add(other_user)
        db_session.commit()

        user1_run = ChaosRun(user_id=sample_user.id, difficulty="hell")
        user2_run = ChaosRun(user_id=other_user.id, difficulty="hell")
        db_session.add_all([user1_run, user2_run])
        db_session.commit()

        db_session.add(
            ChaosMatchLog(
                run_id=user1_run.id,
                killer_id="The Trapper",
                result="win",
                perks_json="[]",
                addon_rarities_json="[]",
                streak_before=0,
                streak_after=1,
            )
        )
        db_session.add(
            ChaosMatchLog(
                run_id=user2_run.id,
                killer_id="The Nurse",
                result="loss",
                perks_json="[]",
                addon_rarities_json="[]",
                streak_before=0,
                streak_after=0,
            )
        )
        db_session.commit()

        stats1 = fetch_chaos_user_stats(sample_user.id, "hell")
        assert stats1["total_matches"] == 1
        assert stats1["wins"] == 1
        assert stats1["losses"] == 0
        assert stats1["win_rate"] == 100.0

        stats2 = fetch_chaos_user_stats(other_user.id, "hell")
        assert stats2["total_matches"] == 1
        assert stats2["wins"] == 0
        assert stats2["losses"] == 1
        assert stats2["win_rate"] == 0.0

    def test_stats_recent_logs_ordering_descending(
        self, db_session: Session, sample_user: User
    ) -> None:
        run = ChaosRun(user_id=sample_user.id, difficulty="hell")
        db_session.add(run)
        db_session.commit()

        for i in range(12):
            db_session.add(
                ChaosMatchLog(
                    run_id=run.id,
                    killer_id=f"Killer {i}",
                    result="win" if i % 2 == 0 else "loss",
                    perks_json="[]",
                    addon_rarities_json="[]",
                    streak_before=i,
                    streak_after=i + 1 if i % 2 == 0 else 0,
                )
            )
        db_session.commit()

        stats = fetch_chaos_user_stats(sample_user.id, "hell")
        assert stats["total_matches"] == 12
        assert len(stats["recent_logs"]) <= 10
        first_recent = stats["recent_logs"][0]
        assert first_recent["killer_id"] == "Killer 11"
