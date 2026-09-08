# backend/tests/unit/services/test_run_family_export.py
import pytest
from flask import Flask
from sqlalchemy import select
from app import create_app
from app.core.extensions import db
from app.models.user import User
from app.models.gauntlet import GauntletRun, GauntletMatchLog
from app.services.db.run_family_export import export_run_family, import_run_family


@pytest.fixture
def app_with_run() -> Flask:
    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with test_app.app_context():
        db.create_all()
        user = User(username="runner", email="runner@test.com", password_hash="h", role="user")
        db.session.add(user)
        db.session.commit()
        run = GauntletRun(
            user_id=user.id, role="Survivor", game_mode="original", current_character_id="claudette",
        )
        db.session.add(run)
        db.session.flush()
        db.session.add(GauntletMatchLog(
            run_id=run.id, role="Survivor", character_id="claudette", result="win",
            streak_before=0, streak_after=1,
        ))
        db.session.commit()
        yield test_app
        db.session.remove()
        db.drop_all()


def test_export_run_family_nests_match_logs_under_username(app_with_run: Flask) -> None:
    with app_with_run.app_context():
        export_data: dict = {}
        counts: dict[str, int] = {}

        export_run_family(export_data, counts, "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs")

        assert counts["gauntlet_runs"] == 1
        row = export_data["gauntlet_runs"][0]
        assert row["username"] == "runner"
        assert row["role"] == "Survivor"
        assert len(row["match_logs"]) == 1
        assert row["match_logs"][0]["character_id"] == "claudette"


def test_import_run_family_upserts_by_username_and_natural_keys(app_with_run: Flask) -> None:
    with app_with_run.app_context():
        export_data: dict = {}
        counts: dict[str, int] = {}
        export_run_family(export_data, counts, "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs")
        exported_row = export_data["gauntlet_runs"][0]

        db.session.execute(GauntletMatchLog.__table__.delete())
        db.session.execute(GauntletRun.__table__.delete())
        db.session.commit()

        user_map = {u.username: u.id for u in db.session.scalars(select(User)).all()}
        summary: dict[str, dict[str, int]] = {}

        import_run_family(
            {"gauntlet_runs": [exported_row]}, {"gauntlet_runs"}, summary,
            "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs",
            run_natural_keys=["role", "game_mode"], user_map=user_map,
        )

        assert summary["gauntlet_runs"]["created"] == 1
        restored = db.session.scalars(select(GauntletRun)).one()
        assert restored.current_character_id == "claudette"
        logs = db.session.scalars(select(GauntletMatchLog).where(GauntletMatchLog.run_id == restored.id)).all()
        assert len(logs) == 1
        assert logs[0].character_id == "claudette"
