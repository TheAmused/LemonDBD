# backend/tests/unit/migrations/test_migration_two_factor.py
"""0011_two_factor creates the two tables once and tolerates a schema create_all() already built."""
import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0011_two_factor.py"
TABLES = {"user_two_factor", "user_recovery_codes"}


def _load():
    spec = importlib.util.spec_from_file_location("migration_0011", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn: sa.Connection, step) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _engine_with_users() -> sa.Engine:
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50))"))
    return engine


@pytest.mark.unit
def test_upgrade_creates_both_tables_with_their_indexes_and_is_idempotent() -> None:
    migration = _load()
    with _engine_with_users().begin() as conn:
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)  # a container restart runs it again
        inspector = sa.inspect(conn)
        assert TABLES <= set(inspector.get_table_names())
        two_factor_indexes = {ix["name"]: ix for ix in inspector.get_indexes("user_two_factor")}
        assert two_factor_indexes["ix_user_two_factor_user_id"]["unique"]
        assert {"ix_user_recovery_codes_user_id"} <= {ix["name"] for ix in inspector.get_indexes("user_recovery_codes")}
        columns = {c["name"] for c in inspector.get_columns("user_two_factor")}
        assert {"secret_encrypted", "enabled_at", "last_used_step", "failed_attempts", "locked_until"} <= columns

        _run(conn, migration.downgrade)
        assert not TABLES & set(sa.inspect(conn).get_table_names())


@pytest.mark.unit
def test_upgrade_is_a_no_op_when_create_all_already_built_the_tables() -> None:
    from app.core.extensions import Base
    import app.models  # noqa: F401

    migration = _load()
    engine = sa.create_engine("sqlite://")
    Base.metadata.create_all(engine, tables=[Base.metadata.tables[name] for name in ("users", *sorted(TABLES))])
    with engine.begin() as conn:
        _run(conn, migration.upgrade)
        assert TABLES <= set(sa.inspect(conn).get_table_names())


@pytest.mark.unit
def test_revision_chain() -> None:
    migration = _load()
    assert (migration.revision, migration.down_revision) == ("0011_two_factor", "0010_user_token_version")
