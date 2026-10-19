# backend/tests/unit/test_unit_of_work_transaction.py
import pytest
from sqlalchemy import select

from app.core.extensions import db
from app.core.transaction import transaction
from app.models import BugReport, User
from datetime import date

from app.models.minigame import MinigameDailyChallenge
from app.services.minigames import upsert_daily_challenge


def test_transaction_commits_cleanly(app):
    """Verify that multiple mutations commit atomically on clean context exit."""
    with app.app_context():
        user_login = "uow_commit_test"
        with transaction():
            user = User(
                login=user_login,
                username="UoW Commit Test",
                email="uow_commit@example.com",
                password_hash="test_hash",
            )
            db.session.add(user)
            db.session.flush()

            report = BugReport(
                user_id=user.id,
                reporter_name="Tester",
                reporter_email="uow_commit@example.com",
                title="UoW Commit Bug",
                message="Testing commit boundary",
            )
            db.session.add(report)

        # After exiting transaction block, both entities must exist in database
        saved_user = db.session.scalar(select(User).where(User.login == user_login))
        assert saved_user is not None

        saved_report = db.session.scalar(
            select(BugReport).where(BugReport.title == "UoW Commit Bug")
        )
        assert saved_report is not None
        assert saved_report.user_id == saved_user.id


def test_transaction_rolls_back_multi_table_on_exception(app):
    """Verify that an exception inside with transaction(): rolls back all mutated tables.
    Zero partial records must persist.
    """
    with app.app_context():
        user_login = "uow_fail_test"
        initial_users = len(db.session.scalars(select(User)).all())
        initial_reports = len(db.session.scalars(select(BugReport)).all())

        with pytest.raises(RuntimeError, match="Simulated crash during multi-table mutation"):
            with transaction():
                user = User(
                    login=user_login,
                    username="UoW Fail Test",
                    email="uow_fail@example.com",
                    password_hash="test_hash",
                )
                db.session.add(user)
                db.session.flush()

                report = BugReport(
                    user_id=user.id,
                    reporter_name="Tester",
                    reporter_email="uow_fail@example.com",
                    title="UoW Failed Report",
                    message="This should not persist",
                )
                db.session.add(report)

                # Simulate a catastrophic failure before transaction completion
                raise RuntimeError("Simulated crash during multi-table mutation")

        # Verify ZERO partial records persist across both tables
        persisted_user = db.session.scalar(select(User).where(User.login == user_login))
        assert persisted_user is None

        persisted_report = db.session.scalar(
            select(BugReport).where(BugReport.title == "UoW Failed Report")
        )
        assert persisted_report is None

        assert len(db.session.scalars(select(User)).all()) == initial_users
        assert len(db.session.scalars(select(BugReport)).all()) == initial_reports


def test_nested_transaction_rollback_guarantees_atomicity(app):
    """Verify that an exception in a nested transaction rolls back the outer transaction too."""
    with app.app_context():
        outer_login = "uow_outer_test"
        inner_login = "uow_inner_test"

        with pytest.raises(ValueError, match="Inner transaction failure"):
            with transaction():
                user1 = User(
                    login=outer_login,
                    username="Outer User",
                    email="outer@example.com",
                    password_hash="hash1",
                )
                db.session.add(user1)

                with transaction():
                    user2 = User(
                        login=inner_login,
                        username="Inner User",
                        email="inner@example.com",
                        password_hash="hash2",
                    )
                    db.session.add(user2)
                    raise ValueError("Inner transaction failure")

        assert db.session.scalar(select(User).where(User.login == outer_login)) is None
        assert db.session.scalar(select(User).where(User.login == inner_login)) is None


def test_minigame_service_transaction_boundary(app):
    """Verify upsert_daily_challenge executes inside an atomic transaction and
    a second call updates the same row instead of inserting another."""
    with app.app_context():
        first = upsert_daily_challenge(
            game_mode="perk_guesser",
            title="First",
            description="",
            rounds=[{"round_number": 1, "mode": "classic_perk", "target_id": 1}],
            target_date=date(2026, 1, 2),
        )
        second = upsert_daily_challenge(
            game_mode="perk_guesser",
            title="Second",
            description="",
            rounds=[{"round_number": 1, "mode": "classic_perk", "target_id": 2}],
            target_date=date(2026, 1, 2),
        )
        assert first.id == second.id

        loaded = db.session.scalars(
            select(MinigameDailyChallenge).where(MinigameDailyChallenge.game_mode == "perk_guesser")
        ).all()
        assert len(loaded) == 1
        assert loaded[0].title == "Second"
        assert loaded[0].rounds[0]["target_id"] == 2
