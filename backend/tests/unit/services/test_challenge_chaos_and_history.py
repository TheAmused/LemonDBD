# backend/tests/unit/services/test_challenge_chaos_and_history.py
"""Chaos perk draw, chaos checkpoint intervals and the history row builder."""
from __future__ import annotations
import pytest
from app.services.chaos.constants import checkpoint_interval
from app.services.chaos.roller import draw_chaos_perks
from app.services.history.roster import build_rows


# ---------------------------------------------------------------------------
# Rule 8 – Chaos draw_chaos_perks (pure logic)
# ---------------------------------------------------------------------------

def _fake_perks(names: list[str]) -> list[dict]:
    return [{"name": n, "description": ""} for n in names]


@pytest.mark.unit
def test_draw_chaos_perks_draws_exactly_4() -> None:
    pool = _fake_perks([f"Perk{i}" for i in range(20)])
    drawn, _ = draw_chaos_perks(pool, [])
    assert len(drawn) == 4


@pytest.mark.unit
def test_draw_chaos_perks_excludes_used_names() -> None:
    """No perk already in used_perk_names appears in the draw (pool large enough)."""
    all_names = [f"Perk{i}" for i in range(20)]
    used_names = all_names[:10]  # first 10 are "used"
    pool = _fake_perks(all_names)

    drawn, _ = draw_chaos_perks(pool, used_names)

    drawn_names = {p["name"] for p in drawn}
    assert drawn_names.isdisjoint(set(used_names))


@pytest.mark.unit
def test_draw_chaos_perks_returns_updated_used_list() -> None:
    """The returned used list includes all 4 drawn perk names."""
    pool = _fake_perks([f"Perk{i}" for i in range(20)])
    drawn, updated_used = draw_chaos_perks(pool, [])

    drawn_names = {p["name"] for p in drawn}
    assert drawn_names.issubset(set(updated_used))
    # The updated list must have at least the 4 new names
    assert len(updated_used) >= 4


@pytest.mark.unit
def test_draw_chaos_perks_resets_pool_when_exhausted_mid_draw() -> None:
    """When only 2 eligible perks remain, the pool resets so drawing can finish to 4."""
    # Give a pool of 4, but pre-use 2 → only 2 eligible before reset
    all_names = ["A", "B", "C", "D"]
    pool = _fake_perks(all_names)
    used = ["A", "B"]  # 2 eligible remain before reset

    drawn, updated_used = draw_chaos_perks(pool, used)

    assert len(drawn) == 4
    # All drawn perks must be from the pool
    drawn_names = [p["name"] for p in drawn]
    for name in drawn_names:
        assert name in all_names


# ---------------------------------------------------------------------------
# Rule 9 – Chaos checkpoint_interval (pure logic)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_checkpoint_interval_easy_is_5() -> None:
    assert checkpoint_interval("easy") == 5


@pytest.mark.unit
def test_checkpoint_interval_medium_is_10() -> None:
    assert checkpoint_interval("medium") == 10


@pytest.mark.unit
def test_checkpoint_interval_hell_is_0() -> None:
    assert checkpoint_interval("hell") == 0


# ---------------------------------------------------------------------------
# Rule 10 – History build_rows (pure logic, ROW_SIZE=5)
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_build_rows_splits_into_rows_of_five() -> None:
    """build_rows(['A','B','C','D','E','F']) → [['A','B','C','D','E'],['F']]."""
    result = build_rows(["A", "B", "C", "D", "E", "F"])
    assert result == [["A", "B", "C", "D", "E"], ["F"]]


@pytest.mark.unit
def test_build_rows_empty_list_returns_empty() -> None:
    """build_rows([]) → []."""
    assert build_rows([]) == []
