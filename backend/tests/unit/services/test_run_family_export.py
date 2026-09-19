# backend/tests/unit/services/test_run_family_export.py
from datetime import datetime
import pytest
from flask import Flask
from sqlalchemy import JSON, Boolean, DateTime, Integer, select
from app import create_app
from app.core.extensions import db
from app.models.user import User
from app.models.chaos import ChaosMatchLog, ChaosRun
from app.models.gauntlet import GauntletRun, GauntletMatchLog
from app.models.history import HistoryMatchLog, HistoryRun
from app.models.page_streak import PageStreakPageLog, PageStreakRun
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


# (export name, run model, log model, log relationship, natural keys), as wired in export_import.py
RUN_FAMILIES = [
    ("gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs", ["role", "game_mode"]),
    ("chaos_runs", ChaosRun, ChaosMatchLog, "match_logs", ["difficulty"]),
    ("history_runs", HistoryRun, HistoryMatchLog, "match_logs", ["mode"]),
    ("page_streak_runs", PageStreakRun, PageStreakPageLog, "page_logs", ["killer"]),
]
_KEY_COLUMNS = {"id", "user_id", "run_id"}
_OBJECT_COLUMNS = {"current_loadout"}
_FIXED_TIME = datetime(2026, 1, 2, 3, 4, 5)


def _sentinel_values(model: type) -> dict[str, object]:
    """A distinct non-default value for every data column, so a column the
    round trip drops shows up as a mismatch instead of hiding behind its default."""
    values: dict[str, object] = {}
    for index, column in enumerate(model.__table__.columns, start=1):
        if column.name in _KEY_COLUMNS:
            continue
        if isinstance(column.type, Boolean):
            values[column.name] = True
        elif isinstance(column.type, Integer):
            values[column.name] = 100 + index
        elif isinstance(column.type, DateTime):
            values[column.name] = _FIXED_TIME
        elif isinstance(column.type, JSON):
            values[column.name] = {"key": column.name} if column.name in _OBJECT_COLUMNS else [column.name]
        else:
            values[column.name] = f"v_{column.name}"
    return values


def _column_values(obj: object, columns: list[str]) -> dict[str, object]:
    values: dict[str, object] = {}
    for name in columns:
        value = getattr(obj, name)
        values[name] = value.replace(tzinfo=None) if isinstance(value, datetime) else value
    return values


@pytest.mark.parametrize(("name", "run_model", "log_model", "log_attr", "natural_keys"), RUN_FAMILIES)
def test_export_import_round_trip_preserves_every_run_and_log_column(
    app_with_run: Flask,
    name: str,
    run_model: type,
    log_model: type,
    log_attr: str,
    natural_keys: list[str],
) -> None:
    with app_with_run.app_context():
        db.session.execute(GauntletMatchLog.__table__.delete())
        db.session.execute(GauntletRun.__table__.delete())
        user = db.session.scalars(select(User)).one()
        run_values = _sentinel_values(run_model)
        log_values = _sentinel_values(log_model)
        run = run_model(user_id=user.id, **run_values)
        getattr(run, log_attr).append(log_model(**log_values))
        db.session.add(run)
        db.session.commit()
        user_map = {user.username: user.id}

        export_data: dict[str, list[dict[str, object]]] = {}
        export_run_family(export_data, {}, name, run_model, log_model, log_attr)
        db.session.execute(log_model.__table__.delete())
        db.session.execute(run_model.__table__.delete())
        db.session.commit()
        db.session.expunge_all()
        import_run_family(
            export_data, {name}, {}, name, run_model, log_model, log_attr,
            run_natural_keys=natural_keys, user_map=user_map,
        )
        db.session.commit()

        restored = db.session.scalars(select(run_model)).one()
        assert _column_values(restored, list(run_values)) == run_values
        restored_logs = getattr(restored, log_attr)
        assert len(restored_logs) == 1
        assert _column_values(restored_logs[0], list(log_values)) == log_values


def test_import_accepts_a_backup_written_before_json_columns(app_with_run: Flask) -> None:
    # Backups taken while these columns were TEXT carry "<name>_json" keys
    # holding JSON strings; they must still restore.
    with app_with_run.app_context():
        user = db.session.scalars(select(User)).one()
        legacy_row = {
            "username": user.username,
            "difficulty": "hell",
            "completed_killers_json": '["The Trapper"]',
            "owned_killers_json": "[3, 7]",
            "current_perks_json": '[{"name": "Hex: Ruin"}]',
            "match_logs": [{
                "killer_id": "The Trapper", "result": "win", "streak_before": 0, "streak_after": 1,
                "perks_json": '[{"name": "Hex: Ruin"}]', "addon_rarities_json": '["Rare"]',
            }],
        }
        import_run_family(
            {"chaos_runs": [legacy_row]}, {"chaos_runs"}, {}, "chaos_runs", ChaosRun, ChaosMatchLog, "match_logs",
            run_natural_keys=["difficulty"], user_map={user.username: user.id},
        )
        db.session.commit()

        run = db.session.scalars(select(ChaosRun)).one()
        assert run.completed_killers == ["The Trapper"]
        assert run.owned_killer_ids == [3, 7]
        assert run.current_perks == [{"name": "Hex: Ruin"}]
        assert run.match_logs[0].addon_rarities == ["Rare"]
