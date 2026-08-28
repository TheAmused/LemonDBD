# backend/tests/unit/api/test_db_export_import.py
import io
import json
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import create_app
from app.core.extensions import db
from app.core.security import generate_token
from app.models.character import Character
from app.models.perk import Perk
from app.models.user import User


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

        char = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
        if not char:
            char = Character(name="The Trapper", role="Killer", short_name="Trapper")
            db.session.add(char)

        perk = db.session.scalars(select(Perk).where(Perk.name == "Brutal Strength")).first()
        if not perk:
            perk = Perk(name="Brutal Strength", category="Killer")
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
        assert "data" in data
        assert "characters" in data["data"]
        assert "perks" in data["data"]
        assert len(data["data"]["characters"]) >= 1
        assert any(c["name"] == "The Trapper" for c in data["data"]["characters"])

    def test_export_database_selective(self, client: FlaskClient, admin_token: str) -> None:
        res = client.get(
            "/api/v1/admin/database/export?targets=perks",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "perks" in data["data"]
        assert "characters" not in data["data"]

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
        payload = {
            "version": "1.0",
            "data": {
                "characters": [
                    {
                        "name": "The Wraith",
                        "role": "Killer",
                        "real_name": "Philip Ojomo",
                        "translations": {"pl": {"name": "Upiór"}},
                    }
                ],
                "perks": [
                    {
                        "name": "Shadowborn",
                        "category": "Killer",
                        "character_name": "The Wraith",
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
        assert res_data["summary"]["characters"]["created"] == 1
        assert res_data["summary"]["perks"]["created"] == 1

        char = db.session.scalars(select(Character).where(Character.name == "The Wraith")).first()
        assert char is not None
        assert char.real_name == "Philip Ojomo"
        assert char.translations == {"pl": {"name": "Upiór"}}

        perk = db.session.scalars(select(Perk).where(Perk.name == "Shadowborn")).first()
        assert perk is not None
        assert perk.character_id == char.id

    def test_import_database_multipart_file(self, client: FlaskClient, admin_token: str) -> None:
        backup = {
            "version": "1.0",
            "data": {
                "characters": [
                    {"name": "Dwight Fairfield", "role": "Survivor", "short_name": "Dwight"}
                ],
                "items": [
                    {"name": "Med-Kit", "category": "Medical", "role": "Survivor"}
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
        assert res_data["summary"]["characters"]["created"] == 1
        assert res_data["summary"]["items"]["created"] == 1

    def test_import_database_replace_mode(self, client: FlaskClient, admin_token: str) -> None:
        assert db.session.scalars(select(Character).where(Character.name == "The Trapper")).first() is not None

        payload = {
            "characters": [
                {"name": "The Nurse", "role": "Killer", "short_name": "Nurse"}
            ]
        }

        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"mode": "replace", "targets": ["characters"], "data": payload},
        )
        assert res.status_code == 200

        assert db.session.scalars(select(Character).where(Character.name == "The Trapper")).first() is None
        assert db.session.scalars(select(Character).where(Character.name == "The Nurse")).first() is not None

    def test_import_database_invalid_payload(self, client: FlaskClient, admin_token: str) -> None:
        res = client.post(
            "/api/v1/admin/database/import",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            data="not json",
        )
        assert res.status_code == 400
