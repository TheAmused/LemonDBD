# backend/tests/unit/test_perk_type_tarot_migration_fresh_seed.py
"""Regression: on a fresh database the seeder runs before the migrations, so
`perks` already holds 'hooks' rows (and the model's CHECK that allows them)
when `perk_type_tarot_001` runs. It must not re-create a CHECK that rejects
'hooks', and `perk_type_hooks_001` must still be a no-op afterwards."""
import importlib

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

tarot = importlib.import_module("migrations.versions.perk_type_tarot_001")
hooks = importlib.import_module("migrations.versions.perk_type_hooks_001")

_ALL = "'hex','boon','sacrifice','exhaustion','obsession','aura','generator','healing','chase','stealth','entity','hooks'"


@pytest.fixture
def seeded_conn():
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(sa.text(
            "CREATE TABLE perks (id INTEGER PRIMARY KEY, name VARCHAR(150), role VARCHAR(20), perk_type VARCHAR(30),"
            f" CONSTRAINT ck_perks_perk_type CHECK (perk_type IS NULL OR perk_type IN ({_ALL})))"
        ))
        connection.execute(sa.text(
            "INSERT INTO perks (name, role, perk_type) VALUES ('A','Killer','hooks'), ('B','Survivor','aura')"
        ))
        with Operations.context(MigrationContext.configure(connection)):
            yield connection


@pytest.mark.unit
def test_tarot_upgrade_keeps_hooks_rows_valid(seeded_conn) -> None:
    tarot.upgrade()
    hooks.upgrade()
    rows = dict(seeded_conn.execute(sa.text("SELECT name, perk_type FROM perks")).all())
    assert rows == {"A": "hooks", "B": "aura"}
    checks = {c["name"]: c["sqltext"] for c in sa.inspect(seeded_conn).get_check_constraints("perks")}
    assert "'hooks'" in checks["ck_perks_perk_type"]
