import json
from app.services.db_service import DatabaseService
from app.services.perk_service import PerkService

DEFAULT_PERKS_PER_PAGE = 15
BUILD_SIZE = 4
GENERAL_CHARACTER = "General"


class PageStreakService:
    def __init__(self, db_service=None, perk_service=None):
        self.db_service = db_service or DatabaseService()
        self.perk_service = perk_service or PerkService()

    # ---- exclusion list -------------------------------------------------

    def get_excluded_perks(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perk_name FROM page_streak_excluded_perks ORDER BY perk_name;")
        names = [row["perk_name"] for row in cursor.fetchall()]
        conn.close()
        return names

    def set_excluded_perks(self, perk_names):
        clean = sorted({str(name) for name in (perk_names or [])})
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM page_streak_excluded_perks;")
        cursor.executemany(
            "INSERT OR IGNORE INTO page_streak_excluded_perks (perk_name) VALUES (?);",
            [(name,) for name in clean],
        )
        conn.commit()
        conn.close()
        pages = self.build_pages()
        return {
            "excluded": clean,
            "pool_size": sum(len(page) for page in pages),
            "page_count": len(pages),
        }

    # ---- pool and pages -------------------------------------------------

    def get_perks_per_page(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perks_per_page FROM generator_settings WHERE id = 1;")
        row = cursor.fetchone()
        conn.close()
        if row and row["perks_per_page"]:
            return int(row["perks_per_page"])
        return DEFAULT_PERKS_PER_PAGE

    def _all_killer_perks(self):
        result = self.perk_service.get_perks(category="Killer", limit=100000)
        return list(result.get("data", []))

    def get_pool(self):
        excluded = set(self.get_excluded_perks())
        perks = [p for p in self._all_killer_perks() if p["name"] not in excluded]
        return sorted(perks, key=lambda p: p["name"])

    def build_pages(self):
        pool = self.get_pool()
        size = self.get_perks_per_page()
        names = [p["name"] for p in pool]
        return [names[i:i + size] for i in range(0, len(names), size)]
