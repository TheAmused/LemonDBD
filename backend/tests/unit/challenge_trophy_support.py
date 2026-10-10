# backend/tests/unit/challenge_trophy_support.py
"""In-memory app and row builders shared by the challenge trophy / completion test modules."""
from __future__ import annotations
from flask import Flask
from app import create_app
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.user import User
from app.models.character import Killer, Survivor


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _make_app() -> Flask:
    """Return a configured Flask app backed by an isolated in-memory SQLite DB."""
    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    return test_app


def _make_user(username: str = "tester") -> User:
    user = User(
        username=username,
        email=f"{username}@test.com",
        password_hash="hashed",
        role="user",
    )
    db.session.add(user)
    db.session.flush()
    return user


def _make_chapter() -> Chapter:
    """Insert and return a minimal Chapter row (required FK for Killer/Survivor)."""
    chapter = Chapter(name="Base Game", dlc_type="base_game")
    db.session.add(chapter)
    db.session.flush()
    return chapter


def _make_killer(chapter_id: int, name: str = "The Trapper") -> Killer:
    killer = Killer(
        name=name,
        chapter_id=chapter_id,
        power_name="Bear Trap",
        power_description="",
        is_disabled=False,
    )
    db.session.add(killer)
    db.session.flush()
    return killer


def _make_survivor(chapter_id: int, name: str = "Meg Thomas") -> Survivor:
    survivor = Survivor(
        name=name,
        chapter_id=chapter_id,
        is_disabled=False,
    )
    db.session.add(survivor)
    db.session.flush()
    return survivor
