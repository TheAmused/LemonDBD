# backend/app/services/others/custom_perk_service.py
import logging
from typing import Any
from flask import current_app
from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import CustomPerk
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)

DEFAULT_CUSTOM_PERKS = [
    (
        "Hex: Shadow Veil",
        "killer",
        "The Wraith",
        "Iridescent",
        "hex_totem",
        "A Hex that cloaks the killer's terror radius while totem is active. When survivors get within 12 meters of the totem, their aura is revealed to the Killer for 4 seconds.",
        18,
        "EntityArchitect"
    ),
    (
        "Adrenaline Rush: Overdrive",
        "survivor",
        "Meg Thomas",
        "Very Rare",
        "sprint",
        "When all generators are powered, instantly heal one health state and gain 150% movement speed for 8 seconds. Causes **Exhausted** status effect for 40 seconds.",
        25,
        "SpeedDemon"
    ),
    (
        "Totem Whisperer",
        "survivor",
        "Mikaela Reid",
        "Uncommon",
        "totem_cleanse",
        "Hear auditory cues when near dull or hex totems within 16 meters. Cleansing totems takes 15% less time and reveals the Killer's aura for 3 seconds.",
        14,
        "WitchyVibes"
    ),
    (
        "Entity's Shadow",
        "killer",
        "The Trapper",
        "Iridescent",
        "entity_claws",
        "The Entity blocks all pallets within 24 meters of a hooked survivor for 15 seconds after hooking. Any survivor attempting to vault a blocked pallet screams and suffers **Hindered** for 5 seconds.",
        21,
        "FogLord"
    ),
]


class CustomPerkService:
    def __init__(self, db_service: DatabaseService | None = None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def init_table_and_seed(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    count = db.session.scalar(select(func.count(CustomPerk.id))) or 0
                    if count == 0:
                        for p in DEFAULT_CUSTOM_PERKS:
                            db.session.add(
                                CustomPerk(
                                    name=p[0],
                                    role=p[1],
                                    character_name=p[2],
                                    rarity=p[3],
                                    icon_preset=p[4],
                                    description=p[5],
                                    upvotes=p[6],
                                    author=p[7],
                                )
                            )
                        db.session.commit()
                    return
            except Exception as e:
                logger.debug(f"SQLAlchemy init_table_and_seed fallback: {e}")

        self.db_service.init_db()
        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM custom_perks")
        row = cursor.fetchone()
        if row and row["count"] == 0:
            logger.info("Seeding initial custom perk concepts into database...")
            cursor.executemany(
                """
                INSERT INTO custom_perks (name, role, character_name, rarity, icon_preset, description, upvotes, author)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                DEFAULT_CUSTOM_PERKS
            )
            conn.commit()

        conn.close()

    def get_custom_perks(
        self,
        role: str | None = None,
        rarity: str | None = None,
        search: str | None = None,
        sort_by: str = "newest",
    ) -> list[dict[str, Any]]:
        self.init_table_and_seed()
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(CustomPerk)
                    if role and role.lower() != "all":
                        stmt = stmt.where(func.lower(CustomPerk.role) == role.lower())
                    if rarity and rarity.lower() != "all":
                        stmt = stmt.where(func.lower(CustomPerk.rarity) == rarity.lower())
                    if search and search.strip():
                        pat = f"%{search.strip().lower()}%"
                        stmt = stmt.where(
                            or_(
                                func.lower(CustomPerk.name).ilike(pat),
                                func.lower(CustomPerk.description).ilike(pat),
                                func.lower(CustomPerk.character_name).ilike(pat),
                                func.lower(CustomPerk.author).ilike(pat),
                            )
                        )
                    if sort_by == "upvotes":
                        stmt = stmt.order_by(CustomPerk.upvotes.desc(), CustomPerk.created_at.desc())
                    else:
                        stmt = stmt.order_by(CustomPerk.created_at.desc(), CustomPerk.id.desc())

                    rows = db.session.scalars(stmt).all()
                    return [r.to_dict() for r in rows]
            except Exception as e:
                logger.debug(f"SQLAlchemy get_custom_perks fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM custom_perks WHERE 1=1"
        params = []

        if role:
            query += " AND LOWER(role) = LOWER(?)"
            params.append(role)

        if rarity:
            query += " AND LOWER(rarity) = LOWER(?)"
            params.append(rarity)

        if search:
            query += " AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(character_name) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?))"
            pattern = f"%{search}%"
            params.extend([pattern, pattern, pattern, pattern])

        if sort_by == "upvotes":
            query += " ORDER BY upvotes DESC, created_at DESC"
        else:
            query += " ORDER BY created_at DESC, id DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        results = [dict(r) for r in rows]
        conn.close()
        return results

    def create_custom_perk(
        self,
        name: str,
        role: str,
        character_name: str,
        rarity: str,
        icon_preset: str,
        description: str,
        author: str = "Community",
    ) -> dict[str, Any]:
        role_clean = role.lower() if role else "survivor"
        if role_clean not in ["survivor", "killer"]:
            role_clean = "survivor"

        rarities_valid = ["Iridescent", "Very Rare", "Uncommon"]
        rarity_matched = next((r for r in rarities_valid if r.lower() == rarity.lower()), "Very Rare")

        if self._use_sqlalchemy:
            try:
                if current_app:
                    cp = CustomPerk(
                        name=name.strip(),
                        role=role_clean,
                        character_name=character_name.strip() if character_name else "Teachable",
                        rarity=rarity_matched,
                        icon_preset=icon_preset.strip() if icon_preset else "sparkles",
                        description=description.strip(),
                        author=author.strip() if author else "Community",
                        upvotes=0,
                    )
                    db.session.add(cp)
                    db.session.commit()
                    return cp.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy create_custom_perk fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO custom_perks (name, role, character_name, rarity, icon_preset, description, upvotes, author)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                name.strip(),
                role_clean,
                character_name.strip() if character_name else "Teachable",
                rarity_matched,
                icon_preset.strip() if icon_preset else "sparkles",
                description.strip(),
                author.strip() if author else "Community"
            )
        )
        conn.commit()
        new_id = cursor.lastrowid

        cursor.execute("SELECT * FROM custom_perks WHERE id = ?", (new_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def upvote_custom_perk(self, perk_id: int) -> dict[str, Any] | None:
        if self._use_sqlalchemy:
            try:
                if current_app:
                    cp = db.session.get(CustomPerk, int(perk_id))
                    if not cp:
                        return None
                    cp.upvotes = (cp.upvotes or 0) + 1
                    db.session.commit()
                    return cp.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy upvote_custom_perk fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute("UPDATE custom_perks SET upvotes = upvotes + 1 WHERE id = ?", (perk_id,))
        if cursor.rowcount == 0:
            conn.close()
            return None

        conn.commit()
        cursor.execute("SELECT * FROM custom_perks WHERE id = ?", (perk_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
