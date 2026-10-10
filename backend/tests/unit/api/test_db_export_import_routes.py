# backend/tests/unit/api/test_db_export_import_routes.py
"""Export and import through the admin HTTP routes."""
import io
import json
import pytest
from flask.testing import FlaskClient
from sqlalchemy import select
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer
from app.models.map import Realm
from app.models.perk import Perk
from app.services.db import export_import as export_import_module
from tests.unit.api.db_export_import_support import (
    _flat,
)
from tests.unit.api.db_export_import_support import (  # noqa: F401  (pytest fixtures)
    export_import_app,
    client,
    admin_token,
    user_token,
)


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
