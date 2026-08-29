# backend/tests/unit/test_chaos_roller.py
import pytest
from sqlalchemy.orm import Session
from app.models import Character, Perk
from app.services.chaos.constants import (
    ADDON_RARITY_POOL,
    CHAOS_CHECKPOINT_INTERVAL,
    DIFFICULTIES,
    checkpoint_interval,
)
from app.services.chaos.roller import draw_addon_rarities, draw_chaos_perks, resolve_perks_by_names


def _perk(name: str) -> dict[str, object]:
    return {"id": abs(hash(name)) % 100000, "name": name, "category": "Killer"}


@pytest.mark.unit
class TestChaosConstants:
    """Tests for Chaos mode difficulty intervals and rarity constants."""

    @pytest.mark.parametrize(
        "difficulty, expected_interval",
        [
            ("easy", 5),
            ("medium", 10),
            ("hell", 0),
            ("EASY", 0),
            ("unknown", 0),
            ("", 0),
            (None, 0),
        ],
    )
    def test_checkpoint_interval_lookup(self, difficulty: str | None, expected_interval: int) -> None:
        assert checkpoint_interval(difficulty) == expected_interval

    def test_difficulties_tuple_elements(self) -> None:
        assert DIFFICULTIES == ("easy", "medium", "hell")

    def test_addon_rarity_pool_composition(self) -> None:
        assert "Event" not in ADDON_RARITY_POOL
        assert set(ADDON_RARITY_POOL) == {
            "Common",
            "Uncommon",
            "Rare",
            "Very Rare",
            "Ultra Rare",
        }


@pytest.mark.unit
class TestDrawAddonRarities:
    """Tests for random add-on rarity pair generation."""

    def test_always_returns_exactly_two_valid_rarities(self) -> None:
        for _ in range(50):
            rarities = draw_addon_rarities()
            assert len(rarities) == 2
            assert all(r in ADDON_RARITY_POOL for r in rarities)

    def test_rarity_pool_produces_all_variants_over_monte_carlo_draws(self) -> None:
        seen_rarities = set()
        saw_duplicate = False

        for _ in range(250):
            a, b = draw_addon_rarities()
            seen_rarities.add(a)
            seen_rarities.add(b)
            if a == b:
                saw_duplicate = True

        assert seen_rarities == set(ADDON_RARITY_POOL)
        assert saw_duplicate is True


@pytest.mark.unit
class TestDrawChaosPerks:
    """Tests for Perk pool shuffling, depletion, and cycle refilling."""

    def test_draws_four_distinct_perks_from_large_pool(self) -> None:
        pool = [_perk(f"Perk {i}") for i in range(15)]
        drawn, used = draw_chaos_perks(pool, [])
        assert len(drawn) == 4
        assert len(used) == 4
        names = [p["name"] for p in drawn]
        assert len(names) == len(set(names))

    def test_respects_already_used_perks_without_duplicating(self) -> None:
        pool = [_perk(f"Perk {i}") for i in range(8)]
        already_used = [pool[i]["name"] for i in range(4)]
        drawn, updated_used = draw_chaos_perks(pool, already_used)

        drawn_names = {p["name"] for p in drawn}
        assert len(drawn) == 4
        unused_names = {pool[i]["name"] for i in range(4, 8)}
        assert unused_names == drawn_names

    def test_refills_when_pool_fully_exhausted_mid_draw(self) -> None:
        pool = [_perk("Only Perk")]
        drawn, updated_used = draw_chaos_perks(pool, [])
        assert len(drawn) == 4
        assert all(p["name"] == "Only Perk" for p in drawn)
        assert updated_used == ["Only Perk"]

    def test_pool_smaller_than_four_perks_cycles_properly(self) -> None:
        pool = [_perk(f"Small Perk {i}") for i in range(2)]
        drawn, updated_used = draw_chaos_perks(pool, [])
        assert len(drawn) == 4
        drawn_names = [p["name"] for p in drawn]
        assert "Small Perk 0" in drawn_names
        assert "Small Perk 1" in drawn_names

    def test_empty_pool_returns_empty_lists(self) -> None:
        drawn, updated_used = draw_chaos_perks([], [])
        assert drawn == []
        assert updated_used == []


@pytest.mark.unit
class TestResolvePerksByNames:
    """Tests for resolving string Perk names against database models."""

    @pytest.fixture(autouse=True)
    def setup_perk_models(self, db_session: Session) -> None:
        character = Character(name="The Trapper", role="Killer")
        survivor = Character(name="Dwight Fairfield", role="Survivor")
        db_session.add_all([character, survivor])
        db_session.flush()

        db_session.add(Perk(name="Brutal Strength", character_id=character.id, is_teachable=True, category="Killer"))
        db_session.add(Perk(name="Unnerving Presence", character_id=None, is_teachable=False, category="Killer"))
        db_session.add(Perk(name="Hex: Ruin", character_id=None, is_teachable=False, category="Killer"))
        db_session.add(Perk(name="Sprint Burst", character_id=survivor.id, is_teachable=True, category="Survivor"))
        db_session.commit()

    def test_resolves_names_to_full_objects_in_order(self) -> None:
        result = resolve_perks_by_names(["Unnerving Presence", "Brutal Strength"])
        assert [p["name"] for p in result] == ["Unnerving Presence", "Brutal Strength"]
        assert "icon_local_path" in result[0]
        assert result[0]["category"] == "Killer"

    def test_filters_out_survivor_category_perks(self) -> None:
        result = resolve_perks_by_names(["Sprint Burst"])
        assert result == []

    def test_unknown_name_is_silently_dropped(self) -> None:
        result = resolve_perks_by_names(["Brutal Strength", "NonExistentPerk123"])
        assert [p["name"] for p in result] == ["Brutal Strength"]

    def test_empty_input_returns_empty_list(self) -> None:
        assert resolve_perks_by_names([]) == []

    def test_duplicate_names_in_input_resolve_preserving_order(self) -> None:
        result = resolve_perks_by_names(["Hex: Ruin", "Hex: Ruin"])
        assert len(result) == 2
        assert result[0]["name"] == "Hex: Ruin"
        assert result[1]["name"] == "Hex: Ruin"
