# backend/tests/unit/test_perk_type_migration_roundtrip.py
"""Runs `perk_type_001`'s own `upgrade()`/`downgrade()` against a real
SQLite connection.

This repo's existing convention (see `test_full_db_migration_workflow.py`)
is to test the schema via `db.create_all()` against SQLite, not by actually
invoking Alembic in the unit suite -- the only place that runs real
`alembic upgrade`/`downgrade` is `tests/live/test_live_migrations_idempotent.py`,
which needs a live Postgres and isn't part of this sandbox's test run.

`perk_type_001` is unusual in that its `upgrade`/`downgrade` are plain,
self-contained functions (batch-mode `op.*` calls guarded by
`sqlalchemy.inspect`, no Postgres-only syntax), so unlike most of this
repo's migrations it CAN be exercised directly against SQLite without a real
Alembic run -- so this test does that, going a bit further than the
established convention because the migration itself makes it cheap and
worthwhile: it proves the column-add, the CHECK constraint, idempotent
re-application, and full reversibility all actually work, not just that the
model's own `db.create_all()` shape is right.
"""
import importlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

migration = importlib.import_module("migrations.versions.perk_type_001")


@pytest.fixture
def bound_op():
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        # Minimal standalone `perks` table -- just enough surface for this
        # migration's add-column/add-constraint logic, mirroring the real
        # table's relevant shape without needing the whole app's models.
        connection.execute(sa.text(
            "CREATE TABLE perks (id INTEGER PRIMARY KEY, name VARCHAR(150), role VARCHAR(20))"
        ))
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            yield connection


@pytest.mark.unit
def test_upgrade_adds_perk_type_column_and_check_constraint(bound_op) -> None:
    migration.upgrade()

    inspector = sa.inspect(bound_op)
    columns = {c["name"] for c in inspector.get_columns("perks")}
    assert "perk_type" in columns

    checks = {c["name"] for c in inspector.get_check_constraints("perks")}
    assert "ck_perks_perk_type" in checks


@pytest.mark.unit
def test_upgrade_is_idempotent(bound_op) -> None:
    migration.upgrade()
    migration.upgrade()  # must not raise "duplicate column" / "constraint already exists"

    inspector = sa.inspect(bound_op)
    columns = [c["name"] for c in inspector.get_columns("perks")]
    assert columns.count("perk_type") == 1


@pytest.mark.unit
def test_downgrade_removes_column_and_constraint(bound_op) -> None:
    migration.upgrade()
    migration.downgrade()

    inspector = sa.inspect(bound_op)
    columns = {c["name"] for c in inspector.get_columns("perks")}
    assert "perk_type" not in columns

    checks = {c["name"] for c in inspector.get_check_constraints("perks")}
    assert "ck_perks_perk_type" not in checks


@pytest.mark.unit
def test_downgrade_is_idempotent_and_full_roundtrip_is_clean(bound_op) -> None:
    migration.upgrade()
    migration.downgrade()
    migration.downgrade()  # must not raise on an already-downgraded table

    # And upgrading again after a full downgrade must still work cleanly.
    migration.upgrade()
    inspector = sa.inspect(bound_op)
    assert "perk_type" in {c["name"] for c in inspector.get_columns("perks")}


@pytest.mark.unit
def test_check_constraint_actually_rejects_an_invalid_value_at_the_sql_level(bound_op) -> None:
    migration.upgrade()
    with pytest.raises(sa.exc.IntegrityError):
        bound_op.execute(sa.text(
            "INSERT INTO perks (name, role, perk_type) VALUES ('X', 'Survivor', 'not_a_real_type')"
        ))
