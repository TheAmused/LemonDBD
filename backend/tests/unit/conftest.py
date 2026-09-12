# backend/tests/unit/conftest.py
import os
import pytest
from typing import Generator
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy import select

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Chapter, Killer, Perk, Survivor, User


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


def make_chapter(db_session: Session, name: str = "Test Chapter") -> Chapter:
    """A chapter for characters to belong to.

    `survivors.chapter_id` and `killers.chapter_id` are NOT NULL -- every one
    of the 98 real characters resolves to a chapter, Base Game included -- so a
    test that builds a character has to build one of these first.
    """
    chapter = db_session.scalars(select(Chapter).where(Chapter.name == name)).first()
    if chapter is None:
        chapter = Chapter(name=name)
        db_session.add(chapter)
        db_session.flush()
    return chapter


@pytest.fixture
def seed_chaos_roster(db_session: Session) -> list[Killer]:
    """Seed a representative set of Killers and Perks for Chaos mode testing."""
    killers_data = [
        ("The Trapper", ["Brutal Strength", "Agitation", "Unnerving Presence"]),
        ("The Wraith", ["Predator", "Bloodhound", "Shadowborn"]),
        ("The Hillbilly", ["Enduring", "Lightborn", "Tinkerer"]),
        ("The Nurse", ["A Nurse's Calling", "Thanatophobia", "Stridor"]),
        ("The Huntress", ["Beast of Prey", "Territorial Imperative", "Hex: Huntress Lullaby"]),
        ("The Shape", ["Save the Best for Last", "Play with Your Food", "Dying Light"]),
    ]
    chapter = make_chapter(db_session)
    created_characters: list[Killer] = []

    for killer_name, perks in killers_data:
        # `killers` is its own table now, so there is no role to pass: the
        # table is the role. `power_name` is NOT NULL here, which it could not
        # be while 54 survivors shared the table.
        char = Killer(name=killer_name, chapter_id=chapter.id, power_name=f"{killer_name} Power")
        db_session.add(char)
        db_session.flush()
        created_characters.append(char)

        for perk_name in perks:
            db_session.add(
                Perk(
                    name=perk_name,
                    killer_id=char.id,
                    is_teachable=True,
                    role="Killer",
                )
            )

    db_session.commit()
    return created_characters
