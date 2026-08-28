# backend/app/services/generator/drawn_manager.py
import logging
from typing import Any
from flask import current_app
from sqlalchemy import delete, select

from app.core.extensions import db
from app.models import GeneratorDrawnPerk

logger = logging.getLogger(__name__)


def get_drawn_perks(role: str | None, use_sqlalchemy: bool, db_service: Any) -> list[str]:
    role_clean = (role or "Survivor").capitalize()

    if use_sqlalchemy:
        try:
            if current_app:
                stmt = select(GeneratorDrawnPerk.perk_name).where(GeneratorDrawnPerk.role == role_clean)
                rows = db.session.scalars(stmt).all()
                return list(rows)
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService get_drawn_perks fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT perk_name FROM generator_drawn_perks WHERE role = ?;",
        (role_clean,),
    )
    rows = cursor.fetchall()
    conn.close()

    return [row[0] for row in rows]


def add_drawn_perks(role: str | None, perk_names: list[str], use_sqlalchemy: bool, db_service: Any) -> list[str]:
    role_clean = (role or "Survivor").capitalize()

    if use_sqlalchemy:
        try:
            if current_app:
                for name in perk_names:
                    exists = db.session.scalars(
                        select(GeneratorDrawnPerk).where(
                            GeneratorDrawnPerk.role == role_clean,
                            GeneratorDrawnPerk.perk_name == name,
                        )
                    ).first()
                    if not exists:
                        db.session.add(GeneratorDrawnPerk(role=role_clean, perk_name=name))
                db.session.commit()
                return get_drawn_perks(role_clean, use_sqlalchemy=True, db_service=db_service)
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService add_drawn_perks fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    for name in perk_names:
        cursor.execute(
            """
            INSERT OR IGNORE INTO generator_drawn_perks (role, perk_name)
            VALUES (?, ?);
            """,
            (role_clean, name),
        )
    conn.commit()
    conn.close()

    return get_drawn_perks(role_clean, use_sqlalchemy=False, db_service=db_service)


def reset_drawn_perks(role: str | None, use_sqlalchemy: bool, db_service: Any) -> list[str]:
    if use_sqlalchemy:
        try:
            if current_app:
                if role:
                    role_clean = role.capitalize()
                    db.session.execute(delete(GeneratorDrawnPerk).where(GeneratorDrawnPerk.role == role_clean))
                else:
                    db.session.execute(delete(GeneratorDrawnPerk))
                db.session.commit()
                return []
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService reset_drawn_perks fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    if role:
        cursor.execute(
            "DELETE FROM generator_drawn_perks WHERE role = ?;",
            (role.capitalize(),),
        )
    else:
        cursor.execute("DELETE FROM generator_drawn_perks;")
    conn.commit()
    conn.close()

    return []
