# backend/tests/unit/migrations/test_banned_email_hashes_migration.py
"""Migration 0018 creates the ban-evasion list table, and is a no-op on a current database."""
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0018_banned_email_hashes.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0018", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(sa.text("CREATE TABLE user_sanctions (id INTEGER PRIMARY KEY)"))
        yield connection


def test_upgrade_creates_the_table_with_its_unique_constraint_and_indexes(conn) -> None:
    migration = _load()
    _run(conn, migration.upgrade)

    inspector = sa.inspect(conn)
    assert "banned_email_hashes" in inspector.get_table_names()
    columns = {c["name"] for c in inspector.get_columns("banned_email_hashes")}
    assert columns == {"id", "email_hmac", "key_version", "sanction_id", "reason_code", "created_at", "expires_at"}
    assert {u["name"] for u in inspector.get_unique_constraints("banned_email_hashes")} == {
        "uq_banned_email_hash_sanction"
    }
    assert "idx_banned_email_hashes_expires" in {i["name"] for i in inspector.get_indexes("banned_email_hashes")}


def test_upgrade_twice_changes_nothing_and_downgrade_removes_the_table(conn) -> None:
    migration = _load()
    _run(conn, migration.upgrade)
    _run(conn, migration.upgrade)
    assert "banned_email_hashes" in sa.inspect(conn).get_table_names()

    _run(conn, migration.downgrade)
    assert "banned_email_hashes" not in sa.inspect(conn).get_table_names()
    _run(conn, migration.downgrade)


def test_upgrade_skips_a_database_without_sanctions_yet() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        _run(connection, migration.upgrade)
        assert "banned_email_hashes" not in sa.inspect(connection).get_table_names()
