# backend/tests/unit/conftest.py
import os
import pytest
from typing import Generator
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
# Flask-Mail reads its sender when the app is created, and the config falls back to the developer's
# .env.dev for it. Pinning it here, before the app module is imported, makes the mail tests behave
# the same on every machine and in CI (TESTING already keeps Flask-Mail from really sending).
os.environ["MAIL_DEFAULT_SENDER"] = "noreply@lemondbd.test"

# Password and recovery-code hashing: werkzeug's default (scrypt) costs ~50 ms a call on purpose,
# and the suite registers thousands of users and hashes ten recovery codes per 2FA test. A one-
# iteration PBKDF2 keeps every hash real (check_password_hash still verifies it) at a fraction of
# the cost. It is patched on werkzeug before the app is imported, because the app imports the
# function by name. Production code is untouched; nothing in the unit suite depends on the method.
import werkzeug.security as _werkzeug_security  # noqa: E402

_real_generate_password_hash = _werkzeug_security.generate_password_hash


def _fast_generate_password_hash(password: str, method: str = "pbkdf2:sha256:1", salt_length: int = 16) -> str:
    return _real_generate_password_hash(password, method=method, salt_length=salt_length)


_werkzeug_security.generate_password_hash = _fast_generate_password_hash

from sqlalchemy import select

from app import create_app
from app.core import redis_cache
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Chapter, Killer, Perk, Survivor, User


@pytest.fixture(scope="session")
def app() -> Generator[Flask, None, None]:
    """Create and configure a Flask application instance for unit testing."""
    import tempfile

    flask_app = create_app(TestingConfig)
    flask_app.config.update(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "unit-test-super-secret-key-3.14",
            "WTF_CSRF_ENABLED": False,
            # Screenshots written by tests never land in the checkout.
            "BUG_REPORT_UPLOAD_DIR": tempfile.mkdtemp(prefix="lemondbd-bug-uploads-"),
        }
    )
    with flask_app.app_context():
        yield flask_app


def _empty_all_tables() -> None:
    """Delete every row, children before parents, and reset SQLite's AUTOINCREMENT counters.

    Emptying the tables is what makes ids start from 1 again: SQLite hands out
    max(rowid) + 1 for an INTEGER PRIMARY KEY, so tests that expect a first row
    to be id 1 behave exactly as they did when the schema was rebuilt per test.
    """
    with db.engine.begin() as conn:
        conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
        for table in reversed(db.metadata.sorted_tables):
            conn.execute(table.delete())
        has_sequence = conn.exec_driver_sql(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
        ).first()
        if has_sequence:
            conn.exec_driver_sql("DELETE FROM sqlite_sequence")
        conn.exec_driver_sql("PRAGMA foreign_keys=ON")


@pytest.fixture(autouse=True)
def test_db(app: Flask) -> Generator[object, None, None]:
    """Give every test an empty database with the full schema.

    The schema is built once per session (or per xdist worker) and only the
    rows are deleted between tests: rebuilding all tables for each of ~2,300
    tests was 60% of the suite's run time. `create_all()` still runs before
    each test, as a cheap existence check, because a few fixtures call
    `drop_all()` themselves and would otherwise leave the next test with no
    tables.

    `@cache_catalog` routes (maps/realms, and any other catalog endpoint) cache
    across requests with no key tied to the database's contents -- entirely
    correct for a running server, where the seed only changes on a deploy, but fatal for a
    test session that resets the data every function: without an
    explicit bust here, the first test to hit a cached endpoint pins its
    response (or its `None`) for every later test that hits the same key.
    """
    with app.app_context():
        redis_cache.bump_catalog_version()
        db.create_all()
        yield db
        db.session.remove()
        db.create_all()
        _empty_all_tables()
        redis_cache.bump_catalog_version()


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
        login="standard_tester", username="standard_tester",
        email="tester@example.com",
        password_hash="hashed_pw_12345",
    )
    db_session.add(user)
    db_session.commit()
    return user


def tiny_image(seed: int = 0, image_format: str = "WEBP") -> bytes:
    """A real 2x2 image (distinct per `seed`): asset imports refuse bytes that are not an image."""
    from io import BytesIO

    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (2, 2), (seed % 256, 64, 128)).save(buffer, format=image_format)
    return buffer.getvalue()


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


def make_killer(
    db_session: Session,
    name: str,
    id: int | None = None,
    chapter: Chapter | None = None,
    **kwargs: object,
) -> Killer:
    """A killer row, flushed so `.id` is available. `release_number` no
    longer exists as a settable field -- it is `== id` now -- so a test that
    needs to control release order passes `id=` explicitly instead."""
    killer = Killer(
        id=id,
        name=name,
        chapter_id=(chapter or make_chapter(db_session)).id,
        power_name=kwargs.pop("power_name", f"{name} Power"),
        **kwargs,
    )
    db_session.add(killer)
    db_session.flush()
    return killer


def make_survivor(
    db_session: Session,
    name: str,
    id: int | None = None,
    chapter: Chapter | None = None,
    **kwargs: object,
) -> Survivor:
    """A survivor row, flushed so `.id` is available."""
    survivor = Survivor(
        id=id,
        name=name,
        chapter_id=(chapter or make_chapter(db_session)).id,
        **kwargs,
    )
    db_session.add(survivor)
    db_session.flush()
    return survivor


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
