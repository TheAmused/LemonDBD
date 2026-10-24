# backend/tests/unit/test_extract_map_layouts_migration.py
"""Migration 0031 extracts map_realms.layout into the map_layouts table."""
import importlib.util
import json
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "0031_extract_map_layouts.py"
)


def _load():
    spec = importlib.util.spec_from_file_location("migration_0031", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run(conn, fn) -> None:
    with Operations.context(MigrationContext.configure(conn)):
        fn()


def _columns(conn, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(conn).get_columns(table)}


@pytest.fixture
def conn():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        yield connection


@pytest.mark.unit
def test_migration_revisions() -> None:
    migration = _load()
    assert migration.revision == "0031_extract_map_layouts"
    assert migration.down_revision == "0030_map_layouts"


@pytest.mark.unit
def test_upgrade_migrates_layout_data_and_drops_column(conn) -> None:
    migration = _load()
    conn.execute(
        sa.text(
            "CREATE TABLE map_realms ("
            "id INTEGER PRIMARY KEY, "
            "name VARCHAR(150) NOT NULL, "
            "layout JSON"
            ")"
        )
    )
    test_layout = {"cell_m": 8, "width_m": 128, "height_m": 128, "floors": []}
    conn.execute(
        sa.text(
            "INSERT INTO map_realms (id, name, layout) VALUES "
            "(1, 'Map With Layout', :layout), "
            "(2, 'Map Without Layout', NULL)"
        ),
        {"layout": json.dumps(test_layout)},
    )

    _run(conn, migration.upgrade)

    inspector = sa.inspect(conn)
    assert "map_layouts" in inspector.get_table_names()
    assert "layout" not in _columns(conn, "map_realms")

    rows = conn.execute(
        sa.text("SELECT id, map_id, version, layout_data FROM map_layouts")
    ).fetchall()
    assert len(rows) == 1
    row = rows[0]
    assert row[1] == 1  # map_id
    assert row[2] == 1  # version
    parsed_layout = json.loads(row[3]) if isinstance(row[3], str) else row[3]
    assert parsed_layout == test_layout


@pytest.mark.unit
def test_downgrade_restores_layout_column_and_drops_table(conn) -> None:
    migration = _load()
    conn.execute(
        sa.text(
            "CREATE TABLE map_realms ("
            "id INTEGER PRIMARY KEY, "
            "name VARCHAR(150) NOT NULL, "
            "layout JSON"
            ")"
        )
    )
    _run(conn, migration.upgrade)
    assert "map_layouts" in sa.inspect(conn).get_table_names()
    assert "layout" not in _columns(conn, "map_realms")

    _run(conn, migration.downgrade)
    inspector = sa.inspect(conn)
    assert "map_layouts" not in inspector.get_table_names()
    assert "layout" in _columns(conn, "map_realms")


@pytest.mark.unit
def test_upgrade_is_idempotent(conn) -> None:
    migration = _load()
    conn.execute(
        sa.text(
            "CREATE TABLE map_realms ("
            "id INTEGER PRIMARY KEY, "
            "name VARCHAR(150) NOT NULL, "
            "layout JSON"
            ")"
        )
    )
    test_layout = {"cell_m": 8, "width_m": 128}
    conn.execute(
        sa.text("INSERT INTO map_realms (id, name, layout) VALUES (1, 'Map 1', :layout)"),
        {"layout": json.dumps(test_layout)},
    )

    # First upgrade
    _run(conn, migration.upgrade)
    assert "map_layouts" in sa.inspect(conn).get_table_names()
    assert "layout" not in _columns(conn, "map_realms")

    # Second upgrade (must not raise, tables/columns unchanged)
    _run(conn, migration.upgrade)
    assert "map_layouts" in sa.inspect(conn).get_table_names()
    assert "layout" not in _columns(conn, "map_realms")

    rows = conn.execute(
        sa.text("SELECT id, map_id, version, layout_data FROM map_layouts")
    ).fetchall()
    assert len(rows) == 1


@pytest.mark.unit
def test_upgrade_when_map_realms_lacks_layout_column(conn) -> None:
    migration = _load()
    conn.execute(
        sa.text(
            "CREATE TABLE map_realms ("
            "id INTEGER PRIMARY KEY, "
            "name VARCHAR(150) NOT NULL"
            ")"
        )
    )
    _run(conn, migration.upgrade)
    assert "map_layouts" in sa.inspect(conn).get_table_names()
    assert "layout" not in _columns(conn, "map_realms")
