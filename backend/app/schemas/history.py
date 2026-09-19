# backend/app/schemas/history.py
from typing import NotRequired, TypedDict


class HistoryMatchLogDict(TypedDict):
    id: int
    run_id: int
    killer_id: str
    result: str
    row_index: int
    streak_before: int
    streak_after: int
    timestamp: str | None
    triggered_by: str


class HistoryRunDict(TypedDict):
    id: int
    user_id: int
    mode: str
    status: str
    current_row_index: int
    total_killers_beaten: int
    best_killers_beaten: int
    completed_killers: list[str]
    unlocked_perk_names: list[str]
    owned_killer_ids: list[int]
    checkpoint_row_index: int
    attempts: int
    created_at: str | None
    updated_at: str | None


class HistoryRunState(HistoryRunDict):
    """What every history endpoint returns: the stored run plus its row layout."""
    owned_killers: list[str]
    current_row_killers: list[str]
    row_size: int
    total_rows: int
    total_owned_killers: int
    pool_frozen: bool
    # Only on a submitted result.
    newly_unlocked_perks: NotRequired[list[str]]
    row_cleared: NotRequired[bool]
