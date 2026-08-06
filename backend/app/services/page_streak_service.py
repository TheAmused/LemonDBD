import json
from app.services.db_service import DatabaseService
from app.services.perk_service import PerkService

DEFAULT_PERKS_PER_PAGE = 15
BUILD_SIZE = 4
GENERAL_CHARACTER = "General"


def _to_utc_iso(value):
    """Normalise a SQLite CURRENT_TIMESTAMP string ("YYYY-MM-DD HH:MM:SS", UTC,
    no zone marker) into an unambiguous ISO-8601 UTC string ("...Z").

    Tolerant of None and of values that are already normalised (or otherwise
    don't match the expected shape) — those are returned unchanged.
    """
    if not value:
        return value
    if value.endswith("Z"):
        return value
    if len(value) == 19 and value[10] == " ":
        return value[:10] + "T" + value[11:] + "Z"
    return value


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
        page = 1
        limit = 200
        collected = []
        total = None
        while True:
            result = self.perk_service.get_perks(category="Killer", page=page, limit=limit)
            data = result.get("data", [])
            if not data:
                break
            collected.extend(data)
            if total is None:
                total = result.get("pagination", {}).get("total")
            if total is not None and len(collected) >= total:
                break
            page += 1
        return collected

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
            "snapshot_at": _to_utc_iso(row["snapshot_at"]),
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
                "timestamp": _to_utc_iso(row["timestamp"]),
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

    # ---- results and reset ----------------------------------------------

    def expected_build_size(self, page_perks):
        return min(BUILD_SIZE, len(page_perks))

    def _validate_submission(self, run, page, perks, result):
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if run["status"] != "in_progress":
            raise ValueError("This run is already completed — reset it to play again")
        if page != run["current_page"]:
            raise ValueError(f"Page {page} is not the current page ({run['current_page']})")

        page_perks = run["pages"][page - 1]
        submitted = list(perks or [])
        if len(set(submitted)) != len(submitted):
            raise ValueError("The build contains duplicate perks")
        expected = self.expected_build_size(page_perks)
        if len(submitted) != expected:
            raise ValueError(f"This page needs exactly {expected} perks, got {len(submitted)}")
        unknown = [name for name in submitted if name not in page_perks]
        if unknown:
            raise ValueError(f"Not on page {page}: {', '.join(unknown)}")

    def submit_result(self, killer, page, perks, result):
        run = self.get_run(killer)
        if run is None:
            raise ValueError(f"No run in progress for {killer}")
        self._validate_submission(run, page, perks, result)

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO page_streak_page_logs (run_id, attempt, page_number, perks_json, result) "
            "VALUES (?, ?, ?, ?, ?);",
            (run["id"], run["attempt"], page, json.dumps(list(perks)), result),
        )

        if result == "win":
            best_page = max(run["best_page"], page)
            if page >= run["page_count"]:
                cursor.execute(
                    "UPDATE page_streak_runs SET status = 'completed', best_page = ?, "
                    "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                    (best_page, run["id"]),
                )
            else:
                cursor.execute(
                    "UPDATE page_streak_runs SET current_page = ?, best_page = ?, "
                    "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                    (page + 1, best_page, run["id"]),
                )
        else:
            cursor.execute(
                "UPDATE page_streak_runs SET current_page = 1, attempt = attempt + 1, "
                "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                (run["id"],),
            )

        conn.commit()
        conn.close()
        return self.get_run(killer)

    def reset_run(self, killer):
        run = self.get_run(killer)
        if run is None:
            raise ValueError(f"No run to reset for {killer}")

        pages = self.build_pages()
        if not pages:
            raise ValueError("No perks available — the pool is empty")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE page_streak_runs SET status = 'in_progress', current_page = 1, "
            "attempt = attempt + 1, pages_json = ?, snapshot_at = CURRENT_TIMESTAMP, "
            "updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
            (json.dumps(pages), run["id"]),
        )
        conn.commit()
        conn.close()
        return self.get_run(killer)
