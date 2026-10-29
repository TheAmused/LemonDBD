# backend/tests/unit/migrations/test_id_please_migration.py
"""Migrations 0034 and 0035: the ID, Please tables match the models, and a database that ran 0034 before lanes gets its lane."""
import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.models import IdPleaseMatchLog, IdPleaseRun

VERSIONS = Path(__file__).resolve().parents[3] / "migrations" / "versions"


def _load(name: str = "0034_id_please"):
    spec = importlib.util.spec_from_file_location(f"migration_{name}", VERSIONS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def test_upgrade_creates_the_model_columns_and_is_idempotent() -> None:
    migration, recent = _load(), _load("0036_id_please_perk_seed")
    assert migration.down_revision == "0033_perk_type_redesign"
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)
        _run(conn, recent.upgrade)
        _run(conn, recent.upgrade)
        inspector = sa.inspect(conn)
        for model in (IdPleaseRun, IdPleaseMatchLog):
            table = model.__table__.name
            assert {c["name"] for c in inspector.get_columns(table)} == {c.name for c in model.__table__.columns}
        uniques = {u["name"] for u in inspector.get_unique_constraints("id_please_runs")}
        assert uniques == {"uq_id_please_run_user_lane_difficulty"}


OLD_TABLE = (
    "CREATE TABLE id_please_runs (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, difficulty VARCHAR(20) NOT NULL, "
    "CONSTRAINT uq_id_please_run_user_difficulty UNIQUE (user_id, difficulty))"
)


def test_0035_adds_the_lane_to_a_table_made_before_lanes_existed() -> None:
    migration = _load("0035_id_please_lanes")
    assert migration.down_revision == "0034_id_please"
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        conn.execute(sa.text(OLD_TABLE))
        conn.execute(sa.text("INSERT INTO id_please_runs (user_id, difficulty) VALUES (1, 'milestones')"))
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)
        inspector = sa.inspect(conn)
        assert "lane" in {c["name"] for c in inspector.get_columns("id_please_runs")}
        assert {u["name"] for u in inspector.get_unique_constraints("id_please_runs")} == {"uq_id_please_run_user_lane_difficulty"}
        assert conn.execute(sa.text("SELECT lane FROM id_please_runs")).scalar() == "mixed"
        conn.execute(sa.text("INSERT INTO id_please_runs (user_id, difficulty, lane) VALUES (1, 'milestones', 'survivor')"))


def test_0035_changes_nothing_on_a_fresh_database() -> None:
    first, second = _load(), _load("0035_id_please_lanes")
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        _run(conn, first.upgrade)
        before = [c["name"] for c in sa.inspect(conn).get_columns("id_please_runs")]
        _run(conn, second.upgrade)
        inspector = sa.inspect(conn)
        assert [c["name"] for c in inspector.get_columns("id_please_runs")] == before
        assert {u["name"] for u in inspector.get_unique_constraints("id_please_runs")} == {"uq_id_please_run_user_lane_difficulty"}


def test_0035_downgrade_restores_the_one_run_per_difficulty_key() -> None:
    first, second = _load(), _load("0035_id_please_lanes")
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        _run(conn, first.upgrade)
        conn.execute(sa.text("INSERT INTO id_please_runs (user_id, difficulty, lane) VALUES (1, 'milestones', 'mixed')"))
        conn.execute(sa.text("INSERT INTO id_please_runs (user_id, difficulty, lane) VALUES (1, 'milestones', 'killer')"))
        _run(conn, second.downgrade)
        inspector = sa.inspect(conn)
        assert "lane" not in {c["name"] for c in inspector.get_columns("id_please_runs")}
        assert {u["name"] for u in inspector.get_unique_constraints("id_please_runs")} == {"uq_id_please_run_user_difficulty"}
        assert conn.execute(sa.text("SELECT COUNT(*) FROM id_please_runs")).scalar() == 1


def test_0036_adds_the_perk_seed_to_a_table_without_it() -> None:
    migration = _load("0036_id_please_perk_seed")
    assert migration.down_revision == "0035_id_please_lanes"
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        conn.execute(sa.text("CREATE TABLE id_please_runs (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, difficulty VARCHAR(20) NOT NULL)"))
        conn.execute(sa.text("INSERT INTO id_please_runs (user_id, difficulty) VALUES (1, 'hardcore_plus')"))
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)
        assert "perk_seed" in {c["name"] for c in sa.inspect(conn).get_columns("id_please_runs")}
        assert conn.execute(sa.text("SELECT perk_seed FROM id_please_runs")).scalar() == 0
        _run(conn, migration.downgrade)
        assert "perk_seed" not in {c["name"] for c in sa.inspect(conn).get_columns("id_please_runs")}


def test_downgrade_removes_both_tables() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        _run(conn, migration.upgrade)
        _run(conn, migration.downgrade)
        assert {"id_please_runs", "id_please_match_logs"}.isdisjoint(sa.inspect(conn).get_table_names())
        _run(conn, migration.downgrade)
