# backend/tests/unit/users/test_user_preference_gifs_migration.py
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION_PATH = (
    Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0038_user_preference_gifs.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("migration_0038", MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_op(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


@pytest.fixture
def sqlite_conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection


@pytest.mark.unit
def test_migration_0038_revision_metadata() -> None:
    migration = _load_migration()
    assert migration.revision == "0038_user_preference_gifs"
    assert migration.down_revision == "0037_map_is_retired"


@pytest.mark.unit
def test_migration_0038_adds_and_drops_the_column_and_keeps_old_rows_on(sqlite_conn) -> None:
    migration = _load_migration()
    sqlite_conn.execute(sa.text("CREATE TABLE user_preferences (user_id INTEGER PRIMARY KEY, chosen_at BIGINT)"))
    sqlite_conn.execute(sa.text("INSERT INTO user_preferences (user_id, chosen_at) VALUES (1, 5)"))

    _run_op(sqlite_conn, migration.upgrade)
    columns = {col["name"] for col in sa.inspect(sqlite_conn).get_columns("user_preferences")}
    assert "gifs_enabled" in columns
    assert sqlite_conn.execute(sa.text("SELECT gifs_enabled FROM user_preferences WHERE user_id = 1")).scalar() == 1

    # Idempotent
    _run_op(sqlite_conn, migration.upgrade)

    _run_op(sqlite_conn, migration.downgrade)
    columns = {col["name"] for col in sa.inspect(sqlite_conn).get_columns("user_preferences")}
    assert "gifs_enabled" not in columns


@pytest.mark.unit
def test_migration_0038_skips_when_the_table_is_missing(sqlite_conn) -> None:
    migration = _load_migration()
    _run_op(sqlite_conn, migration.upgrade)
    _run_op(sqlite_conn, migration.downgrade)
