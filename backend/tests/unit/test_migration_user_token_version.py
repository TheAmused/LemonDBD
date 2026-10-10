# backend/tests/unit/test_migration_user_token_version.py
"""0010_user_token_version adds the column once, backfills 0 and can run on a schema create_all() already built."""
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "0010_user_token_version.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0010", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn: sa.Connection, step) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        step()


@pytest.mark.unit
def test_upgrade_adds_the_column_with_zero_for_existing_rows_and_is_idempotent() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50))"))
        conn.execute(sa.text("INSERT INTO users (username) VALUES ('old-account')"))

        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)  # a restart runs it again: must not raise

        assert "token_version" in {c["name"] for c in sa.inspect(conn).get_columns("users")}
        assert conn.execute(sa.text("SELECT token_version FROM users")).scalar() == 0

        _run(conn, migration.downgrade)
        assert "token_version" not in {c["name"] for c in sa.inspect(conn).get_columns("users")}


@pytest.mark.unit
def test_revision_chain_points_at_the_previous_head() -> None:
    migration = _load()
    assert migration.revision == "0010_user_token_version"
    assert migration.down_revision == "0009_perk_types"
