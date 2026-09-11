# backend/tests/unit/api/test_full_db_migration_workflow.py
"""Proves the full-database export/import round-trip this feature exists for:
export everything (including asset bytes) from a seeded app+static-dir, wipe
the database and static dir, import the export back, and assert the restored
state matches -- including that an image's bytes are identical, not just its
path string.

Deliberately lives alongside the rest of the SQLite-backed unit suite (not
under tests/live/) since tests/unit/conftest.py is what points app.core.config
at sqlite:///:memory: before `app` is ever imported; anything outside
tests/unit/ falls back to the real Postgres DATABASE_URL and fails to connect
when run standalone.
"""
import base64
from pathlib import Path
import pytest
from flask import Flask
from sqlalchemy import select, delete
from app import create_app
from app.core.extensions import db
from app.models.character import Character
from app.models.user import User
from app.services.db import export_import as export_import_module
from app.services.db.export_import import DatabaseExportImportService, SUPPORTED_EXPORT_TARGETS


@pytest.fixture
def seeded_app(tmp_path: Path, monkeypatch) -> Flask:
    static_dir = tmp_path / "static"
    icon_dir = static_dir / "icons" / "characters"
    icon_dir.mkdir(parents=True)
    (icon_dir / "trapper.webp").write_bytes(b"real-trapper-bytes")
    monkeypatch.setattr(export_import_module, "get_static_dir", lambda: static_dir)

    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with test_app.app_context():
        db.create_all()
        db.session.add(User(username="migrator", email="migrator@test.com", password_hash="h", role="admin"))
        db.session.add(Character(
            name="The Trapper", role="Killer", avatar_local_path="icons/characters/trapper.webp",
        ))
        db.session.commit()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_full_export_then_wipe_then_import_restores_everything(seeded_app: Flask) -> None:
    with seeded_app.app_context():
        exported = DatabaseExportImportService.export_database(targets=SUPPORTED_EXPORT_TARGETS, include_assets=True)

        static_dir = export_import_module.get_static_dir()
        icon_path = static_dir / "icons" / "characters" / "trapper.webp"
        assert exported["groups"]["content"]["characters"][0]["avatar_local_path_data"] == base64.b64encode(icon_path.read_bytes()).decode("ascii")

        # Wipe: drop every row and delete the asset file, simulating a brand-new target instance.
        icon_path.unlink()
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(delete(table))
        db.session.commit()
        assert db.session.scalars(select(Character)).first() is None

        summary = DatabaseExportImportService.import_database(exported, mode="merge", targets=SUPPORTED_EXPORT_TARGETS)

        restored_char = db.session.scalars(select(Character).where(Character.name == "The Trapper")).one()
        assert restored_char.avatar_local_path == "icons/characters/trapper.webp"
        assert icon_path.read_bytes() == b"real-trapper-bytes"
        assert summary["summary"]["characters"]["created"] == 1
