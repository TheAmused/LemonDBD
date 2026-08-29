# backend/tests/unit/conftest.py
import os
import pytest
from typing import Generator
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk, User


@pytest.fixture(scope="session")
def app() -> Generator[Flask, None, None]:
    """Create and configure a Flask application instance for unit testing."""
    flask_app = create_app(TestingConfig)
    flask_app.config.update(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "unit-test-super-secret-key-3.14",
            "WTF_CSRF_ENABLED": False,
        }
    )
    with flask_app.app_context():
        yield flask_app


@pytest.fixture(autouse=True)
def test_db(app: Flask) -> Generator[object, None, None]:
    """Provide clean database schema per test with automatic rollback and teardown."""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()


@pytest.fixture
def db_session(test_db: object) -> Session:
    """Provide direct access to the active SQLAlchemy scoped session."""
    return db.session


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Provide a Flask test client configured for JSON payloads."""
    return app.test_client()


@pytest.fixture
def sample_user(db_session: Session) -> User:
    """Create and commit a standard test user."""
    user = User(
        username="standard_tester",
        email="tester@example.com",
        password_hash="hashed_pw_12345",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def seed_chaos_roster(db_session: Session) -> list[Character]:
    """Seed a representative set of Killers and Perks for Chaos mode testing."""
    killers_data = [
        ("The Trapper", ["Brutal Strength", "Agitation", "Unnerving Presence"]),
        ("The Wraith", ["Predator", "Bloodhound", "Shadowborn"]),
        ("The Hillbilly", ["Enduring", "Lightborn", "Tinkerer"]),
        ("The Nurse", ["A Nurse's Calling", "Thanatophobia", "Stridor"]),
        ("The Huntress", ["Beast of Prey", "Territorial Imperative", "Hex: Huntress Lullaby"]),
        ("The Shape", ["Save the Best for Last", "Play with Your Food", "Dying Light"]),
    ]
    created_characters: list[Character] = []

    for killer_name, perks in killers_data:
        char = Character(name=killer_name, role="Killer")
        db_session.add(char)
        db_session.flush()
        created_characters.append(char)

        for perk_name in perks:
            db_session.add(
                Perk(
                    name=perk_name,
                    character_id=char.id,
                    is_teachable=True,
                    category="Killer",
                )
            )

    db_session.commit()
    return created_characters
