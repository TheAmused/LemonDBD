# backend/tests/unit/test_history_models.py
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.json_provider import safe_json_dumps
from app.models import HistoryMatchLog, HistoryRun, User


@pytest.mark.unit
class TestHistoryModels:
    """Tests for History mode database models, JSON serialization, and constraints."""

    def test_history_run_round_trip(self, db_session: Session, sample_user: User) -> None:
        run = HistoryRun(
            user_id=sample_user.id,
            mode="medium",
            status="in_progress",
            current_row_index=1,
            total_killers_beaten=6,
            best_killers_beaten=6,
            completed_killers_json=safe_json_dumps(["The Wraith"]),
            unlocked_perk_names_json=safe_json_dumps(["Hex: Ruin", "Save the Best for Last"]),
            checkpoint_row_index=1,
            checkpoint_total_killers_beaten=5,
            checkpoint_completed_killers_json="[]",
            checkpoint_unlocked_perk_names_json=safe_json_dumps(["Hex: Ruin"]),
        )
        db_session.add(run)
        db_session.commit()

        d = run.to_dict()
        assert d["mode"] == "medium"
        assert d["current_row_index"] == 1
        assert d["total_killers_beaten"] == 6
        assert d["completed_killers"] == ["The Wraith"]
        assert d["unlocked_perk_names"] == ["Hex: Ruin", "Save the Best for Last"]
        assert d["checkpoint_row_index"] == 1

    def test_unique_constraint_on_user_and_mode(self, db_session: Session, sample_user: User) -> None:
        db_session.add(HistoryRun(user_id=sample_user.id, mode="hell"))
        db_session.commit()

        db_session.add(HistoryRun(user_id=sample_user.id, mode="hell"))
        with pytest.raises(IntegrityError):
            db_session.commit()

        db_session.rollback()
        assert db_session.is_active

    def test_history_match_log_round_trip(self, db_session: Session, sample_user: User) -> None:
        run = HistoryRun(user_id=sample_user.id, mode="hell")
        db_session.add(run)
        db_session.commit()

        log = HistoryMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            row_index=0,
            streak_before=0,
            streak_after=1,
        )
        db_session.add(log)
        db_session.commit()

        d = log.to_dict()
        assert d["killer_id"] == "The Trapper"
        assert d["result"] == "win"
        assert d["row_index"] == 0
        assert d["streak_after"] == 1
