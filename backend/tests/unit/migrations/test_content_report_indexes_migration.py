# backend/tests/unit/migrations/test_content_report_indexes_migration.py
"""Migration 0015 folds duplicate pending reports, then adds the indexes. It must also be a no-op
on a database create_all() already built."""
import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0015_content_report_indexes.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0015", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _legacy_schema(conn) -> None:
    conn.execute(sa.text(
        "CREATE TABLE content_reports (id INTEGER PRIMARY KEY, content_hash VARCHAR(64) NOT NULL, "
        "status VARCHAR(32) NOT NULL, report_count INTEGER NOT NULL)"
    ))
    conn.execute(sa.text(
        "CREATE TABLE content_report_subscribers (id INTEGER PRIMARY KEY, report_id INTEGER NOT NULL, "
        "reporter_id INTEGER, reason VARCHAR(64) NOT NULL, "
        "CONSTRAINT uq_report_reporter UNIQUE (report_id, reporter_id))"
    ))


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def test_upgrade_folds_duplicate_pending_reports_then_indexes() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        _legacy_schema(conn)
        conn.execute(sa.text(
            "INSERT INTO content_reports (id, content_hash, status, report_count) VALUES "
            "(1, 'h1', 'pending', 2), (2, 'h1', 'pending', 2), (3, 'h1', 'dismissed', 1), (4, 'h2', 'pending', 1)"
        ))
        conn.execute(sa.text(
            "INSERT INTO content_report_subscribers (report_id, reporter_id, reason) VALUES "
            "(1, 10, 'other'), (1, 11, 'other'), (2, 11, 'other'), (2, 12, 'other'), (4, 10, 'other')"
        ))

        _run(conn, migration.upgrade)

        rows = conn.execute(sa.text("SELECT id, status, report_count FROM content_reports ORDER BY id")).fetchall()
        assert [tuple(r) for r in rows] == [(1, "pending", 3), (3, "dismissed", 1), (4, "pending", 1)]
        subs = conn.execute(sa.text(
            "SELECT reporter_id FROM content_report_subscribers WHERE report_id = 1 ORDER BY reporter_id"
        )).fetchall()
        assert [r[0] for r in subs] == [10, 11, 12]

        names = {i["name"] for i in sa.inspect(conn).get_indexes("content_reports")}
        assert {"uq_content_reports_pending_hash", "idx_content_reports_status_count"} <= names

        # the unique index is partial: a resolved duplicate is allowed, a second pending one is not
        conn.execute(sa.text("INSERT INTO content_reports (content_hash, status, report_count) VALUES ('h2', 'dismissed', 1)"))
        try:
            conn.execute(sa.text("INSERT INTO content_reports (content_hash, status, report_count) VALUES ('h2', 'pending', 1)"))
        except sa.exc.IntegrityError:
            pass
        else:
            raise AssertionError("second pending report for the same hash must be rejected")


def test_upgrade_is_a_noop_when_indexes_already_exist_and_downgrade_removes_them() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        _legacy_schema(conn)
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)  # second run must not raise
        _run(conn, migration.downgrade)
        names = {i["name"] for i in sa.inspect(conn).get_indexes("content_reports")}
        assert "uq_content_reports_pending_hash" not in names
        assert "idx_content_reports_status_count" not in names


def test_upgrade_skips_when_table_is_missing() -> None:
    migration = _load()
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        _run(conn, migration.upgrade)  # fresh database: create_all() builds it later, nothing to do
