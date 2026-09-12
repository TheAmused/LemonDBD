# backend/app/services/db/seeders.py
import logging
from sqlalchemy import select, text
from app.models import GuesserStat

logger = logging.getLogger(__name__)

# Tables seeded below with an explicit id=1 -- Postgres never advances a
# sequence for an explicit-id insert, so it must be synced manually.
_EXPLICIT_ID_SEEDED_TABLES: list[str] = []


def _sync_id_sequences(db) -> None:
    if db.engine.dialect.name != "postgresql":
        return
    for table in _EXPLICIT_ID_SEEDED_TABLES:
        db.session.execute(text(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {table}), 1))"
        ))

GUESSER_TYPES: list[str] = [
    "character",
    "perk_description",
    "perk_name_to_icon",
    "perk_icon_to_name",
    "memes",
]


def seed_default_configs(db) -> None:
    """Seeds baseline settings and rules into the SQLAlchemy session if not already present."""
    try:
        for g_type in GUESSER_TYPES:
            stat = db.session.scalars(
                select(GuesserStat).where(GuesserStat.guesser_type == g_type)
            ).first()
            if not stat:
                db.session.add(GuesserStat(guesser_type=g_type))

        db.session.flush()
        _sync_id_sequences(db)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error seeding default settings in SQLAlchemy: {e}")
