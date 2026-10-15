# backend/tests/unit/test_tier_list_nsfw_migration.py
"""Migration 0016 adds tier_lists.is_nsfw to a database that predates it, and is a no-op otherwise."""
import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "0016_tier_list_nsfw.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0016", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def _columns(conn) -> set[str]:
    return {c["name"] for c in sa.inspect(conn).get_columns("tier_lists")}


def test_upgrade_adds_the_column_with_a_false_default_for_existing_rows() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE tier_lists (id INTEGER PRIMARY KEY, slug VARCHAR(80) NOT NULL)"))
        conn.execute(sa.text("INSERT INTO tier_lists (id, slug) VALUES (1, 'maps')"))

        _run(conn, migration.upgrade)

        assert "is_nsfw" in _columns(conn)
        assert conn.execute(sa.text("SELECT is_nsfw FROM tier_lists WHERE id = 1")).scalar() in (0, False)


def test_upgrade_is_a_noop_when_the_column_exists_or_the_table_is_missing_and_downgrade_removes_it() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        _run(conn, migration.upgrade)  # no table at all: nothing to do
        conn.execute(sa.text("CREATE TABLE tier_lists (id INTEGER PRIMARY KEY, slug VARCHAR(80) NOT NULL)"))
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)  # second run must not raise
        assert "is_nsfw" in _columns(conn)

        _run(conn, migration.downgrade)
        assert "is_nsfw" not in _columns(conn)
