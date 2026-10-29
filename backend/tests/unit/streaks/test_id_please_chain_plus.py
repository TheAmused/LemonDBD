# backend/tests/unit/streaks/test_id_please_chain_plus.py
import pytest
from app.services.id_please.constants import keeps_memory_always
from app.services.id_please.engine import empty_used, following, next_side, opening, start_used, to_match, unplayed, validate_opening
from app.services.id_please.roster import Roster

# Ids with gaps, so positions and database ids differ.
ROSTER = Roster(
    killer_ids=tuple(range(3, 3 + 30 * 2, 2)),
    survivor_ids=tuple(range(10, 10 + 30 * 3, 3)),
    killer_perk_ids=tuple(range(5, 5 + 109 * 2, 2)),
    survivor_perk_ids=tuple(range(7, 7 + 107 * 2, 2)),
)


def run(difficulty: str, steps: int, roster: Roster = ROSTER, lane: str = "mixed", memory: bool | None = None) -> list[dict]:
    """`steps` matches after the opening. `memory` defaults to what the lane and difficulty always keep."""
    side = "survivor" if lane == "mixed" else lane
    memory = keeps_memory_always(lane, difficulty) if memory is None else memory
    current = opening(side, [3, 10, 20, 7], roster)
    used = start_used(side, current["character_id"]) if memory else empty_used()
    before = None
    out = [current]
    for _ in range(steps):
        nxt, used = following(lane, difficulty, current, before, used, roster, memory=memory)
        before, current = current, nxt
        out.append(current)
    return out


@pytest.mark.unit
class TestValidateOpening:
    def test_returns_sorted_positions(self) -> None:
        assert validate_opening([9, 2, 5, 1], 20) == [1, 2, 5, 9]

    @pytest.mark.parametrize("bad", [None, "1234", [1, 2, 3], [1, 2, 3, 4, 5], [1, 1, 2, 3], [-1, 1, 2, 3], [1, 2, 3, 20], [1, 2, 3, True], [1, 2, 3, 1.5]])
    def test_rejects_malformed_openings(self, bad: object) -> None:
        with pytest.raises(ValueError):
            validate_opening(bad, 20)


@pytest.mark.unit
class TestEngineMapping:
    def test_opening_stores_database_ids(self) -> None:
        match = opening("survivor", [3, 10, 20, 7], ROSTER)
        assert match["number"] == 1
        assert match["side"] == "survivor"
        assert match["perk_ids"] == [7 + 2 * p for p in (3, 7, 10, 20)]
        assert match["character_id"] == ROSTER.survivor_ids[40 % 30]

    def test_loadout_round_trips_through_the_roster(self) -> None:
        loadout = opening("killer", [1, 2, 3, 4], ROSTER)
        match = to_match(loadout, ROSTER)
        assert match.character == sum([1, 2, 3, 4]) % 30
        assert match.perks == (1, 2, 3, 4)

    def test_removed_character_lands_on_next_higher_neighbour(self) -> None:
        loadout = opening("survivor", [3, 10, 20, 7], ROSTER)
        gone = loadout["character_id"]
        smaller = Roster(ROSTER.killer_ids, tuple(i for i in ROSTER.survivor_ids if i != gone), ROSTER.killer_perk_ids, ROSTER.survivor_perk_ids)
        assert smaller.survivor_ids[to_match(loadout, smaller).character] == gone + 3

    def test_base_difficulties_match_the_plain_chain(self) -> None:
        for difficulty in ("milestones", "hardcore"):
            matches = run(difficulty, 6)
            assert [m["side"] for m in matches] == ["survivor", "killer"] * 3 + ["survivor"]
            assert [m["number"] for m in matches] == list(range(1, 8))
            assert matches[1]["perk_ids"] != matches[0]["perk_ids"]  # other side's id space

    def test_hardcore_plus_has_no_repeats_within_a_round(self) -> None:
        matches = run("hardcore_plus", 2 * 30 - 1)
        for side in ("killer", "survivor"):
            ids = [m["character_id"] for m in matches if m["side"] == side]
            assert len(ids) == len(set(ids)) == 30

    def test_hardcore_plus_starts_a_new_round_when_everyone_played(self) -> None:
        matches = run("hardcore_plus", 2 * 30 * 2)
        killers = [m["character_id"] for m in matches if m["side"] == "killer"]
        assert len(set(killers[:30])) == 30
        assert len(set(killers[30:60])) == 30

    def test_hardcore_plus_memory_drops_characters_that_left_the_roster(self) -> None:
        current = opening("survivor", [3, 10, 20, 7], ROSTER)
        first, used = following("mixed", "hardcore_plus", current, None, start_used("survivor", current["character_id"]), ROSTER, memory=True)
        stale = {**used, "survivor": [*used["survivor"], 9999]}
        _, kept = following("mixed", "hardcore_plus", first, current, stale, ROSTER, memory=True)
        assert 9999 not in kept["survivor"]
        assert len(kept["survivor"]) == len(set(kept["survivor"])) == 2

    def test_hardcore_plus_diverges_from_base_from_match_three(self) -> None:
        base, plus = run("hardcore", 8), run("hardcore_plus", 8)
        assert base[0] == plus[0] and base[1] == plus[1]
        assert all(b != p for b, p in zip(base[2:], plus[2:]))

    def test_empty_used_is_two_empty_sides(self) -> None:
        assert empty_used() == {"killer": [], "survivor": []}


@pytest.mark.unit
class TestMixedMemory:
    def test_milestones_may_repeat_and_stores_nothing(self) -> None:
        current = opening("survivor", [3, 10, 20, 7], ROSTER)
        _, used = following("mixed", "milestones", current, None, empty_used(), ROSTER, memory=False)
        assert used == empty_used()

    def test_hardcore_has_no_repeats_within_a_round(self) -> None:
        matches = run("hardcore", 2 * 25 - 1)
        for side in ("killer", "survivor"):
            ids = [m["character_id"] for m in matches if m["side"] == side]
            assert len(ids) == len(set(ids))

    def test_hardcore_starts_a_new_round_when_a_side_is_exhausted(self) -> None:
        matches = run("hardcore", 2 * 30 * 2)
        killers = [m["character_id"] for m in matches if m["side"] == "killer"]
        assert len(set(killers[:30])) == 30
        assert len(set(killers[30:60])) == 30

    def test_milestones_does_keep_repeats_possible(self) -> None:
        killers = [m["character_id"] for m in run("milestones", 2 * 60 - 1) if m["side"] == "killer"]
        assert len(killers) == 60 and len(set(killers)) < 60


def _solo(lane: str, difficulty: str, steps: int, **kwargs) -> list[dict]:
    return run(difficulty, steps, lane=lane, **kwargs)


@pytest.mark.unit
class TestSingleSideLane:
    def test_next_side_stays_on_the_lane(self) -> None:
        assert next_side("survivor", "survivor") == "survivor"
        assert next_side("killer", "killer") == "killer"
        assert next_side("mixed", "killer") == "survivor"

    @pytest.mark.parametrize("lane", ["survivor", "killer"])
    @pytest.mark.parametrize("difficulty", ["milestones", "hardcore", "hardcore_plus"])
    def test_every_character_is_played_exactly_once(self, lane: str, difficulty: str) -> None:
        count = len(ROSTER.characters(lane))
        matches = _solo(lane, difficulty, count - 1, memory=True)
        assert {m["side"] for m in matches} == {lane}
        ids = [m["character_id"] for m in matches]
        assert len(ids) == count and set(ids) == set(ROSTER.characters(lane))

    @pytest.mark.parametrize("difficulty", ["milestones", "hardcore_plus"])
    def test_without_memory_characters_can_repeat_again(self, difficulty: str) -> None:
        ids = [m["character_id"] for m in _solo("survivor", difficulty, 120, memory=False)]
        assert len(set(ids)) < len(ids)

    def test_match_two_moves_the_ids_by_a_step_set_by_the_character(self) -> None:
        first, second = _solo("survivor", "milestones", 1, memory=True)
        size = len(ROSTER.survivor_perk_ids)
        a = [ROSTER.survivor_perk_ids.index(i) for i in first["perk_ids"]]
        b = [ROSTER.survivor_perk_ids.index(i) for i in second["perk_ids"]]
        step = (ROSTER.survivor_ids.index(first["character_id"]) % (size - 1)) + 1
        assert sorted((x + step) % size for x in a) == sorted(b)

    def test_perks_are_four_distinct_owned_ones_every_match(self) -> None:
        for m in _solo("killer", "hardcore_plus", 29, memory=True):
            assert len(set(m["perk_ids"])) == 4 and set(m["perk_ids"]) <= set(ROSTER.killer_perk_ids)

    def test_the_chain_is_deterministic(self) -> None:
        assert _solo("survivor", "hardcore", 20, memory=True) == _solo("survivor", "hardcore", 20, memory=True)

    def test_no_two_matches_in_a_row_are_identical(self) -> None:
        matches = _solo("survivor", "milestones", 120, memory=False)
        assert all((a["character_id"], a["perk_ids"]) != (b["character_id"], b["perk_ids"]) for a, b in zip(matches, matches[1:]))

    def test_unplayed_counts_what_memory_has_not_seen(self) -> None:
        used = {"killer": [], "survivor": list(ROSTER.survivor_ids[:10])}
        assert unplayed("survivor", used, ROSTER) == 20
        assert unplayed("killer", used, ROSTER) == 30
