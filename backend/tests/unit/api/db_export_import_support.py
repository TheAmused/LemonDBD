# backend/tests/unit/api/db_export_import_support.py
"""App, client and token fixtures shared by the database export/import test modules."""
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from app import create_app
from app.core.extensions import db
from app.core.security import generate_token
from app.models.character import Killer
from app.models.perk import Perk
from app.models.user import User
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
