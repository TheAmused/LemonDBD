# backend/tests/unit/streaks/test_id_please_chain.py
import pytest
from app.services.id_please.chain import (
    Match,
    Sizes,
    first_match,
    fit,
    free_character,
    next_match,
    next_match_plus,
    next_match_plus_solo,
    next_match_solo,
    shifted,
)

SIZES = Sizes(killer_characters=30, killer_perks=120, survivor_characters=40, survivor_perks=150)


def play(opening: Match, steps: int) -> list[Match]:
    matches = [opening]
    for _ in range(steps):
        matches.append(next_match(matches[-1], SIZES))
    return matches


@pytest.mark.unit
class TestFit:
    def test_values_wrap_by_modulo_and_sort(self) -> None:
        assert fit([13, 4, 22, 9], 10) == [2, 3, 4, 9]

    def test_clash_moves_up_by_one(self) -> None:
        assert fit([3, 3, 3, 3], 10) == [3, 4, 5, 6]

    def test_clash_wraps_at_the_end(self) -> None:
        assert fit([9, 9, 9, 9], 10) == [0, 1, 2, 9]

    def test_always_four_distinct_in_range(self) -> None:
        for values in ([0, 0, 0, 0], [7, 7, 8, 8], [99, 1, 50, 2]):
            out = fit(values, 5)
            assert len(set(out)) == 4
            assert all(0 <= v < 5 for v in out)
            assert out == sorted(out)


@pytest.mark.unit
class TestBaseChain:
    def test_first_match_character_is_sum_mod_size(self) -> None:
        match = first_match("survivor", [3, 10, 20, 7], SIZES)
        assert match == Match(1, "survivor", 40 % 40, (3, 7, 10, 20))

    def test_first_match_character_wraps(self) -> None:
        assert first_match("killer", [10, 11, 12, 13], SIZES).character == 46 % 30

    def test_match_two_is_the_mirror_on_the_other_side(self) -> None:
        opening = first_match("survivor", [3, 10, 20, 7], SIZES)
        second = next_match(opening, SIZES)
        assert second.side == "killer"
        assert second.number == 2
        assert second.perks == (3, 7, 10, 20)
        assert second.character == 40 % 30

    def test_sides_alternate(self) -> None:
        matches = play(first_match("killer", [1, 2, 3, 4], SIZES), 9)
        assert [m.side for m in matches] == ["killer", "survivor"] * 5
        assert [m.number for m in matches] == list(range(1, 11))

    def test_every_match_is_valid_for_its_side(self) -> None:
        for m in play(first_match("survivor", [5, 17, 60, 149], SIZES), 300):
            assert 0 <= m.character < SIZES.characters(m.side)
            assert len(set(m.perks)) == 4
            assert list(m.perks) == sorted(m.perks)
            assert all(0 <= p < SIZES.perks(m.side) for p in m.perks)

    def test_chain_is_deterministic(self) -> None:
        a = play(first_match("killer", [4, 8, 15, 16], SIZES), 50)
        b = play(first_match("killer", [4, 8, 15, 16], SIZES), 50)
        assert a == b

    def test_match_three_differs_from_a_plain_mirror(self) -> None:
        matches = play(first_match("survivor", [3, 10, 20, 7], SIZES), 2)
        assert matches[2].perks != matches[0].perks

    def test_different_openings_diverge(self) -> None:
        a = play(first_match("survivor", [1, 2, 3, 4], SIZES), 10)
        b = play(first_match("survivor", [1, 2, 3, 5], SIZES), 10)
        assert a[-1] != b[-1]

    def test_no_early_loop(self) -> None:
        matches = play(first_match("survivor", [5, 17, 60, 149], SIZES), 400)
        seen = {(m.side, m.character, m.perks) for m in matches}
        assert len(seen) == len(matches)

    def test_smallest_roster_still_plays(self) -> None:
        tiny = Sizes(1, 4, 1, 4)
        match = first_match("killer", [0, 1, 2, 3], tiny)
        for _ in range(20):
            match = next_match(match, tiny)
            assert match.character == 0
            assert match.perks == (0, 1, 2, 3)


@pytest.mark.unit
class TestPlusChain:
    def test_match_two_equals_the_base_mirror(self) -> None:
        opening = first_match("survivor", [3, 10, 20, 7], SIZES)
        assert next_match_plus(opening, None, frozenset(), SIZES) == next_match(opening, SIZES)

    def test_used_character_is_skipped(self) -> None:
        opening = first_match("survivor", [3, 10, 20, 7], SIZES)
        free = next_match_plus(opening, None, frozenset(), SIZES)
        skipped = next_match_plus(opening, None, frozenset({free.character}), SIZES)
        assert skipped.character != free.character
        assert 0 <= skipped.character < SIZES.killer_characters
        assert skipped.perks == free.perks

    def test_full_memory_counts_as_empty(self) -> None:
        opening = first_match("survivor", [3, 10, 20, 7], SIZES)
        everyone = frozenset(range(SIZES.killer_characters))
        assert next_match_plus(opening, None, everyone, SIZES) == next_match_plus(opening, None, frozenset(), SIZES)


FULL = Sizes(killer_characters=44, killer_perks=145, survivor_characters=54, survivor_perks=176)


@pytest.mark.unit
class TestFreeCharacter:
    def test_a_free_character_is_kept(self) -> None:
        assert free_character(5, frozenset({1, 2}), 10, key=3) == 5

    def test_a_played_character_moves_by_a_step_that_depends_on_the_match(self) -> None:
        a = free_character(5, frozenset({5}), 10, key=1)
        b = free_character(5, frozenset({5}), 10, key=4)
        assert a != 5 and b != 5 and a != b

    def test_every_free_character_is_reachable(self) -> None:
        for count in (2, 7, 12, 30, 54):
            for key in range(40):
                used = frozenset(range(count)) - {count - 1}
                assert free_character(0, used, count, key) == count - 1

    def test_a_full_memory_has_nothing_to_say(self) -> None:
        assert free_character(3, frozenset(range(8)), 8, key=4) == 3


@pytest.mark.unit
class TestSingleSideChain:
    def test_match_two_shifts_the_ids_all_by_one_step(self) -> None:
        opening = first_match("survivor", [15, 20, 30, 40], FULL)
        assert opening.character == 51
        assert shifted(opening, FULL.survivor_perks) == [67, 72, 82, 92]
        second = next_match_solo(opening, FULL)
        assert (second.side, second.character, second.perks) == ("survivor", 43, (67, 72, 82, 92))

    def test_the_known_chain(self) -> None:
        matches = [first_match("survivor", [15, 20, 30, 40], FULL)]
        for _ in range(4):
            matches.append(next_match_solo(matches[-1], FULL))
        assert [(m.character, m.perks) for m in matches] == [
            (51, (15, 20, 30, 40)),
            (43, (67, 72, 82, 92)),
            (49, (29, 57, 113, 121)),
            (50, (28, 114, 122, 136)),
            (37, (18, 56, 95, 153)),
        ]

    def test_the_shift_step_is_never_zero(self) -> None:
        for character in range(60):
            previous = Match(1, "survivor", character, (0, 1, 2, 3))
            assert shifted(previous, 40) != [0, 1, 2, 3]

    def test_hardcore_plus_match_two_is_the_same_shift(self) -> None:
        opening = first_match("killer", [4, 9, 31, 77], FULL)
        assert next_match_plus_solo(opening, None, frozenset(), FULL) == next_match_solo(opening, FULL)

    def test_even_sized_lists_do_not_favour_even_characters(self) -> None:
        # 54 characters and 176 perks are both even; the plain formula made even positions 2.4 times as common.
        import random

        rng = random.Random(4)
        hits = [0, 0]
        for _ in range(60):
            match = first_match("survivor", rng.sample(range(176), 4), FULL)
            for _ in range(80):
                match = next_match_solo(match, FULL)
                hits[match.character % 2] += 1
        assert 0.8 < hits[0] / hits[1] < 1.25


@pytest.mark.unit
class TestPerkShuffle:
    IDS = tuple(range(10, 70))

    def test_a_seed_gives_a_fixed_permutation_and_zero_changes_nothing(self) -> None:
        from app.services.id_please.roster import shuffled

        assert shuffled(self.IDS, 0) == self.IDS
        assert shuffled(self.IDS, 7) == shuffled(self.IDS, 7)
        assert sorted(shuffled(self.IDS, 7)) == list(self.IDS)
        assert shuffled(self.IDS, 7) != shuffled(self.IDS, 8) != self.IDS

    def test_positions_and_ids_are_each_other_s_inverse(self) -> None:
        from app.services.id_please.roster import Roster

        roster = Roster((1,), (1,), (), self.IDS, perk_seed=99)
        chosen = [12, 33, 41, 68]
        positions = roster.perk_positions("survivor", chosen)
        assert [roster.perk_order("survivor")[p] for p in positions] == chosen
        assert positions != Roster((1,), (1,), (), self.IDS).perk_positions("survivor", chosen)

    def test_a_perk_that_is_gone_takes_the_place_of_its_next_higher_id(self) -> None:
        from app.services.id_please.roster import Roster

        roster = Roster((1,), (1,), (), self.IDS, perk_seed=5)
        assert roster.perk_positions("survivor", [9]) == roster.perk_positions("survivor", [10])
        assert roster.perk_positions("survivor", [999]) == roster.perk_positions("survivor", [69])
