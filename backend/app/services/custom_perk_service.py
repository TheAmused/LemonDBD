import logging
from typing import List, Dict, Any, Optional
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)


class CustomPerkService:
    def __init__(self, db_service: Optional[DatabaseService] = None):
        self.db_service = db_service or DatabaseService()
        self.init_table_and_seed()

    def init_table_and_seed(self):
        self.db_service.init_db()
        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM custom_perks")
        row = cursor.fetchone()
        if row and row["count"] == 0:
            logger.info("Seeding initial custom perk concepts into database...")
            default_perks = [
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

            cursor.executemany(
                """
                INSERT INTO custom_perks (name, role, character_name, rarity, icon_preset, description, upvotes, author)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                default_perks
            )
            conn.commit()

        conn.close()

    def get_custom_perks(
        self,
        role: Optional[str] = None,
        rarity: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "newest"
    ) -> List[Dict[str, Any]]:
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
        author: str = "Community"
    ) -> Dict[str, Any]:
        role_clean = role.lower() if role else "survivor"
        if role_clean not in ["survivor", "killer"]:
            role_clean = "survivor"

        rarities_valid = ["Iridescent", "Very Rare", "Uncommon"]
        rarity_matched = next((r for r in rarities_valid if r.lower() == rarity.lower()), "Very Rare")

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

    def upvote_custom_perk(self, perk_id: int) -> Optional[Dict[str, Any]]:
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
