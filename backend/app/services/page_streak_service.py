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

    # ---- roster ---------------------------------------------------------

    def get_killers(self):
        names = {
            p["character"]
            for p in self._all_killer_perks()
            if p.get("character") and p["character"] != GENERAL_CHARACTER
        }
        return sorted(names)

    def get_roster(self):
        page_count = len(self.build_pages())
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT killer, status, attempt, current_page, best_page, pages_json FROM page_streak_runs;")
        runs = {row["killer"]: row for row in cursor.fetchall()}
        conn.close()

        roster = []
        for killer in self.get_killers():
            row = runs.get(killer)
            if row is None:
                roster.append({
                    "killer": killer,
                    "status": "not_started",
                    "attempt": 0,
                    "current_page": 0,
                    "best_page": 0,
                    "page_count": page_count,
                })
            else:
                roster.append({
                    "killer": killer,
                    "status": row["status"],
                    "attempt": row["attempt"],
                    "current_page": row["current_page"],
                    "best_page": row["best_page"],
                    "page_count": len(json.loads(row["pages_json"])),
                })
        return roster

    # ---- runs -----------------------------------------------------------

    def _row_to_run(self, row, history):
        pages = json.loads(row["pages_json"])
        return {
            "id": row["id"],
            "killer": row["killer"],
            "status": row["status"],
            "attempt": row["attempt"],
            "current_page": row["current_page"],
            "best_page": row["best_page"],
            "pages": pages,
            "page_count": len(pages),
            "snapshot_at": row["snapshot_at"],
            "history": history,
        }

    def _fetch_history(self, cursor, run_id):
        cursor.execute(
            "SELECT attempt, page_number, perks_json, result, timestamp "
            "FROM page_streak_page_logs WHERE run_id = ? ORDER BY id DESC;",
            (run_id,),
        )
        return [
            {
                "attempt": row["attempt"],
                "page_number": row["page_number"],
                "perks": json.loads(row["perks_json"]),
                "result": row["result"],
                "timestamp": row["timestamp"],
            }
            for row in cursor.fetchall()
        ]

    def get_run(self, killer):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM page_streak_runs WHERE killer = ?;", (killer,))
        row = cursor.fetchone()
        if row is None:
            conn.close()
            return None
        history = self._fetch_history(cursor, row["id"])
        conn.close()
        return self._row_to_run(row, history)

    def start_run(self, killer):
        if killer not in self.get_killers():
            raise ValueError(f"Unknown killer: {killer}")
        if self.get_run(killer) is not None:
            raise ValueError(f"A run already exists for {killer}")

        pages = self.build_pages()
        if not pages:
            raise ValueError("No perks available — the pool is empty")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO page_streak_runs (killer, status, attempt, current_page, best_page, pages_json) "
            "VALUES (?, 'in_progress', 1, 1, 0, ?);",
            (killer, json.dumps(pages)),
        )
        conn.commit()
        conn.close()
        return self.get_run(killer)
