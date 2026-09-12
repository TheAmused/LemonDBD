# backend/tests/unit/test_models.py
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from app.core.json_provider import safe_json_dumps
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.character import Killer, Survivor
from app.models.chaos import ChaosRun
from app.models.equipment import Item, ItemAddon, ItemCategory, Offering
from app.models.gauntlet import GauntletRun
from app.models.perk import Perk
from app.models.smash_or_pass import Entity, EntityStat


@pytest.mark.unit
class TestModelToDictTransformations:
    """Tests for model dictionary serialization, localization overrides, and calculated rates."""

    def test_character_and_power_to_dict(self) -> None:
        # `role` is the table, `short_name` and `wiki_slug` were `name`
        # respelled, `chapter_name` / `is_licensed` belong to the chapter, and
        # `dlc_counterparts` is derived from it -- with no chapter attached it
        # is correctly empty. `movement_speed` is stored as the m/s figure
        # alone; the percentage beside it is ms / 4.0 * 100 exactly.
        killer = Killer(
            id=1,
            name="The Trapper",
            real_name="Evan MacMillan",
            power_name="Bear Trap",
            power_description="Sets deadly bear traps around the realm.",
            power_icon_url="https://icons.example/trap.png",
            movement_speed_ms=Decimal("4.6"),
            terror_radius="32 m",
            terror_radius_meters=32,
            height="Tall",
        )

        d = killer.to_dict()
        assert d["id"] == 1
        assert d["name"] == "The Trapper"
        assert d["role"] == "Killer"
        assert d["code_prefix"] == "K01"
        assert d["release_number"] == 1
        assert d["dlc_counterparts"] == []
        assert d["power"]["movement_speed"] == "4.6 m/s (115%)"
        assert "power" in d
        assert d["power"]["name"] == "Bear Trap"
        assert d["power"]["terror_radius_meters"] == 32

    def test_character_translations_override(self) -> None:
        survivor = Survivor(
            id=2,
            name="Dwight Fairfield",
            role="Survivor",
            real_name="Dwight Fairfield",
            lore="Dwight was a nervous leader.",
            translations={
                "fr": {
                    "name": "Dwight Fairfield (FR)",
                    "lore": "Dwight était un leader nerveux.",
                }
            },
        )

        d_en = survivor.to_dict()
        assert d_en["name"] == "Dwight Fairfield"

        d_fr = survivor.to_dict(lang="fr")
        assert d_fr["name"] == "Dwight Fairfield (FR)"
        assert d_fr["lore"] == "Dwight était un leader nerveux."

    def test_perk_to_dict_with_associated_character(self) -> None:
        char = Survivor(id=10, name="Meg Thomas", real_name="Meg Thomas", avatar_local_path="meg.png")
        # `character` is a read-only property now -- it reports whichever of
        # `survivor` / `killer` is set -- so the owner is assigned to its own
        # side, and `category` is spelled `role`.
        perk = Perk(
            id=42,
            name="Adrenaline",
            role="Survivor",
            description="Instantly heal one health state upon exit gate powering.",
            survivor_id=10,
            survivor=char,
            is_generic_counterpart=False,
        )

        d = perk.to_dict()
        assert d["id"] == 42
        assert d["name"] == "Adrenaline"
        assert d["character"] == "Meg Thomas"
        assert d["character_avatar_path"] == "meg.png"

    def test_equipment_models_to_dict(self) -> None:
        # `items.category` and `items.role` are one foreign key now; an add-on
        # names a killer or an item class through a key rather than through
        # `associated_target`, which is derived; and `offerings.category`
        # restated `role`, so it is derived too.
        toolbox = ItemCategory(id=1, name="Toolbox", addon_target_label="Toolboxes", role="Survivor")
        item = Item(id=1, name="Commodious Toolbox", category=toolbox, description="High charges")
        addon = ItemAddon(id=2, name="Brand New Part", item_category=toolbox, description="Installs part")
        offering = Offering(id=3, name="Bloody Party Streamers", role="All", description="+100% BP")

        assert item.to_dict()["name"] == "Commodious Toolbox"
        assert item.to_dict()["category"] == "Toolbox"
        assert item.to_dict()["role"] == "Survivor"
        assert addon.to_dict()["associated_target"] == "Toolboxes"
        assert addon.to_dict()["category"] == "Survivor"
        assert offering.to_dict()["category"] == "CommonOfferings"

    def test_smash_or_pass_entity_stat_to_dict(self) -> None:
        # `calculate_rate()` is gone, and so is the surrogate `id`:
        # `total_votes` and `smash_rate` are generated columns the database
        # fills in, so on a row that has never been flushed they are simply
        # unset and `to_dict` reports the zeroes rather than a stale hand-kept
        # number that a forgetful writer left behind.
        stat = EntityStat(
            entity_id="entity-456",
            smash_count=8,
            pass_count=2,
            super_smash_count=2,
        )
        d = stat.to_dict()
        assert d["entity_id"] == "entity-456"
        assert "id" not in d
        assert d["smash_count"] == 8
        assert d["total_votes"] == 0
        assert d["smash_rate"] == 0.0

    def test_smash_or_pass_entity_profile_is_columns(self) -> None:
        # The former `metadata_json` blob, as columns: one spelling each, the
        # English in the row and only the differences in `translations`.
        entity = Entity(
            id="entity-456",
            roster_id="roster-1",
            slug="the_trapper",
            name="The Trapper",
            role="Killer",
            gender="male",
            archetype="The Brooding Beach Jock",
            bio="Soft, artistic side.",
            tagline="Muscles and bear traps.",
            quote="Step into my snare.",
            meme="Meme: The Trapper.",
            turn_on="Sun-kissed skin",
            dealbreaker="Touching his trap stash",
            dating_vibe="High-stakes Fog romance",
            red_flags=["Steps on his own traps"],
            green_flags=["Will carry you when tired"],
            danger_level="High",
            chaos_score=75,
            translations={"pl": {"tagline": "Sidla i mieszki."}},
        )

        assert entity.compatibility_tags == ["The Brooding Beach Jock", "Killer", "male"]

        meta = entity.metadata_dict()
        assert meta["archetype"] == "The Brooding Beach Jock"
        assert meta["chaos_score"] == 75
        assert meta["compatibility_tags"] == ["The Brooding Beach Jock", "Killer", "male"]

        # A locale overrides only what it carries; everything else stays English.
        pl = entity.localized("pl")
        assert pl["tagline"] == "Sidla i mieszki."
        assert pl["bio"] == "Soft, artistic side."

        # One `metadata` key, not `metadata` and `metadata_json` side by side.
        d = entity.to_dict("pl")
        assert "metadata_json" not in d
        assert d["metadata"]["tagline"] == "Sidla i mieszki."

    def test_admin_models_to_dict(self) -> None:
        now = datetime.now(timezone.utc)
        audit = AdminAuditLog(
            id=5,
            admin_user_id=1,
            action="DISABLE_CHARACTER",
            target_type="Character",
            target_id="the_blight",
            details="Exploit investigation",
            created_at=now,
        )
        challenge_setting = ChallengeModeSetting(
            id=1,
            mode="chaos",
            is_enabled=False,
            disabled_reason="Maintenance",
            updated_at=now,
        )

        audit_d = audit.to_dict()
        assert audit_d["action"] == "DISABLE_CHARACTER"
        assert audit_d["target_id"] == "the_blight"

        ch_d = challenge_setting.to_dict()
        assert ch_d["mode"] == "chaos"
        assert ch_d["is_enabled"] is False
        assert ch_d["disabled_reason"] == "Maintenance"

    def test_streak_models_to_dict(self) -> None:
        gauntlet = GauntletRun(
            id=1,
            user_id=2,
            role="Survivor",
            status="in_progress",
            game_mode="original",
            current_character_id="dwight",
            current_streak=5,
            best_streak=10,
            completed_characters_json='["meg", "claudette"]',
            current_loadout_json='{"perks": ["Sprint Burst", "Self-Care"]}',
        )
        d = gauntlet.to_dict()
        assert d["completed_characters"] == ["meg", "claudette"]
        assert d["current_loadout"]["perks"] == ["Sprint Burst", "Self-Care"]
        assert d["current_streak"] == 5

        chaos = ChaosRun(
            id=1,
            user_id=3,
            difficulty="hard",
            completed_killers_json='["trapper"]',
            used_perks_json=safe_json_dumps(["Agitation"]),
        )
        c_d = chaos.to_dict()
        assert c_d["completed_killers"] == ["trapper"]
        assert c_d["used_perks"] == ["Agitation"]
