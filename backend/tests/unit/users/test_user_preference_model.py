import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.orm import Session

from app.models import UserPreference
from tests.unit.smash.smash_api_support import create_user

MIGRATION_PATH = (
    Path(__file__).resolve().parents[3]
    / "migrations"
    / "versions"
    / "0032_user_preferences.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("migration_0032", MIGRATION_PATH)
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
def test_user_preference_crud(db_session: Session) -> None:
    user = create_user(db_session)
    pref = UserPreference(
        user_id=user.id,
        effects_enabled=True,
        sounds_enabled=True,
        music_enabled=False,
        nsfw_enabled=True,
        background_animation="eco",
        gifs_enabled=False,
        chosen_at=123456789,
    )
    db_session.add(pref)
    db_session.commit()

    loaded = db_session.get(UserPreference, user.id)
    assert loaded is not None
    assert loaded.music_enabled is False
    assert loaded.gifs_enabled is False
    assert loaded.nsfw_enabled is True
    assert loaded.background_animation == "eco"
    d = loaded.to_dict()
    assert d["effects"] is True
    assert d["sounds"] is True
    assert d["music"] is False
    assert d["nsfw"] is True
    assert d["background_animation"] == "eco"
    assert d["gifs"] is False
    assert d["chosen_at"] == 123456789


@pytest.mark.unit
def test_user_preference_defaults_and_update(db_session: Session) -> None:
    user = create_user(db_session, username="prefuser", email="prefuser@example.com")
    pref = UserPreference(
        user_id=user.id,
        chosen_at=987654321,
    )
    db_session.add(pref)
    db_session.commit()

    loaded = db_session.get(UserPreference, user.id)
    assert loaded is not None
    assert loaded.effects_enabled is True
    assert loaded.sounds_enabled is True
    assert loaded.music_enabled is True
    assert loaded.nsfw_enabled is False
    assert loaded.background_animation == "on"
    assert loaded.gifs_enabled is True

    # Update fields
    loaded.background_animation = "off"
    loaded.nsfw_enabled = True
    db_session.commit()

    updated = db_session.get(UserPreference, user.id)
    assert updated is not None
    assert updated.background_animation == "off"
    assert updated.nsfw_enabled is True


@pytest.mark.unit
def test_migration_0032_revision_metadata() -> None:
    migration = _load_migration()
    assert migration.revision == "0032_user_preferences"
    assert migration.down_revision == "0031_extract_map_layouts"


@pytest.mark.unit
def test_migration_0032_upgrade_and_downgrade(sqlite_conn) -> None:
    migration = _load_migration()

    # Create users table for foreign key constraint in sqlite
    sqlite_conn.execute(
        sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50))")
    )

    # First upgrade
    _run_op(sqlite_conn, migration.upgrade)
    inspector = sa.inspect(sqlite_conn)
    assert "user_preferences" in inspector.get_table_names()
    columns = {col["name"] for col in inspector.get_columns("user_preferences")}
    expected_cols = {
        "user_id",
        "effects_enabled",
        "sounds_enabled",
        "music_enabled",
        "nsfw_enabled",
        "background_animation",
        "chosen_at",
        "updated_at",
    }
    assert expected_cols.issubset(columns)

    # Idempotent upgrade (should not fail)
    _run_op(sqlite_conn, migration.upgrade)
    assert "user_preferences" in inspector.get_table_names()

    # Downgrade
    _run_op(sqlite_conn, migration.downgrade)
    inspector = sa.inspect(sqlite_conn)
    assert "user_preferences" not in inspector.get_table_names()
