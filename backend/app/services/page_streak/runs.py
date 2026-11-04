# backend/app/services/page_streak/runs.py
from collections.abc import Callable
from datetime import datetime
from sqlalchemy import Select, and_, or_, select
from sqlalchemy.orm import selectinload

from app.core.extensions import db
from app.core.transaction import lock_for_update, transaction
from app.models import PageStreakPageLog, PageStreakRun, utcnow
from app.schemas.page_streak import PageStreakHistoryEntry, PageStreakRunDict
from app.services.challenge_completions import record_challenge_completion
from app.services.match_log_retention import add_match_log
from app.services.streak_run import load_idle_run_locked
from app.services.page_streak.helpers import BUILD_SIZE, to_utc_iso


def run_to_dict(
    r: PageStreakRun,
    history: list[PageStreakHistoryEntry],
    build_pages_fn: Callable[[int], list[list[str]]] | None = None,
) -> PageStreakRunDict:
    """Serialize a PageStreakRun entity along with its match history."""
    pages = r.pages
    pool_frozen = bool(pages)
    if not pages and build_pages_fn is not None:
        pages = build_pages_fn(r.user_id)
    return {
        "id": r.id,
        "killer": r.killer,
        "status": r.status,
        "attempts": r.attempts,
        "attempt": r.attempt,
        "attempt_matches": r.attempt_matches,
        "current_page": r.current_page,
        "best_page": r.best_page,
        "pages": pages,
        "page_count": len(pages),
        "pool_frozen": pool_frozen,
        "snapshot_at": to_utc_iso(r.snapshot_at),
        "history": history,
    }


def run_state(r: PageStreakRun, build_pages_fn: Callable[[int], list[list[str]]] | None = None) -> PageStreakRunDict:
    """A run entity with its match logs (newest first) as the response payload."""
    sorted_logs = sorted(r.page_logs, key=lambda log: log.id, reverse=True)
    history: list[PageStreakHistoryEntry] = [
        {
            "attempt": log.attempt,
            "page_number": log.page_number,
            "perks": log.perks,
            "result": log.result,
            "timestamp": to_utc_iso(log.timestamp),
            "triggered_by": log.triggered_by,
        }
        for log in sorted_logs
    ]
    return run_to_dict(r, history, build_pages_fn)


def fetch_run(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], list[list[str]]] | None = None,
) -> PageStreakRunDict | None:
    """Retrieve run state and sorted page logs for a given user and killer."""
    r = db.session.scalars(run_query(user_id, killer)).first()
    return None if r is None else run_state(r, build_pages_fn)


def create_new_run(
    user_id: int,
    killer: str,
    get_killers_fn: Callable[[int], list[str]],
    build_pages_fn: Callable[[int], list[list[str]]],
) -> PageStreakRunDict | None:
    """Initialize a brand-new page streak challenge run."""
    if killer not in get_killers_fn(user_id):
        raise ValueError(f"Unknown killer: {killer}")
    if fetch_run(user_id, killer) is not None:
        raise ValueError(f"A run already exists for {killer}")

    if not build_pages_fn(user_id):
        raise ValueError("No perks available: the pool is empty")

    # The pages are not saved yet: until the player locks in a build, the run follows the live perk pool.
    run = PageStreakRun(
        user_id=user_id,
        killer=killer,
        status="in_progress",
        attempts=0,
        attempt=1,
        current_page=1,
        best_page=0,
        pages=[],
        snapshot_at=utcnow(),
    )
    with transaction():
        db.session.add(run)
    return fetch_run(user_id, killer, build_pages_fn)


def run_query(user_id: int, killer: str, *, lock: bool = False) -> Select[tuple[PageStreakRun]]:
    """One killer's run with its match logs. `lock` holds the row until the request commits, so two
    parallel requests (a double click, two tabs) cannot both pass validation and each count the same page."""
    query = (
        select(PageStreakRun)
        .options(selectinload(PageStreakRun.page_logs))
        .where(PageStreakRun.user_id == user_id, PageStreakRun.killer == killer)
    )
    return lock_for_update(query) if lock else query


def validate_match_submission(run: PageStreakRunDict, page: int, perks: list[str], result: str) -> None:
    """Validate submitted perks and page constraints against active run state."""
    if result not in ("win", "loss"):
        raise ValueError("Result must be 'win' or 'loss'")
    if run["status"] != "in_progress":
        raise ValueError("This run is already completed — abandon it to play again")
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
    perks: list[str],
    result: str,
    build_pages_fn: Callable[[int], list[list[str]]] | None = None,
) -> PageStreakRunDict | None:
    """Record match logs and update page progression or failure resets."""
    r = db.session.scalars(run_query(user_id, killer, lock=True)).first()
    if r is None:
        raise ValueError(f"No run in progress for {killer}")
    run = run_state(r, build_pages_fn)

    validate_match_submission(run, page, perks, result)

    with transaction():
        if not r.pages:
            _freeze_pages(r, run["pages"])
        log = PageStreakPageLog(
            run_id=r.id,
            attempt=r.attempt,
            page_number=page,
            perks=list(perks),
            result=result,
        )
        add_match_log(r, log)

        if result == "win":
            r.best_page = max(r.best_page, page)
            if page >= run["page_count"]:
                r.status = "completed"
                record_challenge_completion(
                    user_id=user_id,
                    mode="page_streak",
                    variant=killer,
                    attempts_taken=r.attempts + 1,
                    matches_played=r.playthrough_matches,
                    unlocked_characters_count=0,
                )
                r.finish_playthrough()
            else:
                r.current_page = page + 1
        else:
            r.current_page = 1
            r.start_new_attempt()
            r.pages = []

    return fetch_run(user_id, killer, build_pages_fn)


def apply_inactivity_loss(run_id: int, idle_before: datetime | None = None) -> bool:
    """Counts a loss for a run nobody has played since `idle_before`. False when there was nothing to do."""
    r = load_idle_run_locked(PageStreakRun, run_id, idle_before)
    if r is None:
        return False

    with transaction():
        add_match_log(r, PageStreakPageLog(
            run_id=r.id,
            attempt=r.attempt,
            page_number=r.current_page,
            perks=[],
            result="loss",
            triggered_by="inactivity",
        ))

        r.current_page = 1
        r.start_new_attempt()
        r.pages = []
    return True


def _freeze_pages(r: PageStreakRun, pages: list[list[str]]) -> None:
    """Save the pages the run is played on, so later changes to the player's perks leave them alone."""
    r.pages = pages
    r.snapshot_at = utcnow()


def lock_pages(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], list[list[str]]],
) -> PageStreakRunDict | None:
    """The player locked in a build: from here the run keeps its pages. A run that already has them is left alone."""
    r = db.session.scalars(run_query(user_id, killer, lock=True)).first()
    if r is None:
        raise ValueError(f"No run in progress for {killer}")
    if r.status == "in_progress" and not r.pages:
        pages = build_pages_fn(user_id)
        if not pages:
            raise ValueError("No perks available: the pool is empty")
        with transaction():
            _freeze_pages(r, pages)
    return fetch_run(user_id, killer, build_pages_fn)


def abandon_active_run(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], list[list[str]]],
) -> PageStreakRunDict | None:
    """Abandon the run: back to Page 1 in a new attempt."""
    r = db.session.scalars(run_query(user_id, killer, lock=True)).first()
    if r is None:
        raise ValueError(f"No run to abandon for {killer}")

    if not build_pages_fn(user_id):
        raise ValueError("No perks available: the pool is empty")

    with transaction():
        r.abandon_attempt()
        r.status = "in_progress"
        r.current_page = 1
        r.pages = []
        r.snapshot_at = utcnow()

    return fetch_run(user_id, killer, build_pages_fn)


def abandon_all_runs(user_id: int) -> None:
    """Abandon every started or finished run, killer by killer, like abandon_active_run does for one.

    A run nobody played a match in has nothing to give up and is left alone.
    Match history, stats and completions stay.
    """
    runs = db.session.scalars(
        select(PageStreakRun)
        .where(
            PageStreakRun.user_id == user_id,
            or_(
                PageStreakRun.status == "completed",
                and_(PageStreakRun.status == "in_progress", PageStreakRun.attempt_matches > 0),
            ),
        )
        .with_for_update()
    ).all()
    with transaction():
        for r in runs:
            r.abandon_attempt()
            r.status = "in_progress"
            r.current_page = 1
            r.pages = []
            r.snapshot_at = utcnow()
