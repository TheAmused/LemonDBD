# backend/tests/unit/api/test_db_export_import.py
import base64
import io
import json
from decimal import Decimal
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import create_app
from app.core.extensions import db
from app.core.security import generate_token
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.perk import Perk
from app.models.user import User
from app.services.db import export_import as export_import_module
from app.services.db.export_import import DatabaseExportImportService
from tests.unit.conftest import make_chapter


def _flat(exported: dict) -> dict:
    """Flatten an export payload's groups into a single dict for easy assertions.
    Supports the current groups-only format and legacy data-key format."""
    if "groups" in exported:
        result: dict = {}
        for group_dict in exported["groups"].values():
            if isinstance(group_dict, dict):
                result.update(group_dict)
        return result
    return exported.get("data", exported)


@pytest.fixture
def export_import_app() -> Flask:
    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with test_app.app_context():
        db.create_all()
        admin_user = db.session.scalars(select(User).where(User.username == "admin_test")).first()
        if not admin_user:
            admin_user = User(
                username="admin_test",
                email="admin@test.com",
                password_hash="hash",
                role="admin",
            )
            db.session.add(admin_user)

        reg_user = db.session.scalars(select(User).where(User.username == "player_test")).first()
        if not reg_user:
            reg_user = User(
                username="player_test",
                email="player@test.com",
                password_hash="hash",
                role="user",
            )
            db.session.add(reg_user)

        # The Trapper is a `killers` row now, not a `characters` row with
        # role="Killer": the table is the role. `chapter_id` and `power_name`
        # are both NOT NULL here, which they could not be while 54 survivors
        # shared the table, so the chapter has to exist first.
        char = db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first()
        if not char:
            chapter = make_chapter(db.session)
            char = Killer(name="The Trapper", chapter_id=chapter.id, power_name="Bear Trap")
            db.session.add(char)

        perk = db.session.scalars(select(Perk).where(Perk.name == "Brutal Strength")).first()
        if not perk:
            perk = Perk(name="Brutal Strength", role="Killer")
            db.session.add(perk)

        db.session.commit()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(export_import_app: Flask) -> FlaskClient:
    return export_import_app.test_client()


@pytest.fixture
def admin_token(export_import_app: Flask) -> str:
    with export_import_app.app_context():
        user = db.session.scalars(select(User).where(User.username == "admin_test")).first()
        return generate_token(user.id, role=user.role)


@pytest.fixture
def user_token(export_import_app: Flask) -> str:
    with export_import_app.app_context():
        user = db.session.scalars(select(User).where(User.username == "player_test")).first()
        return generate_token(user.id, role=user.role)


@pytest.mark.unit
class TestDatabaseExportImport:
    """Tests for administrative full database export JSON generation and merging."""

    def test_export_database_all(self, client: FlaskClient, admin_token: str) -> None:
        res = client.get(
            "/api/v1/admin/database/export",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["version"] == "1.0"
        assert "groups" in data
        assert "data" not in data, "export should no longer include a redundant flat 'data' key"
        assert "content" in data["groups"]
        # One "characters" key became two, because the two tables have separate
        # id spaces and a killer row carries seven power columns a survivor row
        # does not.
        assert "survivors" in data["groups"]["content"]
        assert "killers" in data["groups"]["content"]
        assert "perks" in data["groups"]["content"]
        assert len(data["groups"]["content"]["killers"]) >= 1
        assert any(c["name"] == "The Trapper" for c in data["groups"]["content"]["killers"])

    def test_export_database_selective(self, client: FlaskClient, admin_token: str) -> None:
        res = client.get(
            "/api/v1/admin/database/export?targets=perks",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "groups" in data
        assert "perks" in data["groups"].get("content", {})
        assert "survivors" not in data["groups"].get("content", {})
        assert "killers" not in data["groups"].get("content", {})

    def test_export_database_download_header(self, client: FlaskClient, admin_token: str) -> None:
        res = client.get(
            "/api/v1/admin/database/export?download=true",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        assert "attachment; filename=lemondbd_export_" in res.headers.get("Content-Disposition", "")

    def test_export_database_unauthorized(self, client: FlaskClient, user_token: str) -> None:
        res = client.get(
            "/api/v1/admin/database/export",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

        res_no_auth = client.get("/api/v1/admin/database/export")
        assert res_no_auth.status_code == 401

    def test_import_database_merge_json_body(self, client: FlaskClient, admin_token: str) -> None:
        chapter_id = db.session.scalars(select(Chapter)).first().id
        # Every row is addressed by its own integer id -- no name comparison,
        # no slug lookup -- so an import payload that omits `id` is counted as
        # skipped rather than created. The Trapper holds killer id 1, and the
        # perk fixture holds perk id 1.
        payload = {
            "version": "1.0",
            "data": {
                "killers": [
                    {
                        "id": 2,
                        "name": "The Wraith",
                        "chapter_id": chapter_id,
                        "power_name": "Wailing Bell",
                        "real_name": "Philip Ojomo",
                        "translations": {"pl": {"name": "Upiór"}},
                    }
                ],
                "perks": [
                    {
                        "id": 2,
                        "name": "Shadowborn",
                        "role": "Killer",
                        "killer_id": 2,
                        "description": "Increases FOV.",
                    }
                ],
            },
        }

        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "merge", "data": payload["data"]},
        )
        assert res.status_code == 200
        res_data = res.get_json()
        assert res_data["status"] == "success"
        assert res_data["summary"]["killers"]["created"] == 1
        assert res_data["summary"]["perks"]["created"] == 1

        char = db.session.scalars(select(Killer).where(Killer.name == "The Wraith")).first()
        assert char is not None
        assert char.real_name == "Philip Ojomo"
        assert char.translations == {"pl": {"name": "Upiór"}}
        assert char.power_name == "Wailing Bell"

        perk = db.session.scalars(select(Perk).where(Perk.name == "Shadowborn")).first()
        assert perk is not None
        # `character_id` is a read-only property over the `survivor_id` /
        # `killer_id` pair, so this still asserts that the perk landed on the
        # killer the payload named.
        assert perk.killer_id == char.id
        assert perk.character_id == char.id

    def test_import_database_multipart_file(self, client: FlaskClient, admin_token: str) -> None:
        chapter_id = db.session.scalars(select(Chapter)).first().id
        # `items.category_id` is a NOT NULL foreign key now, so the class the
        # Med-Kit belongs to has to travel in the same file. The import runs
        # `item_categories` before `items` for exactly that reason.
        backup = {
            "version": "1.0",
            "data": {
                "survivors": [
                    {"id": 1, "name": "Dwight Fairfield", "chapter_id": chapter_id}
                ],
                "item_categories": [
                    {"id": 1, "name": "Med-Kits", "addon_target_label": "Med-Kits", "role": "Survivor"}
                ],
                "items": [
                    {"id": 1, "name": "Med-Kit", "category_id": 1}
                ],
            },
        }
        file_bytes = io.BytesIO(json.dumps(backup).encode("utf-8"))

        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}"},
            data={"file": (file_bytes, "backup.json"), "mode": "merge"},
            content_type="multipart/form-data",
        )
        assert res.status_code == 200
        res_data = res.get_json()
        assert res_data["status"] == "success"
        assert res_data["summary"]["survivors"]["created"] == 1
        assert res_data["summary"]["items"]["created"] == 1

    def test_import_database_replace_mode(self, client: FlaskClient, admin_token: str) -> None:
        chapter_id = db.session.scalars(select(Chapter)).first().id
        assert db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first() is not None

        payload = {
            "killers": [
                {
                    "id": 1,
                    "name": "The Nurse",
                    "chapter_id": chapter_id,
                    "power_name": "Spencer's Last Breath",
                }
            ]
        }

        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "replace", "targets": ["killers"], "data": payload},
        )
        assert res.status_code == 200

        assert db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first() is None
        assert db.session.scalars(select(Killer).where(Killer.name == "The Nurse")).first() is not None

    def test_import_database_invalid_payload(self, client: FlaskClient, admin_token: str) -> None:
        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            data="not json",
        )
        assert res.status_code == 400

    def test_export_database_includes_realms(self, client: FlaskClient, admin_token: str) -> None:
        realm = Realm(
            name="Autohaven Wreckers",
            image_url="https://example.com/autohaven.png",
            image_local_path="realms/autohaven_wreckers.png",
        )
        db.session.add(realm)
        db.session.commit()

        res = client.get(
            "/api/v1/admin/database/export?targets=maps",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "realms" in data["groups"]["content"]
        assert data["counts"]["realms"] == 1
        assert data["groups"]["content"]["realms"][0]["name"] == "Autohaven Wreckers"
        assert data["groups"]["content"]["realms"][0]["image_local_path"] == "realms/autohaven_wreckers.png"

    def test_import_database_merge_restores_realms_under_maps_target_only(
        self, client: FlaskClient, admin_token: str
    ) -> None:
        """Regression test: a restore call whose targets list only contains
        "maps" (never "realms" -- the real-world shape for both a pre-Fix-3
        backup with no "realms" key at all, and any caller that never learned
        "realms" is a separate target) must still restore realm rows present
        in the import data. The restore-from-import gate must match the
        clear-before-restore gate ("maps" in target_keys), not a narrower,
        separate "realms" in target_keys check.
        """
        # The row carries an `id`: the import resolves a realm with
        # `db.session.get(Realm, row["id"])` and nothing else, and counts a row
        # without one as skipped rather than guessing which realm it means.
        payload = {
            "realms": [
                {
                    "id": 1,
                    "name": "Ormond",
                    "image_url": "https://example.com/ormond.png",
                    "image_local_path": "realms/ormond.png",
                }
            ]
        }

        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "merge", "targets": ["maps"], "data": payload},
        )
        assert res.status_code == 200
        res_data = res.get_json()
        assert res_data["summary"]["realms"]["created"] == 1

        realm = db.session.scalars(select(Realm).where(Realm.name == "Ormond")).first()
        assert realm is not None
        assert realm.image_local_path == "realms/ormond.png"

        payload["realms"][0]["image_url"] = "https://example.com/ormond-v2.png"
        res2 = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "merge", "targets": ["maps"], "data": payload},
        )
        assert res2.status_code == 200
        assert res2.get_json()["summary"]["realms"]["updated"] == 1
        db.session.refresh(realm)
        assert realm.image_url == "https://example.com/ormond-v2.png"

    def test_import_database_replace_mode_old_backup_without_realms_key_degrades_gracefully(
        self, client: FlaskClient, admin_token: str
    ) -> None:
        """A pre-Fix-3 backup file has "maps" data but no "realms" key at
        all. Restoring it in replace mode with targets=["maps"] clears
        existing Realm rows (same as it always cleared MapRealm under the
        "maps" key -- `map_tiles` and `map_objectives` are dropped tables now)
        but must not error just because there is nothing to restore them from.
        """
        db.session.add(Realm(name="Haddonfield", image_url="", image_local_path=""))
        db.session.commit()
        assert db.session.scalars(select(Realm).where(Realm.name == "Haddonfield")).first() is not None

        payload = {"survivors": []}  # no "maps" or "realms" keys at all, like an old backup
        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "replace", "targets": ["maps"], "data": payload},
        )
        assert res.status_code == 200
        assert "realms" not in res.get_json()["summary"]

        assert db.session.scalars(select(Realm)).first() is None

    def test_import_database_replace_mode_clears_realms(
        self, client: FlaskClient, admin_token: str
    ) -> None:
        db.session.add(Realm(name="Springwood", image_url="", image_local_path=""))
        db.session.commit()
        assert db.session.scalars(select(Realm).where(Realm.name == "Springwood")).first() is not None

        payload = {
            "realms": [
                {"id": 1, "name": "Yamaoka Estate", "image_url": "", "image_local_path": ""}
            ]
        }
        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "replace", "targets": ["maps"], "data": payload},
        )
        assert res.status_code == 200

        assert db.session.scalars(select(Realm).where(Realm.name == "Springwood")).first() is None
        assert db.session.scalars(select(Realm).where(Realm.name == "Yamaoka Estate")).first() is not None


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
class TestDatabaseExportImportOfferingsAndChapters:
    def test_export_import_offerings_and_chapters_roundtrip(self, export_import_app):
        with export_import_app.app_context():
            from app.models.equipment import Offering
            from sqlalchemy import delete as sa_delete

            # `category` is gone from the column list: it restated `role` and
            # contradicted it in six rows, so it is derived from `role` now.
            db.session.add(Offering(name="Bloody Party Streamers", role="Killer"))
            db.session.add(Chapter(name="A Nightmare on Elm Street"))
            db.session.commit()

            # The fixture's Killer needs a chapter of its own -- `chapter_id`
            # is NOT NULL on both character tables -- so the chapters table is
            # never empty here and the count is not a constant.
            chapter_count = len(db.session.scalars(select(Chapter)).all())

            exported = DatabaseExportImportService.export_database(targets=["offerings", "chapters"])
            assert exported["counts"]["offerings"] == 1
            assert exported["counts"]["chapters"] == chapter_count

            db.session.execute(sa_delete(Offering))
            db.session.execute(sa_delete(Chapter))
            db.session.commit()

            summary = DatabaseExportImportService.import_database(exported, mode="merge", targets=["offerings", "chapters"])
            assert summary["summary"]["offerings"]["created"] == 1
            assert summary["summary"]["chapters"]["created"] == chapter_count
            assert db.session.scalars(select(Offering)).first().name == "Bloody Party Streamers"
            assert db.session.scalar(select(Chapter).where(Chapter.name == "A Nightmare on Elm Street")) is not None


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


@pytest.mark.unit
class TestDatabaseExportImportSettingsTables:
    def test_export_import_settings_tables_roundtrip(self, export_import_app):
        with export_import_app.app_context():
            from sqlalchemy import delete as sa_delete
            from app.models.minigames import DraftSession
            from app.models.admin import ChallengeModeSetting
            from app.models.user import UserShowcase

            user = db.session.scalars(select(User).where(User.username == "player_test")).first()
            db.session.add(DraftSession(room_code="ABC123"))
            db.session.add(ChallengeModeSetting(mode="gauntlet", is_enabled=True))
            db.session.add(UserShowcase(user_id=user.id, player_title="The Camper"))
            db.session.commit()

            targets = [
                "draft_sessions",
                "challenge_mode_settings", "user_showcases",
            ]
            exported = DatabaseExportImportService.export_database(targets=targets)
            for t in targets:
                assert exported["counts"][t] == 1

            db.session.execute(sa_delete(DraftSession))
            db.session.execute(sa_delete(ChallengeModeSetting))
            db.session.execute(sa_delete(UserShowcase))
            db.session.commit()

            summary = DatabaseExportImportService.import_database(exported, mode="merge", targets=targets)
            for t in targets:
                assert summary["summary"][t]["created"] == 1

            assert db.session.scalars(select(UserShowcase)).first().user_id == user.id


@pytest.mark.unit
class TestDatabaseExportImportAuditLogAndChangelog:
    def test_export_import_audit_log_and_changelog_insert_only(self, export_import_app):
        with export_import_app.app_context():
            from app.models.admin import AdminAuditLog
            from app.models.changelog import ChangelogPost

            admin = db.session.scalars(select(User).where(User.username == "admin_test")).first()
            db.session.add(AdminAuditLog(admin_user_id=admin.id, action="disable_character", target_type="character", target_id="1"))
            db.session.add(ChangelogPost(title="Launch", content_html="<p>Hello</p>", author_id=admin.id, author_name="admin_test"))
            db.session.commit()

            exported = DatabaseExportImportService.export_database(targets=["admin_audit_logs", "changelog_posts"])
            assert exported["counts"]["admin_audit_logs"] == 1
            assert exported["counts"]["changelog_posts"] == 1
            assert _flat(exported)["admin_audit_logs"][0]["admin_username"] == "admin_test"

            summary = DatabaseExportImportService.import_database(
                exported, mode="merge", targets=["admin_audit_logs", "changelog_posts"]
            )
            assert summary["summary"]["admin_audit_logs"]["created"] == 1
            assert summary["summary"]["changelog_posts"]["created"] == 1
            assert len(db.session.scalars(select(AdminAuditLog)).all()) == 2
            assert len(db.session.scalars(select(ChangelogPost)).all()) == 2


@pytest.mark.unit
class TestDatabaseExportImportSmashOrPass:
    def test_export_import_smash_or_pass_roster_roundtrip(self, export_import_app):
        with export_import_app.app_context():
            from sqlalchemy import delete as sa_delete
            from app.models.smash_or_pass import Roster, Entity, EntityStat, Vote

            roster = Roster(slug="canon", name_i18n_key="roster.canon.name", description_i18n_key="roster.canon.desc")
            db.session.add(roster)
            db.session.flush()
            entity = Entity(roster_id=roster.id, slug="ada_wong", name="Ada Wong", role="Survivor")
            db.session.add(entity)
            db.session.flush()
            db.session.add(EntityStat(entity_id=entity.id, smash_count=5, pass_count=1))
            db.session.add(Vote(entity_id=entity.id, vote_type="smash", session_id="s1"))
            db.session.commit()

            exported = DatabaseExportImportService.export_database(targets=["rosters"])
            assert exported["counts"]["rosters"] == 1
            roster_row = _flat(exported)["rosters"][0]
            assert roster_row["slug"] == "canon"
            assert len(roster_row["entities"]) == 1
            assert roster_row["entities"][0]["stat"]["smash_count"] == 5
            assert len(roster_row["entities"][0]["votes"]) == 1

            db.session.execute(sa_delete(Vote))
            db.session.execute(sa_delete(EntityStat))
            db.session.execute(sa_delete(Entity))
            db.session.execute(sa_delete(Roster))
            db.session.commit()

            summary = DatabaseExportImportService.import_database(
                exported, mode="merge", targets=["rosters"]
            )
            assert summary["summary"]["rosters"]["created"] == 1

            restored_entity = db.session.scalars(select(Entity).where(Entity.slug == "ada_wong")).one()
            assert restored_entity.stat.smash_count == 5
            assert len(db.session.scalars(select(Vote).where(Vote.entity_id == restored_entity.id)).all()) == 1


@pytest.mark.unit
class TestDatabaseExportRouteIncludeAssets:
    def test_export_route_supports_include_assets_false(self, client: FlaskClient, admin_token: str, export_import_app, monkeypatch, tmp_path):
        monkeypatch.setattr(export_import_module, "get_static_dir", lambda: tmp_path)

        with export_import_app.app_context():
            char = db.session.scalars(select(Killer).where(Killer.name == "The Trapper")).first()
            char.avatar_local_path = "icons/characters/trapper.webp"
            db.session.commit()

        resp = client.get(
            "/api/v1/admin/database/export?targets=killers&include_assets=false",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        payload = resp.get_json()
        assert "avatar_local_path_data" not in _flat(payload)["killers"][0]


@pytest.mark.unit
class TestDatabaseExportImportGroupsAndUpsertHardening:
    def test_export_database_organized_into_groups(self, export_import_app):
        with export_import_app.app_context():
            exported = DatabaseExportImportService.export_database()
            assert "groups" in exported
            assert "data" not in exported, "export_database should no longer return a redundant flat 'data' key"
            assert "content" in exported["groups"]
            assert "users" in exported["groups"]

            content_group = exported["groups"]["content"]
            assert "survivors" in content_group
            assert "killers" in content_group
            assert "perks" in content_group

            users_group = exported["groups"]["users"]
            assert "users" in users_group

    def test_import_database_from_grouped_payload(self, export_import_app):
        with export_import_app.app_context():
            chapter_id = db.session.scalars(select(Chapter)).first().id
            payload = {
                "version": "1.0",
                "groups": {
                    "content": {
                        "survivors": [
                            {"id": 1, "name": "Grouped Dwight", "chapter_id": chapter_id}
                        ]
                    }
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["survivors"])
            assert summary["summary"]["survivors"]["created"] == 1
            char = db.session.scalar(select(Survivor).where(Survivor.name == "Grouped Dwight"))
            assert char is not None
            assert char.id == 1
            assert char.chapter_id == chapter_id

    def test_import_database_upsert_characters_updates_existing_row(self, export_import_app):
        """An incoming row whose id already exists updates that row in place.

        This used to key on `wiki_slug`, a column that held `name` respelled
        for all 98 characters and is gone. Rows are addressed by their integer
        primary key now, and names stay unique across `survivors` and
        `killers`, so a rename is visible as exactly one row changing name --
        never as a second row appearing beside the old one.
        """
        with export_import_app.app_context():
            chapter_id = db.session.scalars(select(Chapter)).first().id
            char = Killer(
                id=7,
                name="Old Trapper Name",
                chapter_id=chapter_id,
                power_name="Bear Trap",
            )
            db.session.add(char)
            db.session.commit()

            payload = {
                "data": {
                    "killers": [
                        {
                            "id": 7,
                            "name": "Updated Trapper Name",
                            "movement_speed_ms": "4.6",
                        }
                    ]
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["killers"])
            assert summary["summary"]["killers"]["updated"] == 1
            assert summary["summary"]["killers"]["created"] == 0

            updated_char = db.session.scalar(select(Killer).where(Killer.name == "Updated Trapper Name"))
            assert updated_char is not None
            assert updated_char.id == 7
            # The old name resolves to nothing: the row was renamed, not copied.
            assert db.session.scalar(select(Killer).where(Killer.name == "Old Trapper Name")) is None
            # `movement_speed_ms` arrives as a string and lands in a NUMERIC
            # column; the display form the old `movement_speed` column held is
            # rendered from it.
            assert updated_char.movement_speed_ms == Decimal("4.6")
            assert updated_char.movement_speed == "4.6 m/s (115%)"

    def test_import_database_upsert_users_safe_email_conflict(self, export_import_app):
        with export_import_app.app_context():
            u1 = User(username="user_alpha", email="alpha@conflict.com", password_hash="h1", role="user")
            u2 = User(username="user_beta", email="beta@conflict.com", password_hash="h2", role="user")
            db.session.add_all([u1, u2])
            db.session.commit()

            # Attempt to update user_beta with user_alpha's email; should gracefully avoid IntegrityError
            payload = {
                "data": {
                    "users": [
                        {
                            "username": "user_beta",
                            "email": "alpha@conflict.com",
                            "role": "admin"
                        }
                    ]
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["users"])
            assert summary["summary"]["users"]["updated"] == 1

            reloaded_beta = db.session.scalar(select(User).where(User.username == "user_beta"))
            assert reloaded_beta.role == "admin"
            # Email was protected from causing a unique constraint crash
            assert reloaded_beta.email == "beta@conflict.com"

    def test_import_database_upsert_draft_sessions(self, export_import_app):
        with export_import_app.app_context():
            from app.models.minigames import DraftSession
            session = DraftSession(
                room_code="ROOM_TEST_UPSERT",
                phase="bans",
                banned_perks="[]",
                picked_survivor_perks="[]",
                picked_killer_perks="[]",
            )
            db.session.add(session)
            db.session.commit()

            payload = {
                "data": {
                    "draft_sessions": [
                        {
                            "room_code": "ROOM_TEST_UPSERT",
                            "phase": "picks",
                            "banned_perks": ["Sprint Burst"],
                        }
                    ]
                }
            }
            summary = DatabaseExportImportService.import_database(payload, mode="merge", targets=["draft_sessions"])
            assert summary["summary"]["draft_sessions"]["updated"] == 1
            assert summary["summary"]["draft_sessions"]["created"] == 0

            reloaded_session = db.session.scalar(
                select(DraftSession).where(DraftSession.room_code == "ROOM_TEST_UPSERT")
            )
            assert reloaded_session.phase == "picks"
            assert "Sprint Burst" in reloaded_session.banned_perks

    def test_import_database_partial_perks_update_descriptions_only(self, export_import_app):
        with export_import_app.app_context():
            # Setup: ensure 2 existing perks with baseline data
            p1 = db.session.scalar(select(Perk).where(Perk.name == "Brutal Strength"))
            p1.description = "Original Brutal Strength Description"
            p1.role = "Killer"

            p2 = db.session.scalar(select(Perk).where(Perk.name == "Sprint Burst"))
            if not p2:
                p2 = Perk(name="Sprint Burst", role="Survivor", description="Original Sprint Burst Description")
                db.session.add(p2)
            else:
                p2.description = "Original Sprint Burst Description"

            # Baseline 3rd perk that shouldn't be touched
            p3 = db.session.scalar(select(Perk).where(Perk.name == "Dead Hard"))
            if not p3:
                p3 = Perk(name="Dead Hard", role="Survivor", description="Original Dead Hard Description")
                db.session.add(p3)

            db.session.commit()

            # User edits ONLY the 2 perks with updated descriptions in a partial .json.
            # The rows carry their ids because that is the only thing the import
            # consults to decide which row a payload entry is; the name is here
            # for the reader.
            partial_payload = {
                "perks": [
                    {
                        "id": p1.id,
                        "name": "Brutal Strength",
                        "description": "Custom updated description for Brutal Strength."
                    },
                    {
                        "id": p2.id,
                        "name": "Sprint Burst",
                        "description": "Custom updated description for Sprint Burst."
                    }
                ]
            }

            # Import in merge mode (default)
            summary = DatabaseExportImportService.import_database(partial_payload, mode="merge", targets=["perks"])

            assert summary["status"] == "success"
            assert summary["summary"]["perks"]["updated"] == 2
            assert summary["summary"]["perks"]["created"] == 0

            # Verify the 2 perks have the new descriptions
            reloaded_p1 = db.session.scalar(select(Perk).where(Perk.name == "Brutal Strength"))
            assert reloaded_p1.description == "Custom updated description for Brutal Strength."
            assert reloaded_p1.role == "Killer"  # `category` renamed to `role`, preserved untouched!

            reloaded_p2 = db.session.scalar(select(Perk).where(Perk.name == "Sprint Burst"))
            assert reloaded_p2.description == "Custom updated description for Sprint Burst."
            assert reloaded_p2.role == "Survivor"  # Preserved untouched!

            # Verify untouched perks in the database are intact
            reloaded_p3 = db.session.scalar(select(Perk).where(Perk.name == "Dead Hard"))
            assert reloaded_p3.description == "Original Dead Hard Description"

    def test_export_import_character_created_at_roundtrip(self, export_import_app):
        """Killer.created_at (and Survivor.created_at) drive the roster
        full-roster milestone's cutoff -- a restore that silently reset it to
        "now" for every character would collapse that feature's whole notion
        of "who existed before whom"."""
        from datetime import datetime, timezone
        from app.services.db.serializers import serialize_killer

        with export_import_app.app_context():
            chapter = db.session.scalar(select(Chapter)) or Chapter(name="Roundtrip Chapter")
            if chapter.id is None:
                db.session.add(chapter)
                db.session.flush()

            trapper = Killer(
                name="Export Roundtrip Trapper",
                chapter_id=chapter.id,
                power_name="Bear Trap",
                created_at=datetime(2020, 5, 1, tzinfo=timezone.utc),
            )
            db.session.add(trapper)
            db.session.commit()

            exported = serialize_killer(trapper)
            assert exported["created_at"].startswith("2020-05-01T00:00:00")

            db.session.delete(trapper)
            db.session.commit()

            DatabaseExportImportService.import_database(
                {"killers": [exported]}, mode="merge", targets=["killers"]
            )

            restored = db.session.scalar(
                select(Killer).where(Killer.name == "Export Roundtrip Trapper")
            )
            assert restored.created_at.replace(tzinfo=None) == datetime(2020, 5, 1)


