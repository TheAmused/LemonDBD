import logging
from flask import current_app
from sqlalchemy import select, delete
from app.extensions import db
from app.models import GeneratorSetting, GeneratorDrawnPerk
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)


class GeneratorService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = (db_service is None)
        self.db_service = db_service or DatabaseService()

    def get_config(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    setting = db.session.get(GeneratorSetting, 1)
                    if not setting:
                        setting = GeneratorSetting(
                            id=1,
                            role="Survivor",
                            gen_mode="instant",
                            no_repeat_perks=True,
                            total_pages=12,
                            perks_per_page=15,
                            last_page_perks=8,
                            spin_duration_sec=3.0,
                        )
                        db.session.add(setting)
                        db.session.commit()
                    return setting.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy GeneratorService get_config fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM generator_settings WHERE id = 1;")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else {
            "role": "Survivor",
            "gen_mode": "instant",
            "no_repeat_perks": 1,
            "total_pages": 12,
            "perks_per_page": 15,
            "last_page_perks": 8,
            "spin_duration_sec": 3.0
        }

    def update_config(self, data):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    setting = db.session.get(GeneratorSetting, 1)
                    if not setting:
                        setting = GeneratorSetting(id=1)
                        db.session.add(setting)
                    for key in ["role", "gen_mode", "no_repeat_perks", "total_pages", "perks_per_page", "last_page_perks", "spin_duration_sec"]:
                        if key in data:
                            val = data[key]
                            if key == "no_repeat_perks":
                                val = bool(val)
                            setattr(setting, key, val)
                    db.session.commit()
                    return setting.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy GeneratorService update_config fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        fields = []
        values = []
        for key in ["role", "gen_mode", "no_repeat_perks", "total_pages", "perks_per_page", "last_page_perks", "spin_duration_sec"]:
            if key in data:
                fields.append(f"{key} = ?")
                values.append(data[key])
        
        if fields:
            values.append(1)
            query = f"UPDATE generator_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;"
            cursor.execute(query, tuple(values))
            conn.commit()
        conn.close()
        return self.get_config()

    def get_drawn_perks(self, role):
        role_clean = (role or "Survivor").capitalize()
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(GeneratorDrawnPerk.perk_name).where(GeneratorDrawnPerk.role == role_clean)
                    rows = db.session.scalars(stmt).all()
                    return list(rows)
            except Exception as e:
                logger.debug(f"SQLAlchemy GeneratorService get_drawn_perks fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perk_name FROM generator_drawn_perks WHERE role = ?;", (role_clean,))
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]

    def add_drawn_perks(self, role, perk_names):
        role_clean = (role or "Survivor").capitalize()
        if self._use_sqlalchemy:
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
                    return self.get_drawn_perks(role_clean)
            except Exception as e:
                logger.debug(f"SQLAlchemy GeneratorService add_drawn_perks fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        for name in perk_names:
            cursor.execute("""
            INSERT OR IGNORE INTO generator_drawn_perks (role, perk_name)
            VALUES (?, ?);
            """, (role_clean, name))
        conn.commit()
        conn.close()
        return self.get_drawn_perks(role_clean)

    def reset_drawn_perks(self, role=None):
        if self._use_sqlalchemy:
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

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        if role:
            cursor.execute("DELETE FROM generator_drawn_perks WHERE role = ?;", (role.capitalize(),))
        else:
            cursor.execute("DELETE FROM generator_drawn_perks;")
        conn.commit()
        conn.close()
        return []
