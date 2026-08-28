# backend/tests/unit/test_models.py
import json
from datetime import datetime, timezone
import pytest
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.character import Character, Killer, Survivor
from app.models.chaos import ChaosMatchLog, ChaosRun
from app.models.community import BugReport, CommunityBuild, CustomPerk, DailyQuest
from app.models.equipment import Addon, Item, Offering
from app.models.gauntlet import GauntletMatchLog, GauntletRun
from app.models.history import HistoryMatchLog, HistoryRun
from app.models.map import MapObjective, MapRealm, MapTile
from app.models.minigames import DraftSession, GeneratorDrawnPerk, GeneratorSetting, GuesserStat, ScraperSetting
from app.models.page_streak import PageStreakPageLog, PageStreakRun
from app.models.perk import Perk, PerkRule
from app.models.smash_or_pass import Entity, EntityStat, Roster, SmashPassStat, SmashPassVote, Vote
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership


@pytest.mark.unit
class TestModelToDictTransformations:
    def test_character_and_power_to_dict(self) -> None:
        killer = Killer(
            id=1,
            name="The Trapper",
            role="Killer",
            real_name="Evan MacMillan",
            short_name="trapper",
            wiki_slug="trapper",
            chapter_name="Base Game",
            is_licensed=False,
            power_name="Bear Trap",
            power_description="Sets deadly bear traps around the realm.",
            power_icon_url="https://icons.example/trap.png",
            movement_speed="4.6 m/s (115%)",
            terror_radius="32 m",
            terror_radius_meters=32,
            height="Tall",
            dlc_counterparts='["Dwight Fairfield", "Meg Thomas"]',
        )

        d = killer.to_dict()
        assert d["id"] == 1
        assert d["name"] == "The Trapper"
        assert d["role"] == "Killer"
        assert d["dlc_counterparts"] == ["Dwight Fairfield", "Meg Thomas"]
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
        perk = Perk(
            id=42,
            name="Adrenaline",
            category="Survivor",
            description="Instantly heal one health state upon exit gate powering.",
            character_id=10,
            character=char,
            is_generic_counterpart=False,
        )

        d = perk.to_dict()
        assert d["id"] == 42
        assert d["name"] == "Adrenaline"
        assert d["character"] == "Meg Thomas"
        assert d["character_avatar_path"] == "meg.png"

    def test_equipment_models_to_dict(self) -> None:
        item = Item(id=1, name="Commodious Toolbox", category="Toolbox", role="Survivor", description="High charges")
        addon = Addon(id=2, name="Brand New Part", associated_target="Toolbox", category="Addon", description="Installs part")
        offering = Offering(id=3, name="Bloody Party Streamers", category="Offering", role="All", description="+100% BP")

        assert item.to_dict()["name"] == "Commodious Toolbox"
        assert addon.to_dict()["associated_target"] == "Toolbox"
        assert offering.to_dict()["category"] == "Offering"

    def test_smash_or_pass_entity_stat_calculation(self) -> None:
        stat = EntityStat(
            id="stat-123",
            entity_id="entity-456",
            smash_count=8,
            pass_count=2,
            super_smash_count=2,
        )
        rate = stat.calculate_rate()
        assert stat.total_votes == 12
        assert rate == 83.3
        assert stat.to_dict()["smash_rate"] == 83.3

    def test_smash_or_pass_entity_stat_zero_votes(self) -> None:
        stat = EntityStat(id="stat-zero", entity_id="entity-0", smash_count=0, pass_count=0, super_smash_count=0)
        assert stat.calculate_rate() == 0.0
        assert stat.total_votes == 0

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
            used_perks_json='["Agitation"]',
        )
        c_d = chaos.to_dict()
        assert c_d["completed_killers"] == ["trapper"]
        assert c_d["used_perks"] == ["Agitation"]
