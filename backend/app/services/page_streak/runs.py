# backend/app/services/page_streak/runs.py
from collections.abc import Callable
from sqlalchemy import Select, delete, select
from sqlalchemy.orm import selectinload

from app.core.extensions import db
from app.core.transaction import transaction
from app.models import PageStreakPageLog, PageStreakRun, utcnow
from app.schemas.page_streak import PageStreakHistoryEntry, PageStreakRunDict
from app.services.challenge_completions import delete_completions, record_challenge_completion
from app.services.match_log_retention import add_match_log
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
        "current_page": r.current_page,
        "best_page": r.best_page,
        "pages": pages,
        "page_count": len(pages),
        "pool_frozen": pool_frozen,
        "snapshot_at": to_utc_iso(r.snapshot_at),
        "history": history,
    }


def fetch_run(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], list[list[str]]] | None = None,
) -> PageStreakRunDict | None:
    """Retrieve run state and sorted page logs for a given user and killer."""
    r = db.session.scalars(
        select(PageStreakRun)
        .options(selectinload(PageStreakRun.page_logs))
        .where(PageStreakRun.user_id == user_id, PageStreakRun.killer == killer)
    ).first()
    if r is None:
        return None

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

    pages = build_pages_fn(user_id)
    if not pages:
        raise ValueError("No perks available — the pool is empty")

    run = PageStreakRun(
        user_id=user_id,
        killer=killer,
        status="in_progress",
        attempts=0,
        attempt=1,
        current_page=1,
        best_page=0,
        pages=pages,
        snapshot_at=utcnow(),
    )
    with transaction():
        db.session.add(run)
    return fetch_run(user_id, killer, build_pages_fn)


def locked_run_query(user_id: int, killer: str) -> Select[tuple[PageStreakRun]]:
    """The run row, locked until the request commits, so two parallel submissions (a double
    click, two tabs) cannot both pass validation for the same page and each count it."""
    return (
        select(PageStreakRun)
        .where(PageStreakRun.user_id == user_id, PageStreakRun.killer == killer)
        .with_for_update()
        .execution_options(populate_existing=True)
    )


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
    r = db.session.scalars(locked_run_query(user_id, killer)).first()
    if r is None:
        raise ValueError(f"No run in progress for {killer}")
    run = fetch_run(user_id, killer, build_pages_fn)
    if run is None:
        raise ValueError(f"No run in progress for {killer}")

    validate_match_submission(run, page, perks, result)

    with transaction():
        if not r.pages:
            r.pages = run["pages"]
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


def apply_inactivity_loss(run_id: int) -> None:
    r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run_id)).first()
    if not r or r.status == "completed":
        return

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


def abandon_active_run(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], list[list[str]]],
) -> PageStreakRunDict | None:
    """Abandon the run: back to Page 1 in a new attempt."""
    run = fetch_run(user_id, killer, build_pages_fn)
    if run is None:
        raise ValueError(f"No run to abandon for {killer}")

    if not build_pages_fn(user_id):
        raise ValueError("No perks available — the pool is empty")

    with transaction():
        r = db.session.scalars(select(PageStreakRun).where(PageStreakRun.id == run["id"])).first()
        r.abandon_attempt()
        r.status = "in_progress"
        r.current_page = 1
        r.pages = []
        r.snapshot_at = utcnow()

    return fetch_run(user_id, killer, build_pages_fn)


def reset_all_runs(user_id: int) -> None:
    """Wipe every killer's Page Streak run AND their "already won" badges.

    Deliberately more destructive than abandon_active_run: a per-killer abandon
    leaves past completions alone (so the roster badge survives), but this
    "start completely over" action clears both -- the whole point is a clean
    slate across the entire roster.
    """
    with transaction():
        db.session.execute(delete(PageStreakRun).where(PageStreakRun.user_id == user_id))
        delete_completions(user_id, "page_streak")


def refresh_untouched_run(
    user_id: int,
    killer: str,
    build_pages_fn: Callable[[int], list[list[str]]],
) -> None:
    """A run with no match played in its current attempt follows the live perk pool,
    so unlocking killers or perks after it was created does not leave it on old pages."""
    r = db.session.scalars(
        select(PageStreakRun)
        .options(selectinload(PageStreakRun.page_logs))
        .where(PageStreakRun.user_id == user_id, PageStreakRun.killer == killer)
    ).first()
    if r is None or r.status != "in_progress" or r.current_page != 1:
        return
    if any(log.attempt == r.attempt for log in r.page_logs):
        return
    pages = build_pages_fn(user_id)
    if not pages or pages == r.pages:
        return
    with transaction():
        r.pages = pages
        r.snapshot_at = utcnow()

