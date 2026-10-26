# backend/tests/unit/migrations/test_sanction_drop_message_migration.py
"""Migration 0023 drops the free-text message from user_sanctions, and is a no-op on a current database."""
import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0023_sanction_drop_message.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0023", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def _columns(conn) -> set[str]:
    return {c["name"] for c in sa.inspect(conn).get_columns("user_sanctions")}


def test_upgrade_drops_the_column_once_and_downgrade_brings_it_back() -> None:
    migration = _load()
    assert migration.down_revision == "0022_maintenance_job_runs"
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE user_sanctions (id INTEGER PRIMARY KEY, facts TEXT, public_message TEXT)"))
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)
        assert _columns(conn) == {"id", "facts"}

        _run(conn, migration.downgrade)
        _run(conn, migration.downgrade)
        assert _columns(conn) == {"id", "facts", "public_message"}


def test_nothing_happens_without_the_table() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        _run(conn, migration.upgrade)
        _run(conn, migration.downgrade)
        assert "user_sanctions" not in sa.inspect(conn).get_table_names()
