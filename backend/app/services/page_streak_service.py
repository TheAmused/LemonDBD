import json
import logging
from typing import Optional, List, Dict, Any
from flask import current_app
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models import (
    PageStreakExcludedPerk,
    PageStreakRun,
    PageStreakPageLog,
    GeneratorSetting,
    utcnow,
)
from app.services.db_service import DatabaseService
from app.services.perk_service import PerkService

logger = logging.getLogger(__name__)

DEFAULT_PERKS_PER_PAGE = 15
BUILD_SIZE = 4
GENERAL_CHARACTER = "General"


def _to_utc_iso(value):
    """Normalise a SQLite CURRENT_TIMESTAMP string or datetime object into an ISO-8601 UTC string."""
    if not value:
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat() + ("" if str(value).endswith("Z") else "Z")
    val_str = str(value)
    if val_str.endswith("Z"):
        return val_str
    if len(val_str) == 19 and val_str[10] == " ":
        return val_str[:10] + "T" + val_str[11:] + "Z"
    return val_str


class PageStreakService:
    def __init__(self, db_service=None, perk_service=None):
        self._use_sqlalchemy = (db_service is None)
        self.db_service = db_service or DatabaseService()
        self.perk_service = perk_service or PerkService()

    # ---- exclusion list -------------------------------------------------

    def get_excluded_perks(self) -> List[str]:
        if self._use_sqlalchemy:
            try:
                if current_app:
                    rows = db.session.scalars(
                        select(PageStreakExcludedPerk.perk_name).order_by(PageStreakExcludedPerk.perk_name)
                    ).all()
                    return list(rows)
            except Exception as e:
                logger.debug(f"SQLAlchemy query get_excluded_perks fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perk_name FROM page_streak_excluded_perks ORDER BY perk_name;")
        names = [row["perk_name"] for row in cursor.fetchall()]
        conn.close()
        return names

    def set_excluded_perks(self, perk_names: List[str]) -> Dict[str, Any]:
        clean = sorted({str(name) for name in (perk_names or [])})
        if self._use_sqlalchemy:
            try:
                if current_app:
                    db.session.execute(delete(PageStreakExcludedPerk))
                    for name in clean:
                        db.session.add(PageStreakExcludedPerk(perk_name=name))
                    db.session.commit()
                    pages = self.build_pages()
                    return {
                        "excluded": clean,
                        "pool_size": sum(len(page) for page in pages),
                        "page_count": len(pages),
                    }
            except Exception as e:
                logger.debug(f"SQLAlchemy set_excluded_perks fallback: {e}")

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

    def get_perks_per_page(self) -> int:
        if self._use_sqlalchemy:
            try:
                if current_app:
                    setting = db.session.scalars(select(GeneratorSetting).where(GeneratorSetting.id == 1)).first()
                    if setting and setting.perks_per_page:
                        return int(setting.perks_per_page)
                    return DEFAULT_PERKS_PER_PAGE
            except Exception as e:
                logger.debug(f"SQLAlchemy get_perks_per_page fallback: {e}")

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

    def _release_numbers(self):
        get_characters = getattr(self.perk_service, "get_characters", None)
        if not callable(get_characters):
            return {}
        try:
            characters = get_characters() or []
        except Exception:
            return {}

        numbers = {}
        for character in characters:
            name = (character or {}).get("name")
            release_number = (character or {}).get("release_number")
            if name and isinstance(release_number, int) and name not in numbers:
                numbers[name] = release_number
        return numbers

    def get_killers(self):
        get_characters = getattr(self.perk_service, "get_characters", None)
        chars = []
        if callable(get_characters):
            try:
                chars = get_characters(category="Killer") or []
            except Exception:
                chars = []

        has_positive_release = any(isinstance(c.get("release_number"), int) and c["release_number"] > 0 for c in chars)
        killer_names = {
            c["name"] for c in chars
            if c.get("name")
            and "overall_average" not in c["name"].lower()
            and (not has_positive_release or (isinstance(c.get("release_number"), int) and c["release_number"] > 0))
        }

        perk_chars = {
            p["character"]
            for p in self._all_killer_perks()
            if p.get("character") and p["character"] != GENERAL_CHARACTER
        }

        names = killer_names | perk_chars
        release_numbers = self._release_numbers()

        def sort_key(name):
            position = release_numbers.get(name)
            if position is None:
                return (1, 0, name)
            return (0, position, name)

        return sorted(names, key=sort_key)

    def get_roster(self):
        page_count = len(self.build_pages())
        if self._use_sqlalchemy:
            try:
                if current_app:
                    runs_db = db.session.scalars(select(PageStreakRun)).all()
                    runs = {r.killer: r for r in runs_db}
                    roster = []
                    for killer in self.get_killers():
                        r = runs.get(killer)
                        if r is None:
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
                                "status": r.status,
                                "attempt": r.attempt,
                                "current_page": r.current_page,
                                "best_page": r.best_page,
                                "page_count": len(json.loads(r.pages_json or "[]")),
                            })
                    return roster
            except Exception as e:
                logger.debug(f"SQLAlchemy get_roster fallback: {e}")

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
        if self._use_sqlalchemy:
            try:
                if current_app:
                    r = db.session.scalars(
                        select(PageStreakRun)
                        .options(joinedload(PageStreakRun.page_logs))
                        .where(PageStreakRun.killer == killer)
                    ).first()
                    if r is None:
                        return None
                    pages = json.loads(r.pages_json or "[]")
                    sorted_logs = sorted(r.page_logs, key=lambda log: log.id, reverse=True)
                    history = [
                        {
                            "attempt": log.attempt,
                            "page_number": log.page_number,
                            "perks": json.loads(log.perks_json or "[]"),
                            "result": log.result,
                            "timestamp": _to_utc_iso(log.timestamp),
                        }
                        for log in sorted_logs
                    ]
                    return {
                        "id": r.id,
                        "killer": r.killer,
                        "status": r.status,
                        "attempt": r.attempt,
                        "current_page": r.current_page,
                        "best_page": r.best_page,
                        "pages": pages,
                        "page_count": len(pages),
                        "snapshot_at": _to_utc_iso(r.snapshot_at),
                        "history": history,
                    }
            except Exception as e:
                logger.debug(f"SQLAlchemy get_run fallback: {e}")

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

        if self._use_sqlalchemy:
            try:
                if current_app:
                    run = PageStreakRun(
                        killer=killer,
                        status="in_progress",
                        attempt=1,
                        current_page=1,
                        best_page=0,
                        pages_json=json.dumps(pages),
                    )
                    db.session.add(run)
                    db.session.commit()
                    return self.get_run(killer)
            except Exception as e:
                logger.debug(f"SQLAlchemy start_run fallback: {e}")

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

        if self._use_sqlalchemy:
            try:
                if current_app:
                    r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run["id"])).first()
                    if r:
                        log = PageStreakPageLog(
                            run_id=r.id,
                            attempt=r.attempt,
                            page_number=page,
                            perks_json=json.dumps(list(perks)),
                            result=result,
                        )
                        db.session.add(log)
                        if result == "win":
                            best_page = max(r.best_page, page)
                            r.best_page = best_page
                            if page >= run["page_count"]:
                                r.status = "completed"
                            else:
                                r.current_page = page + 1
                        else:
                            r.current_page = 1
                            r.attempt = r.attempt + 1
                        db.session.commit()
                        return self.get_run(killer)
            except Exception as e:
                logger.debug(f"SQLAlchemy submit_result fallback: {e}")

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

        if self._use_sqlalchemy:
            try:
                if current_app:
                    r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run["id"])).first()
                    if r:
                        r.status = "in_progress"
                        r.current_page = 1
                        r.attempt = r.attempt + 1
                        r.pages_json = json.dumps(pages)
                        r.snapshot_at = utcnow()
                        db.session.commit()
                        return self.get_run(killer)
            except Exception as e:
                logger.debug(f"SQLAlchemy reset_run fallback: {e}")

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
