# backend/tests/unit/api/test_db_export_import_assets.py
"""Asset and avatar bytes in database exports and imports."""
import base64
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.models.character import Killer
from app.models.user import User
from app.services.db import export_import as export_import_module
from app.services.db.export_import import DatabaseExportImportService
from tests.unit.api.db_export_import_support import (
    _flat,
)
from tests.unit.api.db_export_import_support import (  # noqa: F401  (pytest fixtures)
    export_import_app,
)


@pytest.mark.unit
class TestDatabaseExportImportAssetBundling:
    """Tests for base64-embedded image bytes on export/import (Task 2)."""

    def test_export_embeds_character_avatar_bytes(self, export_import_app, monkeypatch, tmp_path):
        icon_dir = tmp_path / "icons" / "characters"
        icon_dir.mkdir(parents=True)
        raw = b"fake-avatar-bytes"
        (icon_dir / "trapper.webp").write_bytes(raw)
        monkeypatch.setattr(export_import_module, "get_static_dir", lambda: tmp_path)

        with export_import_app.app_context():
            char = db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first()
            char.avatar_local_path = "icons/characters/trapper.webp"
            db.session.commit()

            result = DatabaseExportImportService.export_database(targets=["killers"])
            exported = _flat(result)["killers"][0]

            assert exported["avatar_local_path"] == "icons/characters/trapper.webp"
            assert exported["avatar_local_path_data"] == base64.b64encode(raw).decode("ascii")

    def test_import_restores_character_avatar_file(self, export_import_app, monkeypatch, tmp_path):
        monkeypatch.setattr(export_import_module, "get_static_dir", lambda: tmp_path)
        raw = b"restored-avatar-bytes"

        with export_import_app.app_context():
            trapper = db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first()
            payload = {
                "data": {
                    "killers": [
                        {
                            "id": trapper.id,
                            "name": "The Trapper",
                            "chapter_id": trapper.chapter_id,
                            "power_name": "Bear Trap",
                            "avatar_local_path": "icons/characters/trapper.webp",
                            "avatar_local_path_data": base64.b64encode(raw).decode("ascii"),
                        }
                    ]
                }
            }
            DatabaseExportImportService.import_database(payload, mode="merge", targets=["killers"])

            written = tmp_path / "icons" / "characters" / "trapper.webp"
            assert written.read_bytes() == raw

    def test_export_omits_asset_bytes_when_include_assets_false(self, export_import_app, monkeypatch, tmp_path):
        icon_dir = tmp_path / "icons" / "characters"
        icon_dir.mkdir(parents=True)
        (icon_dir / "trapper.webp").write_bytes(b"bytes")
        monkeypatch.setattr(export_import_module, "get_static_dir", lambda: tmp_path)

        with export_import_app.app_context():
            char = db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first()
            char.avatar_local_path = "icons/characters/trapper.webp"
            db.session.commit()

            result = DatabaseExportImportService.export_database(targets=["killers"], include_assets=False)
            exported = _flat(result)["killers"][0]

            assert "avatar_local_path_data" not in exported


@pytest.mark.unit
class TestDatabaseExportImportUserAvatars:
    def test_export_import_roundtrips_uploaded_user_avatar_bytes(self, export_import_app, monkeypatch, tmp_path):
        monkeypatch.setattr(export_import_module, "get_static_dir", lambda: tmp_path)
        avatar_dir = tmp_path / "uploads" / "avatars"
        avatar_dir.mkdir(parents=True)
        raw = b"user-avatar-bytes"
        (avatar_dir / "avatar_u1_test.webp").write_bytes(raw)

        with export_import_app.app_context():
            user = db.session.scalars(select(User).where(User.username == "player_test")).first()
            user.avatar_url = "/api/v1/auth/avatar/file/avatar_u1_test.webp"
            db.session.commit()

            exported = DatabaseExportImportService.export_database(targets=["users"])
            row = next(u for u in _flat(exported)["users"] if u["username"] == "player_test")
            assert row["avatar_relative_path"] == "uploads/avatars/avatar_u1_test.webp"
            assert row["avatar_relative_path_data"] == base64.b64encode(raw).decode("ascii")

            (avatar_dir / "avatar_u1_test.webp").unlink()

            DatabaseExportImportService.import_database(exported, mode="merge", targets=["users"])

            assert (avatar_dir / "avatar_u1_test.webp").read_bytes() == raw

    def test_export_skips_avatar_bytes_for_default_avatar(self, export_import_app, monkeypatch, tmp_path):
        monkeypatch.setattr(export_import_module, "get_static_dir", lambda: tmp_path)

        with export_import_app.app_context():
            exported = DatabaseExportImportService.export_database(targets=["users"])
            row = next(u for u in _flat(exported)["users"] if u["username"] == "admin_test")

            assert row["avatar_relative_path"] is None
            assert row["avatar_relative_path_data"] is None
