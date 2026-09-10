# backend/tests/unit/test_static_db_seeder.py
import pytest
from sqlalchemy import select, func
from app.core.extensions import db
from app.models.character import Character
from app.models.perk import Perk
from app.models.smash_or_pass import Roster
from app.seeds.static_db_seeder import seed_from_static_json


def test_static_db_seeder_initializes_empty_db(app):
    with app.app_context():
        # Verify db starts empty in test app
        initial_chars = db.session.scalar(select(func.count(Character.id))) or 0
        if initial_chars > 0:
            # Clean up if already populated in test fixture
            db.drop_all()
            db.create_all()

        result = seed_from_static_json(force=True)
        assert result["status"] == "success"

        char_count = db.session.scalar(select(func.count(Character.id)))
        perk_count = db.session.scalar(select(func.count(Perk.id)))
        roster_count = db.session.scalar(select(func.count(Roster.id)))

        assert char_count >= 98
        assert perk_count >= 321
        assert roster_count >= 6

        # Calling again should skip
        second_result = seed_from_static_json(force=False)
        assert second_result["status"] == "skipped"
