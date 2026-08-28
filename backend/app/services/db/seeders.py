# backend/app/services/db/seeders.py
import logging
from sqlalchemy import select
from app.models import GeneratorSetting, GuesserStat, PerkRule

logger = logging.getLogger(__name__)

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
        default_rule = db.session.get(PerkRule, 1)
        if not default_rule:
            db.session.add(
                PerkRule(
                    id=1,
                    name="Default Balanced (2 Own, 1 General, 1 Any)",
                    is_default=True,
                    slot1_type="character_own",
                    slot2_type="character_own",
                    slot3_type="general_role",
                    slot4_type="any_role",
                )
            )

        gen_setting = db.session.get(GeneratorSetting, 1)
        if not gen_setting:
            db.session.add(
                GeneratorSetting(
                    id=1,
                    role="Survivor",
                    gen_mode="instant",
                    no_repeat_perks=True,
                )
            )

        for g_type in GUESSER_TYPES:
            stat = db.session.scalars(
                select(GuesserStat).where(GuesserStat.guesser_type == g_type)
            ).first()
            if not stat:
                db.session.add(GuesserStat(guesser_type=g_type))

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error seeding default settings in SQLAlchemy: {e}")
