# backend/app/schemas/page_streak.py
from typing import TypedDict


class PageStreakPageLogDict(TypedDict):
    id: int
    run_id: int
    attempt: int
    page_number: int
    perks: list[str]
    result: str
    timestamp: str | None
    triggered_by: str


class PageStreakStatsLog(PageStreakPageLogDict):
    killer: str | None


class PageStreakHistoryEntry(TypedDict):
    attempt: int
    page_number: int
    perks: list[str]
    result: str
    timestamp: str | None
    triggered_by: str


class PageStreakRunDict(TypedDict):
    id: int
    killer: str
    status: str
    attempt: int
    current_page: int
    best_page: int
    pages: list[list[str]]
    page_count: int
    pool_frozen: bool
    snapshot_at: str | None
    history: list[PageStreakHistoryEntry]


class PageStreakRunState(PageStreakRunDict):
    """What every page streak run endpoint returns: the run plus its artwork."""
    perk_icons: dict[str, str]
    killer_avatar: str | None
