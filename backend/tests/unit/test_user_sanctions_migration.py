# backend/tests/unit/test_user_sanctions_migration.py
"""Migration 0017 brings an older database to the sanctions schema, and is a no-op on a current one."""
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "0017_user_sanctions.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0017", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def _old_schema(conn) -> None:
    conn.execute(sa.text("PRAGMA foreign_keys = OFF"))
    conn.execute(
        sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, login VARCHAR(80) NOT NULL, is_active BOOLEAN NOT NULL)")
    )
    conn.execute(sa.text("CREATE TABLE content_reports (id INTEGER PRIMARY KEY)"))
    conn.execute(sa.text("INSERT INTO users (id, login, is_active) VALUES (1, 'a', 1), (2, 'b', 0)"))


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection


def _state(conn) -> tuple[set[str], set[str], set[str]]:
    inspector = sa.inspect(conn)
    return (
        set(inspector.get_table_names()),
        {c["name"] for c in inspector.get_columns("users")},
        {c["name"] for c in inspector.get_check_constraints("users")},
    )


def test_upgrade_creates_tables_column_and_constraint_and_keeps_existing_users(conn) -> None:
    migration = _load()
    _old_schema(conn)

    _run(conn, migration.upgrade)

    tables, columns, checks = _state(conn)
    assert {"user_sanctions", "sanction_notifications"} <= tables
    assert "suspended_until" in columns
    assert "ck_users_ban_excludes_suspension" in checks
    assert conn.execute(sa.text("SELECT count(*) FROM users")).scalar() == 2  # nothing is backfilled or lost

    # the constraint is real: a suspended account cannot be a banned one
    with pytest.raises(sa.exc.IntegrityError):
        conn.execute(sa.text("UPDATE users SET suspended_until = '2030-01-01' WHERE id = 2"))


def test_upgrade_is_idempotent_and_ignores_a_database_without_users(conn) -> None:
    migration = _load()
    _run(conn, migration.upgrade)  # no users table at all: nothing to do
    assert sa.inspect(conn).get_table_names() == []

    _old_schema(conn)
    _run(conn, migration.upgrade)
    _run(conn, migration.upgrade)  # second run must not raise
    assert "suspended_until" in _state(conn)[1]


def test_sanction_rows_reject_unknown_kinds_and_cascade_with_the_user(conn) -> None:
    migration = _load()
    _old_schema(conn)
    _run(conn, migration.upgrade)
    conn.execute(sa.text("PRAGMA foreign_keys = ON"))

    insert = (
        "INSERT INTO user_sanctions (user_id, kind, reason_code, source, issued_at) "
        "VALUES (1, :kind, 'spam', 'manual', '2026-10-15')"
    )
    with pytest.raises(sa.exc.IntegrityError):
        conn.execute(sa.text(insert), {"kind": "mute"})
    conn.execute(sa.text(insert), {"kind": "warning"})
    conn.execute(sa.text("INSERT INTO sanction_notifications (sanction_id, event, created_at) VALUES (1, 'issued', '2026-10-15')"))
    with pytest.raises(sa.exc.IntegrityError):  # one email per sanction and event
        conn.execute(sa.text("INSERT INTO sanction_notifications (sanction_id, event, created_at) VALUES (1, 'issued', '2026-10-15')"))


def test_downgrade_removes_everything_it_added(conn) -> None:
    migration = _load()
    _old_schema(conn)
    _run(conn, migration.upgrade)

    _run(conn, migration.downgrade)

    tables, columns, checks = _state(conn)
    assert not ({"user_sanctions", "sanction_notifications"} & tables)
    assert "suspended_until" not in columns
    assert "ck_users_ban_excludes_suspension" not in checks
    assert conn.execute(sa.text("SELECT count(*) FROM users")).scalar() == 2
