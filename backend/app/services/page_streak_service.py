import json
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models import PageStreakRun, PageStreakPageLog, GeneratorSetting, utcnow
from app.services.perk_service import PerkService
from app.services.ownership_service import OwnershipService

logger = logging.getLogger(__name__)

DEFAULT_PERKS_PER_PAGE = 15
BUILD_SIZE = 4
GENERAL_CHARACTER = "General"


def _to_utc_iso(value):
    """Normalise a stored datetime/string into an ISO-8601 UTC string."""
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
    def __init__(self, perk_service=None, ownership_service=None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    # ---- pool and pages -------------------------------------------------

    def get_perks_per_page(self) -> int:
        setting = db.session.scalars(select(GeneratorSetting).where(GeneratorSetting.id == 1)).first()
        if setting and setting.perks_per_page:
            return int(setting.perks_per_page)
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

    def get_pool(self, user_id: int):
        """Killer perks the user has unlocked, per UserPerkOwnership."""
        owned_perks = self.ownership_service.get_user_perks(user_id, category="Killer")
        unlocked_names = {p["name"] for p in owned_perks if p["is_unlocked"]}
        perks = [p for p in self._all_killer_perks() if p["name"] in unlocked_names]
        return sorted(perks, key=lambda p: p["name"])

    def build_pages(self, user_id: int):
        pool = self.get_pool(user_id)
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

    def get_killers(self, user_id: int):
        """Killers the user owns, per UserCharacterOwnership."""
        owned_characters = self.ownership_service.get_user_characters(user_id, role="Killer")
        owned_names = {c["name"] for c in owned_characters if c["is_owned"]}

        release_numbers = self._release_numbers()

        def sort_key(name):
            position = release_numbers.get(name)
            if position is None:
                return (1, 0, name)
            return (0, position, name)

        return sorted(owned_names, key=sort_key)

    def get_roster(self, user_id: int):
        page_count = len(self.build_pages(user_id))
        runs_db = db.session.scalars(
            select(PageStreakRun).where(PageStreakRun.user_id == user_id)
        ).all()
        runs = {r.killer: r for r in runs_db}
        roster = []
        for killer in self.get_killers(user_id):
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

    # ---- runs -----------------------------------------------------------

    def _run_to_dict(self, r, history):
        pages = json.loads(r.pages_json or "[]")
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

    def get_run(self, user_id: int, killer: str):
        r = db.session.scalars(
            select(PageStreakRun)
            .options(joinedload(PageStreakRun.page_logs))
            .where(PageStreakRun.user_id == user_id, PageStreakRun.killer == killer)
        ).first()
        if r is None:
            return None
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
        return self._run_to_dict(r, history)

    def start_run(self, user_id: int, killer: str):
        if killer not in self.get_killers(user_id):
            raise ValueError(f"Unknown killer: {killer}")
        if self.get_run(user_id, killer) is not None:
            raise ValueError(f"A run already exists for {killer}")

        pages = self.build_pages(user_id)
        if not pages:
            raise ValueError("No perks available — the pool is empty")

        run = PageStreakRun(
            user_id=user_id,
            killer=killer,
            status="in_progress",
            attempt=1,
            current_page=1,
            best_page=0,
            pages_json=json.dumps(pages),
        )
        db.session.add(run)
        db.session.commit()
        return self.get_run(user_id, killer)

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

    def submit_result(self, user_id: int, killer: str, page, perks, result):
        run = self.get_run(user_id, killer)
        if run is None:
            raise ValueError(f"No run in progress for {killer}")
        self._validate_submission(run, page, perks, result)

        r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run["id"])).first()
        log = PageStreakPageLog(
            run_id=r.id,
            attempt=r.attempt,
            page_number=page,
            perks_json=json.dumps(list(perks)),
            result=result,
        )
        db.session.add(log)
        if result == "win":
            r.best_page = max(r.best_page, page)
            if page >= run["page_count"]:
                r.status = "completed"
            else:
                r.current_page = page + 1
        else:
            r.current_page = 1
            r.attempt = r.attempt + 1
        db.session.commit()
        return self.get_run(user_id, killer)

    def reset_run(self, user_id: int, killer: str):
        run = self.get_run(user_id, killer)
        if run is None:
            raise ValueError(f"No run to reset for {killer}")

        pages = self.build_pages(user_id)
        if not pages:
            raise ValueError("No perks available — the pool is empty")

        r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run["id"])).first()
        r.status = "in_progress"
        r.current_page = 1
        r.attempt = r.attempt + 1
        r.pages_json = json.dumps(pages)
        r.snapshot_at = utcnow()
        db.session.commit()
        return self.get_run(user_id, killer)
