import json
from app.services.db_service import DatabaseService

DEFAULT_BUILDS = [
    {
        "title": "Otzdarva's Ultimate Huntress",
        "description": "High pressure ranged sniper Huntress loadout refined by Otzdarva for consistent trial victories.",
        "role": "killer",
        "category": "otzdarva",
        "character_id": "huntress",
        "perks": ["Barbecue & Chilli", "I'm All Ears", "Scourge Hook: Pain Resonance", "Lethal Pursuer"],
        "upvotes": 342,
        "author": "Otzdarva"
    },
    {
        "title": "Meta Survivor Chase Build",
        "description": "Maximum chase longevity and exhaustion recovery loadout designed for high MMR trials.",
        "role": "survivor",
        "category": "meta",
        "character_id": "meg_thomas",
        "perks": ["Sprint Burst", "Adrenaline", "Windows of Opportunity", "Resilience"],
        "upvotes": 289,
        "author": "Meta Analytics"
    },
    {
        "title": "Meme Head On Squad",
        "description": "Locker surprise stun combo engineered for maximum team coordination and hilarity.",
        "role": "survivor",
        "category": "meme",
        "character_id": "jane_romero",
        "perks": ["Head On", "Flashbang", "Quick & Quiet", "Deception"],
        "upvotes": 215,
        "author": "SwinySquad"
    },
    {
        "title": "Hex Dominator Trapper",
        "description": "Total map slowdown and trap lockdown powered by oppressive hex totem synergy.",
        "role": "killer",
        "category": "otzdarva",
        "character_id": "trapper",
        "perks": ["Hex: Ruin", "Hex: Undying", "Hex: Pentimento", "Corrupt Intervention"],
        "upvotes": 198,
        "author": "Otzdarva"
    },
    {
        "title": "Stealth Ninja Myers",
        "description": "Zero terror radius jumpscare Shape build engineered to catch survivors completely off guard.",
        "role": "killer",
        "category": "stealth",
        "character_id": "shape",
        "perks": ["Monitor & Abuse", "Tinkerer", "Discordance", "Play with Your Food"],
        "upvotes": 174,
        "author": "StalkerNinja"
    },
    {
        "title": "Gen Pressure Merchant",
        "description": "High regression and area surveillance loadout for supreme trial delay.",
        "role": "killer",
        "category": "meta",
        "character_id": "skull_merchant",
        "perks": ["Pop Goes the Weasel", "Scourge Hook: Pain Resonance", "Overcharge", "Nowhere to Hide"],
        "upvotes": 156,
        "author": "TrialDoctor"
    },
    {
        "title": "Aggressive Chase King",
        "description": "Relentless killer chase acceleration and vault speed stack for ultra fast downs.",
        "role": "killer",
        "category": "chase",
        "character_id": "wraith",
        "perks": ["Save the Best for Last", "Bamboozle", "Enduring", "Spirit Fury"],
        "upvotes": 142,
        "author": "FastDowns"
    }
]


class BuildService:
    def __init__(self, db_service=None):
        self.db_service = db_service or DatabaseService()
        self._init_table()
        self.seed_builds_if_empty()

    def _init_table(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS community_builds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('survivor', 'killer')),
                category TEXT NOT NULL CHECK (category IN ('otzdarva', 'meta', 'meme', 'stealth', 'chase')),
                character_id TEXT NOT NULL DEFAULT 'all',
                perks_json TEXT NOT NULL DEFAULT '[]',
                upvotes INTEGER NOT NULL DEFAULT 0,
                author TEXT NOT NULL DEFAULT 'Community',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        conn.close()

    def seed_builds_if_empty(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM community_builds;")
        row = cursor.fetchone()
        count = row["count"] if row else 0
        if count == 0:
            for b in DEFAULT_BUILDS:
                cursor.execute("""
                    INSERT INTO community_builds (title, description, role, category, character_id, perks_json, upvotes, author)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    b["title"],
                    b["description"],
                    b["role"].lower(),
                    b["category"].lower(),
                    b.get("character_id", "all"),
                    json.dumps(b.get("perks", [])),
                    b.get("upvotes", 0),
                    b.get("author", "Community")
                ))
            conn.commit()
        conn.close()

    def get_builds(self, role=None, category=None, search=None, sort_by="upvotes"):
        self.seed_builds_if_empty()
        conn = self.db_service.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM community_builds WHERE 1=1"
        params = []

        if role:
            query += " AND LOWER(role) = LOWER(?)"
            params.append(role)

        if category:
            query += " AND LOWER(category) = LOWER(?)"
            params.append(category)

        if search:
            query += " AND (LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(character_id) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(perks_json) LIKE LOWER(?))"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

        if sort_by == "newest":
            query += " ORDER BY id DESC"
        else:  # default to upvotes
            query += " ORDER BY upvotes DESC, id DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        builds = []
        for r in rows:
            item = dict(r)
            try:
                item["perks"] = json.loads(item.get("perks_json") or "[]")
            except Exception:
                item["perks"] = []
            builds.append(item)

        return builds

    def get_build_by_id(self, build_id):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM community_builds WHERE id = ?;", (build_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        item = dict(row)
        try:
            item["perks"] = json.loads(item.get("perks_json") or "[]")
        except Exception:
            item["perks"] = []
        return item

    def create_build(self, title, description, role, category, perks, character_id="all", author="Community"):
        role_clean = (role or "").lower()
        if role_clean not in ["survivor", "killer"]:
            raise ValueError("Role must be 'survivor' or 'killer'.")

        category_clean = (category or "").lower()
        allowed_categories = ["otzdarva", "meta", "meme", "stealth", "chase"]
        if category_clean not in allowed_categories:
            category_clean = "meta"  # fallback if unlisted category provided

        title_clean = (title or "").strip()
        if not title_clean:
            raise ValueError("Title is required.")

        perks_list = perks if isinstance(perks, list) else []
        perks_json = json.dumps(perks_list)

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO community_builds (title, description, role, category, character_id, perks_json, upvotes, author)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?);
        """, (
            title_clean,
            (description or "").strip(),
            role_clean,
            category_clean,
            (character_id or "all").strip(),
            perks_json,
            (author or "Community").strip()
        ))
        conn.commit()
        build_id = cursor.lastrowid
        conn.close()

        return self.get_build_by_id(build_id)

    def upvote_build(self, build_id):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM community_builds WHERE id = ?;", (build_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Build with ID {build_id} not found.")

        cursor.execute("UPDATE community_builds SET upvotes = upvotes + 1 WHERE id = ?;", (build_id,))
        conn.commit()
        conn.close()

        return self.get_build_by_id(build_id)
