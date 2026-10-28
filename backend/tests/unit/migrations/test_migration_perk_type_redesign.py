# backend/tests/unit/test_migration_perk_type_redesign.py
"""0033_perk_type_redesign renames aura/hex/boon in stored lists and can be undone by side."""
import importlib.util
import json
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = Path(__file__).resolve().parents[3] / "migrations" / "versions" / "0033_perk_type_redesign.py"


def _load():
    spec = importlib.util.spec_from_file_location("migration_0033", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn: sa.Connection, step) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        step()


def _types(conn: sa.Connection) -> dict[int, list[str]]:
    rows = conn.execute(sa.text("SELECT id, perk_types FROM perks")).all()
    return {row.id: json.loads(row.perk_types) for row in rows}


def _engine_with(perks: list[tuple[int, str, list[str]]]) -> sa.Engine:
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE perks (id INTEGER PRIMARY KEY, role VARCHAR(20), perk_types JSON)"))
        for perk_id, role, types in perks:
            conn.execute(
                sa.text("INSERT INTO perks (id, role, perk_types) VALUES (:i, :r, :t)"),
                {"i": perk_id, "r": role, "t": json.dumps(types)},
            )
    return engine


@pytest.mark.unit
def test_upgrade_renames_aura_and_merges_hex_and_boon_keeping_order_and_is_idempotent() -> None:
    migration = _load()
    engine = _engine_with([
        (1, "Survivor", ["generator", "aura"]),
        (2, "Killer", ["hex"]),
        (3, "Survivor", ["boon", "healing"]),
        (4, "Survivor", ["hex", "boon", "aura"]),
        (5, "Killer", ["downed", "items", "endgame"]),
    ])
    with engine.begin() as conn:
        _run(conn, migration.upgrade)
        _run(conn, migration.upgrade)  # a restart runs it again: must not change anything

        assert _types(conn) == {
            1: ["generator", "tracking"],
            2: ["totem"],
            3: ["totem", "healing"],
            4: ["totem", "tracking"],
            5: ["downed", "items", "endgame"],
        }


@pytest.mark.unit
def test_downgrade_splits_totem_by_side_and_drops_the_types_the_old_vocabulary_lacks() -> None:
    migration = _load()
    engine = _engine_with([
        (1, "Killer", ["totem", "tracking"]),
        (2, "Survivor", ["totem"]),
        (3, "Survivor", ["downed", "items"]),
        (4, "Killer", ["entity", "chase"]),
        (5, "Survivor", ["entity"]),
        (6, "Survivor", ["hooks", "chase"]),
        (7, "Killer", ["hooks", "downed"]),
        (8, "Survivor", ["hooks"]),
    ])
    with engine.begin() as conn:
        _run(conn, migration.downgrade)

        assert _types(conn) == {
            1: ["hex", "aura"],
            2: ["boon"],
            3: ["entity"],
            4: ["chase"],
            5: ["entity"],
            6: ["chase"],
            7: ["hooks"],
            8: ["entity"],
        }


@pytest.mark.unit
def test_revision_chain_points_at_the_previous_head() -> None:
    migration = _load()
    assert migration.revision == "0033_perk_type_redesign"
    assert migration.down_revision == "0032_user_preferences"
