# backend/app/services/page_streak/runs.py
import json
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models import PageStreakPageLog, PageStreakRun, utcnow
from app.services.page_streak.helpers import BUILD_SIZE, to_utc_iso


def run_to_dict(r: PageStreakRun, history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Serialize a PageStreakRun entity along with its match history."""
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
        "snapshot_at": to_utc_iso(r.snapshot_at),
        "history": history,
    }


def fetch_run(user_id: int, killer: str) -> Optional[Dict[str, Any]]:
    """Retrieve run state and sorted page logs for a given user and killer."""
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
            "timestamp": to_utc_iso(log.timestamp),
        }
        for log in sorted_logs
    ]
    return run_to_dict(r, history)


def create_new_run(
    user_id: int,
    killer: str,
    get_killers_fn: Callable[[int], List[str]],
    build_pages_fn: Callable[[int], List[List[str]]],
) -> Optional[Dict[str, Any]]:
    """Initialize a brand-new page streak challenge run."""
    if killer not in get_killers_fn(user_id):
        raise ValueError(f"Unknown killer: {killer}")
    if fetch_run(user_id, killer) is not None:
        raise ValueError(f"A run already exists for {killer}")

    pages = build_pages_fn(user_id)
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
    return fetch_run(user_id, killer)


def validate_match_submission(run: Dict[str, Any], page: int, perks: List[str], result: str) -> None:
    """Validate submitted perks and page constraints against active run state."""
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

    expected = min(BUILD_SIZE, len(page_perks))
    if len(submitted) != expected:
        raise ValueError(f"This page needs exactly {expected} perks, got {len(submitted)}")

    unknown = [name for name in submitted if name not in page_perks]
    if unknown:
        raise ValueError(f"Not on page {page}: {', '.join(unknown)}")


def record_match_result(
    user_id: int,
    killer: str,
    page: int,
    perks: List[str],
    result: str,
) -> Optional[Dict[str, Any]]:
    """Record match logs and update page progression or failure resets."""
    run = fetch_run(user_id, killer)
    if run is None:
        raise ValueError(f"No run in progress for {killer}")

    validate_match_submission(run, page, perks, result)

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
    return fetch_run(user_id, killer)


def reset_active_run(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], List[List[str]]],
) -> Optional[Dict[str, Any]]:
    """Reset run progress to Page 1 and update perk page snapshots."""
    run = fetch_run(user_id, killer)
    if run is None:
        raise ValueError(f"No run to reset for {killer}")

    pages = build_pages_fn(user_id)
    if not pages:
        raise ValueError("No perks available — the pool is empty")

    r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run["id"])).first()
    r.status = "in_progress"
    r.current_page = 1
    r.attempt = r.attempt + 1
    r.pages_json = json.dumps(pages)
    r.snapshot_at = utcnow()
    db.session.commit()

    return fetch_run(user_id, killer)

