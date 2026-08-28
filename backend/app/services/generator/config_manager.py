# backend/app/services/generator/config_manager.py
import logging
from typing import Any
from flask import current_app

from app.core.extensions import db
from app.models import GeneratorSetting

logger = logging.getLogger(__name__)

CONFIG_FIELDS = [
    "role",
    "gen_mode",
    "no_repeat_perks",
    "total_pages",
    "perks_per_page",
    "last_page_perks",
    "spin_duration_sec",
]


def get_generator_config(use_sqlalchemy: bool, db_service: Any) -> dict[str, Any]:
    if use_sqlalchemy:
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

    conn = db_service.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM generator_settings WHERE id = 1;")
    row = cursor.fetchone()
    conn.close()

    return (
        dict(row)
        if row
        else {
            "role": "Survivor",
            "gen_mode": "instant",
            "no_repeat_perks": 1,
            "total_pages": 12,
            "perks_per_page": 15,
            "last_page_perks": 8,
            "spin_duration_sec": 3.0,
        }
    )


def update_generator_config(data: dict[str, Any], use_sqlalchemy: bool, db_service: Any) -> dict[str, Any]:
    if use_sqlalchemy:
        try:
            if current_app:
                setting = db.session.get(GeneratorSetting, 1)
                if not setting:
                    setting = GeneratorSetting(id=1)
                    db.session.add(setting)

                for key in CONFIG_FIELDS:
                    if key in data:
                        val = data[key]
                        if key == "no_repeat_perks":
                            val = bool(val)
                        setattr(setting, key, val)

                db.session.commit()
                return setting.to_dict()
        except Exception as e:
            logger.debug(f"SQLAlchemy GeneratorService update_config fallback: {e}")

    conn = db_service.get_connection()
    cursor = conn.cursor()
    fields = []
    values = []

    for key in CONFIG_FIELDS:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if fields:
        values.append(1)
        query = f"UPDATE generator_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;"
        cursor.execute(query, tuple(values))
        conn.commit()
    conn.close()

    return get_generator_config(use_sqlalchemy=False, db_service=db_service)
