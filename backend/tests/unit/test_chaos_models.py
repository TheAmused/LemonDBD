# backend/tests/unit/test_chaos_models.py
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models import ChaosMatchLog, ChaosRun, User


@pytest.mark.unit
class TestChaosModels:
    """Exhaustive tests for ChaosRun and ChaosMatchLog models, serialization, and constraints."""

    def test_chaos_run_round_trip(self, db_session: Session, sample_user: User) -> None:
        run = ChaosRun(
            user_id=sample_user.id,
            difficulty="hell",
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers=[],
            checkpoint_killers=[],
            used_perks=["Hex: Ruin"],
            checkpoint_used_perks=[],
            current_perks=[{"name": "Hex: Ruin"}],
            current_addon_rarities=["Rare", "Rare"],
            perks_revealed=False,
        )
        db_session.add(run)
        db_session.commit()

        d = run.to_dict()
        assert d["difficulty"] == "hell"
        assert d["status"] == "in_progress"
        assert d["used_perks"] == ["Hex: Ruin"]
        assert d["current_perks"] == [{"name": "Hex: Ruin"}]
        assert d["current_addon_rarities"] == ["Rare", "Rare"]
        assert d["perks_revealed"] is False
        assert d["completed_killers"] == []
        assert d["checkpoint_killers"] == []

    def test_in_place_list_change_is_persisted(self, db_session: Session, sample_user: User) -> None:
        # Services read a list, append to it and assign the same object back;
        # a plain JSON column would see no change and skip the UPDATE.
        run = ChaosRun(user_id=sample_user.id, difficulty="easy")
        db_session.add(run)
        db_session.commit()

        completed = run.completed_killers
        completed.append("The Trapper")
        run.completed_killers = completed
        db_session.commit()
        db_session.expire_all()

        assert db_session.get(ChaosRun, run.id).completed_killers == ["The Trapper"]

    def test_chaos_run_default_field_values(self, db_session: Session, sample_user: User) -> None:
        run = ChaosRun(user_id=sample_user.id, difficulty="medium")
        db_session.add(run)
        db_session.commit()

        assert run.id is not None
        assert run.difficulty == "medium"
        assert run.current_streak == 0
        assert run.best_streak == 0
        assert run.last_checkpoint_streak == 0
        assert run.status == "in_progress"
        assert run.perks_revealed is False

        run_dict = run.to_dict()
        assert run_dict["user_id"] == sample_user.id
        assert run_dict["difficulty"] == "medium"
        assert isinstance(run_dict["current_perks"], list)
        assert isinstance(run_dict["current_addon_rarities"], list)

    def test_unique_constraint_on_user_and_difficulty(self, db_session: Session, sample_user: User) -> None:
        run1 = ChaosRun(user_id=sample_user.id, difficulty="hell")
        db_session.add(run1)
        db_session.commit()

        run2 = ChaosRun(user_id=sample_user.id, difficulty="hell")
        db_session.add(run2)
        with pytest.raises(IntegrityError):
            db_session.commit()

        db_session.rollback()
        assert db_session.is_active

    def test_multiple_difficulties_for_same_user_allowed(self, db_session: Session, sample_user: User) -> None:
        hell_run = ChaosRun(user_id=sample_user.id, difficulty="hell")
        easy_run = ChaosRun(user_id=sample_user.id, difficulty="easy")
        medium_run = ChaosRun(user_id=sample_user.id, difficulty="medium")
        db_session.add_all([hell_run, easy_run, medium_run])
        db_session.commit()

        assert hell_run.id != easy_run.id != medium_run.id

    def test_chaos_match_log_round_trip(self, db_session: Session, sample_user: User) -> None:
        run = ChaosRun(user_id=sample_user.id, difficulty="easy")
        db_session.add(run)
        db_session.commit()

        log = ChaosMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            perks=[{"name": "Hex: Ruin"}],
            addon_rarities=["Common", "Rare"],
            streak_before=0,
            streak_after=1,
            triggered_by="match",
        )
        db_session.add(log)
        db_session.commit()

        d = log.to_dict()
        assert d["id"] == log.id
        assert d["run_id"] == run.id
        assert d["killer_id"] == "The Trapper"
        assert d["result"] == "win"
        assert d["perks"] == [{"name": "Hex: Ruin"}]
        assert d["addon_rarities"] == ["Common", "Rare"]
        assert d["streak_before"] == 0
        assert d["streak_after"] == 1
        assert d["triggered_by"] == "match"
        assert "timestamp" in d or "created_at" in d

    def test_chaos_match_log_inactivity_loss(self, db_session: Session, sample_user: User) -> None:
        run = ChaosRun(user_id=sample_user.id, difficulty="hell", current_streak=3)
        db_session.add(run)
        db_session.commit()

        log = ChaosMatchLog(
            run_id=run.id,
            killer_id="Inactivity",
            result="loss",
            perks=[],
            addon_rarities=[],
            streak_before=3,
            streak_after=0,
            triggered_by="inactivity",
        )
        db_session.add(log)
        db_session.commit()

        d = log.to_dict()
        assert d["killer_id"] == "Inactivity"
        assert d["result"] == "loss"
        assert d["triggered_by"] == "inactivity"
        assert d["streak_before"] == 3
        assert d["streak_after"] == 0
