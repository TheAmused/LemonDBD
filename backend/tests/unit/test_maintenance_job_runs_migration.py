# backend/tests/unit/test_maintenance_job_runs_migration.py
"""Migration 0022 creates the maintenance-run table, and is a no-op on a current database."""
import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "0022_maintenance_job_runs.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0022", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def test_upgrade_is_idempotent_and_downgrade_removes_the_table() -> None:
    migration = _load()
    assert migration.down_revision == "0021_changelog_discord_announced"
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)
        columns = {c["name"] for c in sa.inspect(conn).get_columns("maintenance_job_runs")}
        assert columns == {"key", "last_run_at", "last_affected", "last_trigger"}

        _run(conn, migration.downgrade)
        assert "maintenance_job_runs" not in sa.inspect(conn).get_table_names()
        _run(conn, migration.downgrade)
