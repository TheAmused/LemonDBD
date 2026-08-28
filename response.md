### backend/tests/unit/test_models.py
```python
from datetime import datetime, timezone
import pytest
from app.core.json_provider import safe_json_dumps
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.character import Killer, Survivor
from app.models.chaos import ChaosRun
from app.models.equipment import Addon, Item, Offering
from app.models.gauntlet import GauntletRun
from app.models.perk import Perk
from app.models.smash_or_pass import EntityStat


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
            used_perks_json=safe_json_dumps(["Agitation"]),
        )
        c_d = chaos.to_dict()
        assert c_d["completed_killers"] == ["trapper"]
        assert c_d["used_perks"] == ["Agitation"]
```

### backend/tests/unit/test_page_streak_service.py
```python
import unittest
import pytest
from sqlalchemy import select
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk, PageStreakPageLog
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.page_streak_service import PageStreakService
from app.services.page_streak.runs import apply_inactivity_loss

GENERAL_CHARACTER = "General"


class FakePerkService:
    def __init__(self, perks):
        self._perks = perks

    def get_perks(self, category=None, limit=None, **kwargs):
        data = [p for p in self._perks if category is None or p["category"] == category]
        return {"data": data, "pagination": {"total": len(data)}}


class ClampingFakePerkService:
    def __init__(self, perks):
        self._perks = perks

    def get_perks(self, category=None, page=1, limit=50, **kwargs):
        data = [p for p in self._perks if category is None or p["category"] == category]
        total = len(data)
        page = max(1, page)
        limit = max(1, min(limit, 200))
        start = (page - 1) * limit
        end = start + limit
        return {
            "data": data[start:end],
            "pagination": {"total": total, "page": page, "limit": limit},
        }


class OrderedFakePerkService(FakePerkService):
    def __init__(self, perks, characters):
        super().__init__(perks)
        self._characters = characters

    def get_characters(self, category=None):
        if category is None:
            return list(self._characters)
        return [c for c in self._characters if c.get("category") == category]


def make_perks(count, category="Killer", character="Trapper", start=1):
    return [
        {
            "name": f"Perk {i:03d}",
            "character": character,
            "category": category,
        }
        for i in range(start, start + count)
    ]


def seed_perks(perks):
    char_cache = {}
    for p in perks:
        char_name = p.get("character")
        character = None
        if char_name and char_name != GENERAL_CHARACTER:
            character = char_cache.get(char_name)
            if character is None:
                character = db.session.scalars(
                    select(Character).where(Character.name == char_name)
                ).first()
                if character is None:
                    character = Character(name=char_name, role=p["category"])
                    db.session.add(character)
                    db.session.flush()
                char_cache[char_name] = character
        db.session.add(Perk(
            name=p["name"],
            character_id=character.id if character else None,
            is_teachable=True,
            category=p["category"],
        ))
    db.session.commit()


def seed_killers(names):
    for name in names:
        if db.session.scalars(select(Character).where(Character.name == name)).first():
            continue
        db.session.add(Character(name=name, role="Killer"))
    db.session.commit()


@pytest.mark.unit
class PageStreakTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id

    def lock_perk(self, user_id, perk_name):
        perk = db.session.scalars(select(Perk).where(Perk.name == perk_name)).first()
        self.ownership_service.set_perk_ownership(user_id, perk.id, is_unlocked=False)


@pytest.mark.unit
class TestPageStreakPool(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = make_perks(33) + make_perks(5, category="Survivor", character="Meg", start=101)
        seed_perks(self.perks)
        self.user_id = self.register_user("pooluser")
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def test_pool_contains_only_killer_perks_sorted_by_name(self):
        pool = self.service.get_pool(self.user_id)
        self.assertEqual(len(pool), 33)
        self.assertTrue(all(p["category"] == "Killer" for p in pool))
        names = [p["name"] for p in pool]
        self.assertEqual(names, sorted(names))

    def test_build_pages_chunks_by_fifteen_with_short_last_page(self):
        pages = self.service.build_pages(self.user_id)
        self.assertEqual(len(pages), 3)
        self.assertEqual(len(pages[0]), 15)
        self.assertEqual(len(pages[1]), 15)
        self.assertEqual(len(pages[2]), 3)
        self.assertEqual(pages[0][0], "Perk 001")
        self.assertEqual(pages[2][-1], "Perk 033")

    def test_locked_perks_shrink_pool_and_page_count(self):
        for i in range(1, 4):
            self.lock_perk(self.user_id, f"Perk {i:03d}")
        pool = self.service.get_pool(self.user_id)
        self.assertEqual(len(pool), 30)
        pages = self.service.build_pages(self.user_id)
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0][0], "Perk 004")

    def test_pool_is_per_user(self):
        other_user_id = self.register_user("otheruser")
        self.lock_perk(self.user_id, "Perk 001")
        self.assertEqual(len(self.service.get_pool(self.user_id)), 32)
        self.assertEqual(len(self.service.get_pool(other_user_id)), 33)

    def test_pool_shorter_than_one_page_yields_single_short_page(self):
        keep = {"Perk 001", "Perk 002"}
        for p in self.perks:
            if p["category"] == "Killer" and p["name"] not in keep:
                self.lock_perk(self.user_id, p["name"])
        pages = self.service.build_pages(self.user_id)
        self.assertEqual(pages, [["Perk 001", "Perk 002"]])


@pytest.mark.unit
class TestPageStreakPoolPagination(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = make_perks(250)
        seed_perks(self.perks)
        self.user_id = self.register_user("paginationuser")
        self.service = PageStreakService(perk_service=ClampingFakePerkService(self.perks))

    def test_get_pool_returns_all_perks_beyond_the_200_page_clamp(self):
        pool = self.service.get_pool(self.user_id)
        self.assertEqual(len(pool), 250)
        names = {p["name"] for p in pool}
        self.assertEqual(names, {p["name"] for p in self.perks})

    def test_build_pages_covers_every_perk_beyond_the_200_page_clamp(self):
        pages = self.service.build_pages(self.user_id)
        flattened = [name for page in pages for name in page]
        self.assertEqual(len(flattened), 250)
        self.assertEqual(sorted(flattened), sorted(p["name"] for p in self.perks))


@pytest.mark.unit
class TestPageStreakRoster(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = (
            make_perks(20, character="Trapper")
            + make_perks(10, character="Nurse")
            + make_perks(5, character=GENERAL_CHARACTER)
            + make_perks(4, category="Survivor", character="Meg")
        )
        for i, perk in enumerate(self.perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(self.perks)
        self.user_id = self.register_user("rosteruser")
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))

    def test_roster_lists_owned_killers_only(self):
        roster = self.service.get_roster(self.user_id)
        names = [entry["killer"] for entry in roster]
        self.assertEqual(names, ["Nurse", "Trapper"])
        self.assertTrue(all(entry["status"] == "not_started" for entry in roster))
        self.assertEqual(roster[0]["page_count"], 3)

    def test_locked_killer_is_excluded_from_roster(self):
        trapper = db.session.scalars(select(Character).where(Character.name == "Trapper")).first()
        self.ownership_service.set_character_ownership(self.user_id, trapper.id, is_owned=False)
        names = [entry["killer"] for entry in self.service.get_roster(self.user_id)]
        self.assertEqual(names, ["Nurse"])

    def test_start_run_snapshot_at_is_utc_iso_with_z_suffix(self):
        run = self.service.start_run(self.user_id, "Nurse")
        self.assertIsNotNone(run["snapshot_at"])
        self.assertTrue(run["snapshot_at"].endswith("Z"))

    def test_start_run_freezes_snapshot(self):
        run = self.service.start_run(self.user_id, "Nurse")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_page"], 1)
        self.assertEqual(run["attempt"], 1)
        self.assertEqual(run["best_page"], 0)
        self.assertEqual(run["page_count"], 3)
        self.assertEqual(len(run["pages"][0]), 15)

        for i in range(1, 21):
            self.lock_perk(self.user_id, f"Perk {i:03d}")
        reloaded = self.service.get_run(self.user_id, "Nurse")
        self.assertEqual(reloaded["page_count"], 3)
        self.assertEqual(len(reloaded["pages"][0]), 15)

    def test_start_run_twice_is_rejected(self):
        self.service.start_run(self.user_id, "Nurse")
        with self.assertRaises(ValueError):
            self.service.start_run(self.user_id, "Nurse")

    def test_start_run_rejects_unknown_killer(self):
        with self.assertRaises(ValueError):
            self.service.start_run(self.user_id, "Not A Killer")

    def test_get_run_returns_none_when_not_started(self):
        self.assertIsNone(self.service.get_run(self.user_id, "Trapper"))

    def test_roster_reflects_started_run(self):
        self.service.start_run(self.user_id, "Nurse")
        roster = {entry["killer"]: entry for entry in self.service.get_roster(self.user_id)}
        self.assertEqual(roster["Nurse"]["status"], "in_progress")
        self.assertEqual(roster["Nurse"]["current_page"], 1)
        self.assertEqual(roster["Trapper"]["status"], "not_started")

    def test_runs_are_isolated_per_user(self):
        other_user_id = self.register_user("otherrosteruser")
        self.service.start_run(self.user_id, "Nurse")
        self.assertIsNone(self.service.get_run(other_user_id, "Nurse"))
        other_roster = {e["killer"]: e for e in self.service.get_roster(other_user_id)}
        self.assertEqual(other_roster["Nurse"]["status"], "not_started")


@pytest.mark.unit
class TestPageStreakResults(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        self.perks = make_perks(32, character="Nurse")
        seed_perks(self.perks)
        self.user_id = self.register_user("resultsuser")
        self.service = PageStreakService(perk_service=FakePerkService(self.perks))
        self.run = self.service.start_run(self.user_id, "Nurse")

    def build_for(self, page_number):
        page = self.run["pages"][page_number - 1]
        return page[:self.service.expected_build_size(page)]

    def test_win_advances_to_next_page_and_records_best(self):
        updated = self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.assertEqual(updated["current_page"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["history"][0]["result"], "win")
        self.assertEqual(updated["history"][0]["page_number"], 1)

    def test_winning_last_page_completes_the_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        self.assertEqual(updated["status"], "completed")
        self.assertEqual(updated["best_page"], 3)
        self.assertEqual(updated["current_page"], updated["page_count"])

    def test_loss_resets_page_keeps_history_and_best(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "loss")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["best_page"], 1)
        self.assertEqual(len(updated["history"]), 2)
        self.assertEqual(updated["pages"], self.run["pages"])

    def test_short_last_page_accepts_a_short_build(self):
        page3 = self.run["pages"][2]
        self.assertEqual(len(page3), 2)
        self.assertEqual(self.service.expected_build_size(page3), 2)
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        updated = self.service.submit_result(self.user_id, "Nurse", 3, page3, "win")
        self.assertEqual(updated["status"], "completed")

    def test_rejects_wrong_page(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")

    def test_rejects_perk_from_another_page(self):
        bad = self.build_for(1)[:3] + [self.run["pages"][1][0]]
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, bad, "win")

    def test_rejects_wrong_perk_count(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1)[:3], "win")

    def test_rejects_duplicate_perks(self):
        first = self.run["pages"][0][0]
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, [first, first, first, first], "win")

    def test_rejects_invalid_result_value(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "draw")

    def test_rejects_result_on_completed_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")

    def test_reset_restarts_with_fresh_snapshot_and_keeps_history(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        for i in range(1, 18):
            self.lock_perk(self.user_id, f"Perk {i:03d}")
        updated = self.service.reset_run(self.user_id, "Nurse")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["page_count"], 1)
        self.assertEqual(len(updated["history"]), 1)
        self.assertEqual(updated["best_page"], 1)

    def test_reset_reopens_a_completed_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        updated = self.service.reset_run(self.user_id, "Nurse")
        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["current_page"], 1)

    def test_reset_without_a_run_is_rejected(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "Trapper")

    def test_apply_inactivity_loss_resets_page_and_increments_attempt(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        apply_inactivity_loss(self.run["id"])
        updated = self.service.get_run(self.user_id, "Nurse")
        self.assertEqual(updated["current_page"], 1)
        self.assertEqual(updated["attempt"], 2)

    def test_apply_inactivity_loss_writes_a_flagged_page_log(self):
        apply_inactivity_loss(self.run["id"])
        log = db.session.scalars(
            select(PageStreakPageLog).where(PageStreakPageLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.result, "loss")
        self.assertEqual(log.triggered_by, "inactivity")

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self):
        self.service.submit_result(self.user_id, "Nurse", 1, self.build_for(1), "win")
        self.service.submit_result(self.user_id, "Nurse", 2, self.build_for(2), "win")
        self.service.submit_result(self.user_id, "Nurse", 3, self.build_for(3), "win")
        before_count = db.session.query(PageStreakPageLog).count()
        apply_inactivity_loss(self.run["id"])
        self.assertEqual(db.session.query(PageStreakPageLog).count(), before_count)
        reloaded = self.service.get_run(self.user_id, "Nurse")
        self.assertEqual(reloaded["status"], "completed")


@pytest.mark.unit
class TestPageStreakRosterOrder(PageStreakTestCase):
    def setUp(self):
        super().setUp()
        perks = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"
        seed_perks(perks)
        seed_killers(["Wraith", "Trapper", "Nurse", "Animatronic"])
        self.user_id = self.register_user("orderuser")

        characters = [
            {"name": "Nurse", "category": "Killer", "release_number": 4},
            {"name": "Trapper", "category": "Killer", "release_number": 1},
            {"name": "Wraith", "category": "Killer", "release_number": 2},
            {"name": "Meg Thomas", "category": "Survivor", "release_number": 2},
        ]
        self.perks = perks
        self.characters = characters
        self.service = PageStreakService(perk_service=OrderedFakePerkService(perks, characters))

    def test_killers_are_ordered_by_release_number(self):
        self.assertEqual(
            self.service.get_killers(self.user_id),
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_killer_without_a_release_number_is_kept_at_the_end(self):
        self.assertIn("Animatronic", self.service.get_killers(self.user_id))

    def test_roster_uses_the_same_order(self):
        self.assertEqual(
            [entry["killer"] for entry in self.service.get_roster(self.user_id)],
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_falls_back_to_alphabetical_order_without_release_numbers(self):
        service = PageStreakService(perk_service=FakePerkService(self.perks))
        self.assertEqual(
            service.get_killers(self.user_id),
            ["Animatronic", "Nurse", "Trapper", "Wraith"],
        )


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_phase1_services.py
```python
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.others.draft_service import DraftService
from app.services.others.quest_service import QuestService


@pytest.mark.unit
class TestPhase1Services(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_phase1.db")
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["DRAFT_SERVICE"] = DraftService(db_service=self.db_service)
        self.app.config["QUEST_SERVICE"] = QuestService(db_service=self.db_service)
        self.client = self.app.test_client()

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_draft_service_and_endpoints(self):
        res = self.client.post("/api/v1/draft/create", json={"room_code": "TESTROOM"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["room"]["room_code"], "TESTROOM")
        self.assertEqual(data["room"]["phase"], "bans")

        res = self.client.get("/api/v1/draft/TESTROOM")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["room"]["room_code"], "TESTROOM")
        self.assertEqual(data["room"]["banned_perks"], [])

        res = self.client.post("/api/v1/draft/TESTROOM/action", json={
            "action": "ban",
            "perk": "Sprint Burst",
            "phase": "picks"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("Sprint Burst", data["room"]["banned_perks"])
        self.assertEqual(data["room"]["phase"], "picks")

        res = self.client.post("/api/v1/draft/TESTROOM/action", json={
            "action": "pick",
            "perk": "Dead Hard",
            "role": "survivor"
        })
        self.assertEqual(res.status_code, 200)

        res = self.client.post("/api/v1/draft/TESTROOM/action", json={
            "action": "pick",
            "perk": "Scourge Hook: Pain Resonance",
            "role": "killer",
            "phase": "complete"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("Dead Hard", data["room"]["picked_survivor_perks"])
        self.assertIn("Scourge Hook: Pain Resonance", data["room"]["picked_killer_perks"])
        self.assertEqual(data["room"]["phase"], "complete")

        res = self.client.get("/api/v1/draft/NONEXISTENT")
        self.assertEqual(res.status_code, 404)

    def test_quest_service_and_endpoints(self):
        res = self.client.get("/api/v1/quests/")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        quests = data["quests"]
        self.assertEqual(len(quests), 4)

        daily_quests = [q for q in quests if q["category"] == "daily"]
        weekly_quests = [q for q in quests if q["category"] == "weekly"]
        self.assertEqual(len(daily_quests), 3)
        self.assertEqual(len(weekly_quests), 1)

        first_quest_id = quests[0]["id"]
        res = self.client.post("/api/v1/quests/claim", json={"quest_id": first_quest_id})
        self.assertEqual(res.status_code, 200)
        claim_data = res.get_json()
        self.assertEqual(claim_data["status"], "success")
        self.assertTrue(claim_data["quest"]["is_completed"])
        self.assertGreater(claim_data["xp_reward"], 0)

        res = self.client.post("/api/v1/quests/claim", json={"quest_id": first_quest_id})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_phase2_services.py
```python
import unittest
import pytest
from app import create_app
from app.services.synergy_service import SynergyService, calculate_synergy


@pytest.mark.unit
class TestPhase2Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.synergy_service = SynergyService()

    def test_positive_synergies(self):
        res_sb_vigil = calculate_synergy(["Sprint Burst", "Vigil"], role="survivor")
        self.assertGreater(res_sb_vigil["score"], 50)
        has_sb_vigil = any(
            "Sprint Burst" in syn["perks"] and "Vigil" in syn["perks"]
            for syn in res_sb_vigil["positive_synergies"]
        )
        self.assertTrue(has_sb_vigil)

        res_sloppy_nurses = calculate_synergy(["Sloppy Butcher", "A Nurse's Calling"], role="killer")
        self.assertGreater(res_sloppy_nurses["score"], 50)
        has_sloppy_nurses = any(
            "Sloppy Butcher" in syn["perks"] and "A Nurse's Calling" in syn["perks"]
            for syn in res_sloppy_nurses["positive_synergies"]
        )
        self.assertTrue(has_sloppy_nurses)

        res_pain_pop = calculate_synergy(
            ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel"], role="killer"
        )
        self.assertGreater(res_pain_pop["score"], 50)
        has_pain_pop = any(
            "Scourge Hook: Pain Resonance" in syn["perks"] and "Pop Goes the Weasel" in syn["perks"]
            for syn in res_pain_pop["positive_synergies"]
        )
        self.assertTrue(has_pain_pop)

        res_over_brine = calculate_synergy(["Overcharge", "Call of Brine"], role="killer")
        self.assertGreater(res_over_brine["score"], 50)
        has_over_brine = any(
            "Overcharge" in syn["perks"] and "Call of Brine" in syn["perks"]
            for syn in res_over_brine["positive_synergies"]
        )
        self.assertTrue(has_over_brine)

    def test_anti_synergies(self):
        res_exhaustion = calculate_synergy(["Sprint Burst", "Lithe", "Balanced Landing"], role="survivor")
        has_exhaustion_anti = any(
            "Exhaustion" in anti["description"] or "exhaustion" in anti["description"].lower()
            for anti in res_exhaustion["anti_synergies"]
        )
        self.assertTrue(has_exhaustion_anti)

        res_no_mither = calculate_synergy(["No Mither", "Self-Care"], role="survivor")
        has_no_mither_anti = any(
            "No Mither" in anti["perks"] and "Self-Care" in anti["perks"]
            for anti in res_no_mither["anti_synergies"]
        )
        self.assertTrue(has_no_mither_anti)

        res_ruin_pop = calculate_synergy(["Hex: Ruin", "Pop Goes the Weasel"], role="killer")
        has_ruin_pop_anti = any(
            "Hex: Ruin" in anti["perks"] and "Pop Goes the Weasel" in anti["perks"]
            for anti in res_ruin_pop["anti_synergies"]
        )
        self.assertTrue(has_ruin_pop_anti)

    def test_tactical_badges(self):
        res_gen = calculate_synergy(
            ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel", "Corrupt Intervention"], role="killer"
        )
        self.assertIn("Gen Pressure", res_gen["tactical_badges"])

        res_chase = calculate_synergy(
            ["Windows of Opportunity", "Sprint Burst", "Resilience"], role="survivor"
        )
        self.assertIn("Chase Specialist", res_chase["tactical_badges"])

        res_heal = calculate_synergy(["Botany Knowledge", "We'll Make It"], role="survivor")
        self.assertIn("Healing Core", res_heal["tactical_badges"])

        res_stealth = calculate_synergy(["Distortion", "Off the Record"], role="survivor")
        self.assertIn("Stealth Master", res_stealth["tactical_badges"])

    def test_synergy_endpoint(self):
        res = self.client.post(
            "/api/v1/synergy/analyze",
            json={"perks": ["Sprint Burst", "Vigil"], "role": "survivor"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("score", data)
        self.assertIn("positive_synergies", data)
        self.assertIn("anti_synergies", data)
        self.assertIn("tactical_badges", data)
        self.assertGreater(data["score"], 50)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_phase3_services.py
```python
import unittest
import pytest
from app import create_app
from app.services.others.killer_calc_service import KillerCalcService, calculate_killer_calc


@pytest.mark.unit
class TestPhase3Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.calc_service = KillerCalcService()

    def test_get_killers_data(self):
        killers = self.calc_service.get_killers()
        self.assertIn("huntress", killers)
        self.assertIn("nurse", killers)
        self.assertIn("blight", killers)
        self.assertIn("trapper", killers)
        self.assertIn("wraith", killers)
        self.assertIn("spirit", killers)
        self.assertEqual(killers["huntress"]["base_terror_radius"], 20)
        self.assertEqual(killers["huntress"]["lullaby_radius"], 45)

    def test_huntress_windup_addons_stacking(self):
        result = calculate_killer_calc(
            killer_id="huntress",
            addon_ids=["flower_babushka", "manna_grass_braid"],
            perk_ids=[],
            perk_options={}
        )
        windup_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "windup_time"), None)
        self.assertIsNotNone(windup_stat)
        self.assertEqual(windup_stat["base"], 1.0)
        self.assertEqual(windup_stat["modified"], 0.8)
        self.assertEqual(windup_stat["delta_percent"], -20.0)

    def test_nurse_fatigue_and_charge_addons(self):
        result = calculate_killer_calc(
            killer_id="nurse",
            addon_ids=["fragile_wheeze", "heavy_panting"],
            perk_ids=[],
            perk_options={}
        )
        fatigue_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "blink_fatigue_time"), None)
        charge_stat = next((s for s in result["stat_deltas"] if s["stat_id"] == "blink_charge_speed"), None)
        self.assertIsNotNone(fatigue_stat)
        self.assertIsNotNone(charge_stat)
        self.assertEqual(fatigue_stat["modified"], 2.12)
        self.assertEqual(charge_stat["modified"], 120.0)

    def test_blight_rush_speed_addons(self):
        result = calculate_killer_calc(
            killer_id="blight",
            addon_ids=["blighted_rat", "blighted_crow"],
            perk_ids=[],
            perk_options={}
        )
        rush_speed = next((s for s in result["stat_deltas"] if s["stat_id"] == "rush_speed"), None)
        self.assertIsNotNone(rush_speed)
        self.assertEqual(rush_speed["modified"], 25.0)

    def test_tr_distressing(self):
        result = calculate_killer_calc(
            killer_id="huntress",
            addon_ids=[],
            perk_ids=["distressing"],
            perk_options={}
        )
        self.assertEqual(result["terror_radius"]["base"], 20.0)
        self.assertEqual(result["terror_radius"]["modified"], 25.2)

    def test_tr_monitor_and_abuse_out_of_chase(self):
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["monitor_and_abuse"],
            perk_options={"in_chase": False}
        )
        self.assertEqual(result["terror_radius"]["modified"], 24.0)

    def test_tr_monitor_and_abuse_in_chase(self):
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["monitor_and_abuse"],
            perk_options={"in_chase": True}
        )
        self.assertEqual(result["terror_radius"]["modified"], 40.0)

    def test_tr_agitation(self):
        result = calculate_killer_calc(
            killer_id="trapper",
            addon_ids=[],
            perk_ids=["agitation"],
            perk_options={"carrying_survivor": True}
        )
        self.assertEqual(result["terror_radius"]["modified"], 44.0)

    def test_tr_furtive_chase(self):
        result = calculate_killer_calc(
            killer_id="spirit",
            addon_ids=[],
            perk_ids=["furtive_chase"],
            perk_options={"furtive_chase_tokens": 4}
        )
        self.assertEqual(result["terror_radius"]["modified"], 16.0)

    def test_combined_tr_perks(self):
        result = calculate_killer_calc(
            killer_id="spirit",
            addon_ids=[],
            perk_ids=["distressing", "monitor_and_abuse", "furtive_chase"],
            perk_options={"in_chase": False, "furtive_chase_tokens": 2}
        )
        self.assertEqual(result["terror_radius"]["modified"], 24.32)

    def test_api_calculate_endpoint(self):
        response = self.client.post(
            "/api/v1/killer-calc/calculate",
            json={
                "killer_id": "huntress",
                "addon_ids": ["flower_babushka", "manna_grass_braid"],
                "perk_ids": ["distressing"],
                "perk_options": {}
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("killer", data)
        self.assertIn("terror_radius", data)
        self.assertIn("lullaby", data)
        self.assertIn("stat_deltas", data)
        self.assertEqual(data["terror_radius"]["modified"], 25.2)

    def test_api_data_endpoint(self):
        response = self.client.get("/api/v1/killer-calc/data")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("killers", data)
        self.assertIn("perks", data)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_phase4_services.py
```python
import unittest
import pytest
from app import create_app
from app.services.others.build_service import BuildService


@pytest.mark.unit
class TestPhase4Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.build_service = BuildService()

    def test_seed_builds_count(self):
        builds = self.build_service.get_builds()
        self.assertGreaterEqual(len(builds), 6)

    def test_filter_by_role(self):
        survivor_builds = self.build_service.get_builds(role="survivor")
        killer_builds = self.build_service.get_builds(role="killer")
        
        self.assertTrue(all(b["role"] == "survivor" for b in survivor_builds))
        self.assertTrue(all(b["role"] == "killer" for b in killer_builds))
        self.assertGreater(len(survivor_builds), 0)
        self.assertGreater(len(killer_builds), 0)

    def test_filter_by_category(self):
        otz_builds = self.build_service.get_builds(category="otzdarva")
        meta_builds = self.build_service.get_builds(category="meta")

        self.assertTrue(all(b["category"] == "otzdarva" for b in otz_builds))
        self.assertTrue(all(b["category"] == "meta" for b in meta_builds))
        self.assertGreater(len(otz_builds), 0)
        self.assertGreater(len(meta_builds), 0)

    def test_search_builds(self):
        results = self.build_service.get_builds(search="Huntress")
        self.assertGreater(len(results), 0)
        self.assertIn("Huntress", results[0]["title"])

    def test_sort_by_upvotes(self):
        builds = self.build_service.get_builds(sort_by="upvotes")
        upvotes_list = [b["upvotes"] for b in builds]
        self.assertEqual(upvotes_list, sorted(upvotes_list, reverse=True))

    def test_create_and_upvote_build(self):
        new_build = self.build_service.create_build(
            title="Custom Test Build",
            description="Testing creation",
            role="survivor",
            category="chase",
            character_id="dwight_fairfield",
            perks=["Bond", "Prove Thyself", "Leader", "Sprint Burst"],
            author="Tester"
        )
        self.assertEqual(new_build["title"], "Custom Test Build")
        self.assertEqual(new_build["upvotes"], 0)

        updated_build = self.build_service.upvote_build(new_build["id"])
        self.assertEqual(updated_build["upvotes"], 1)

    def test_api_list_builds(self):
        res = self.client.get("/api/v1/builds/?role=killer&category=otzdarva")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("builds", data)
        self.assertTrue(all(b["role"] == "killer" for b in data["builds"]))

    def test_api_create_build(self):
        payload = {
            "title": "API Created Loadout",
            "description": "API Test loadout description",
            "role": "killer",
            "category": "stealth",
            "character_id": "ghost_face",
            "perks": ["Thrilling Tremors", "I'm All Ears", "Furtive Chase", "Nemesis"],
            "author": "Ghosty"
        }
        res = self.client.post("/api/v1/builds/", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["build"]["title"], "API Created Loadout")

    def test_api_upvote_build(self):
        create_res = self.client.post("/api/v1/builds/", json={
            "title": "Upvote Target Build",
            "description": "Target build",
            "role": "survivor",
            "category": "meme",
            "perks": ["Head On"],
            "author": "MemeKing"
        })
        build_id = create_res.get_json()["build"]["id"]

        upvote_res = self.client.post(f"/api/v1/builds/{build_id}/upvote")
        self.assertEqual(upvote_res.status_code, 200)
        upvote_data = upvote_res.get_json()
        self.assertEqual(upvote_data["build"]["upvotes"], 1)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_phase5_services.py
```python
import unittest
import pytest
from app import create_app
from app.services.others.custom_perk_service import CustomPerkService


@pytest.mark.unit
class TestPhase5Services(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.service = CustomPerkService()

    def test_seed_custom_perks(self):
        perks = self.service.get_custom_perks()
        self.assertGreaterEqual(len(perks), 4)

        names = [p["name"] for p in perks]
        self.assertIn("Hex: Shadow Veil", names)
        self.assertIn("Adrenaline Rush: Overdrive", names)
        self.assertIn("Totem Whisperer", names)
        self.assertIn("Entity's Shadow", names)

    def test_filter_by_role(self):
        survivors = self.service.get_custom_perks(role="survivor")
        killers = self.service.get_custom_perks(role="killer")

        self.assertTrue(all(p["role"] == "survivor" for p in survivors))
        self.assertTrue(all(p["role"] == "killer" for p in killers))
        self.assertGreater(len(survivors), 0)
        self.assertGreater(len(killers), 0)

    def test_filter_by_rarity(self):
        iri_perks = self.service.get_custom_perks(rarity="Iridescent")
        vr_perks = self.service.get_custom_perks(rarity="Very Rare")

        self.assertTrue(all(p["rarity"] == "Iridescent" for p in iri_perks))
        self.assertTrue(all(p["rarity"] == "Very Rare" for p in vr_perks))
        self.assertGreater(len(iri_perks), 0)

    def test_search_custom_perks(self):
        results = self.service.get_custom_perks(search="Shadow")
        self.assertGreater(len(results), 0)
        self.assertTrue(any("Shadow" in p["name"] or "Shadow" in p["description"] for p in results))

    def test_sort_custom_perks(self):
        upvote_sorted = self.service.get_custom_perks(sort_by="upvotes")
        upvotes_list = [p["upvotes"] for p in upvote_sorted]
        self.assertEqual(upvotes_list, sorted(upvotes_list, reverse=True))

    def test_create_and_upvote_custom_perk(self):
        new_perk = self.service.create_custom_perk(
            name="Test Custom Perk",
            role="survivor",
            character_name="Dwight Fairfield",
            rarity="Iridescent",
            icon_preset="sparkles",
            description="Grants immunity to all status effects for 10 seconds.",
            author="UnitTester"
        )
        self.assertEqual(new_perk["name"], "Test Custom Perk")
        self.assertEqual(new_perk["role"], "survivor")
        self.assertEqual(new_perk["upvotes"], 0)

        updated_perk = self.service.upvote_custom_perk(new_perk["id"])
        self.assertIsNotNone(updated_perk)
        self.assertEqual(updated_perk["upvotes"], 1)

    def test_upvote_nonexistent_custom_perk(self):
        res = self.service.upvote_custom_perk(999999)
        self.assertIsNone(res)

    def test_api_list_custom_perks(self):
        res = self.client.get("/api/v1/custom-perks/?role=killer")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("custom_perks", data)
        self.assertTrue(all(p["role"] == "killer" for p in data["custom_perks"]))

    def test_api_create_custom_perk(self):
        payload = {
            "name": "API Perk Concept",
            "role": "killer",
            "character_name": "The Nurse",
            "rarity": "Very Rare",
            "icon_preset": "zap",
            "description": "Blink distance increased by 20%.",
            "author": "BlinkMaster"
        }
        res = self.client.post("/api/v1/custom-perks/", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("custom_perk", data)
        self.assertEqual(data["custom_perk"]["name"], "API Perk Concept")

    def test_api_create_custom_perk_validation_error(self):
        res = self.client.post("/api/v1/custom-perks/", json={"role": "survivor", "description": "Test"})
        self.assertEqual(res.status_code, 400)

    def test_api_upvote_custom_perk(self):
        create_res = self.client.post("/api/v1/custom-perks/", json={
            "name": "Upvote Target Perk",
            "role": "survivor",
            "character_name": "Claudette Morel",
            "rarity": "Uncommon",
            "icon_preset": "heart",
            "description": "Self-heal speed increased by 10%.",
            "author": "Medic"
        })
        perk_id = create_res.get_json()["custom_perk"]["id"]

        upvote_res = self.client.post(f"/api/v1/custom-perks/{perk_id}/upvote")
        self.assertEqual(upvote_res.status_code, 200)
        upvote_data = upvote_res.get_json()
        self.assertEqual(upvote_data["custom_perk"]["upvotes"], 1)

    def test_api_upvote_nonexistent_perk(self):
        res = self.client.post("/api/v1/custom-perks/999999/upvote")
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_phase6_services.py
```python
import unittest
import pytest
from app import create_app
from app.services.map_service import MapService


@pytest.mark.unit
class TestMapService(unittest.TestCase):
    def setUp(self):
        self.service = MapService()
        self.app = create_app()
        self.client = self.app.test_client()

    def test_get_maps_list(self):
        maps = self.service.get_maps()
        self.assertGreaterEqual(len(maps), 6)
        names = [m['name'] for m in maps]
        self.assertIn("Coal Tower", names)

    def test_get_map_detail(self):
        detail = self.service.get_map_by_id("coal_tower")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["name"], "Coal Tower")
        self.assertIn("totem_spawns", detail)
        self.assertEqual(len(detail["totem_spawns"]), 5)

    def test_api_maps_endpoint(self):
        res = self.client.get('/api/v1/maps')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("maps", data)

    def test_api_map_detail_endpoint(self):
        res = self.client.get('/api/v1/maps/azarov_resting_place')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("map", data)
        self.assertEqual(data["map"]["name"], "Azarov's Resting Place")


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_scheduler_config.py
```python
import unittest
from unittest.mock import MagicMock, patch
import pytest
from app import create_app
from app.core.config import Config, TestingConfig


@pytest.mark.unit
class TestSchedulerConfig(unittest.TestCase):
    def test_testing_config_disables_scheduler(self):
        self.assertFalse(TestingConfig.SCHEDULER_ENABLED)
        self.assertTrue(TestingConfig.TESTING)

    def test_default_config_has_scheduler_enabled(self):
        self.assertTrue(Config.SCHEDULER_ENABLED)

    @patch("app.BackgroundScheduler")
    def test_scheduler_initialization_when_enabled(self, mock_scheduler_cls):
        mock_instance = MagicMock()
        mock_scheduler_cls.return_value = mock_instance

        class CustomConfig(TestingConfig):
            TESTING = False
            SCHEDULER_ENABLED = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

        create_app(CustomConfig)
        self.assertTrue(mock_scheduler_cls.called)
        self.assertTrue(mock_instance.add_job.called)
        self.assertTrue(mock_instance.start.called)

    @patch("app.BackgroundScheduler")
    def test_scheduler_not_initialized_when_disabled(self, mock_scheduler_cls):
        class DisabledConfig(TestingConfig):
            TESTING = False
            SCHEDULER_ENABLED = False
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

        create_app(DisabledConfig)
        self.assertFalse(mock_scheduler_cls.called)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_security_and_auth.py
```python
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from flask import Flask, g, jsonify
from app.core.security import (
    DEFAULT_JWT_ALGORITHM,
    DEFAULT_SECRET_KEY,
    admin_required,
    decode_token,
    generate_token,
    hash_password,
    login_required,
    verify_password,
)
from app.models.user import User


@pytest.mark.unit
class TestPasswordHashing:
    def test_hash_and_verify_success(self) -> None:
        raw = "UltraSecureDbD#2026!"
        pwd_hash = hash_password(raw)
        assert pwd_hash != raw
        assert verify_password(raw, pwd_hash) is True

    def test_verify_failure_wrong_password(self) -> None:
        raw = "CorrectPassword123"
        pwd_hash = hash_password(raw)
        assert verify_password("WrongPassword123", pwd_hash) is False

    def test_verify_empty_inputs(self) -> None:
        assert verify_password("", "some_hash") is False
        assert verify_password("some_pass", "") is False
        assert verify_password("", "") is False


@pytest.mark.unit
class TestJWTGenerationAndDecode:
    def test_generate_and_decode_token_in_app_context(self, app: Flask) -> None:
        with app.app_context():
            token = generate_token(user_id=42, role="admin", extra_claims={"env": "unit_test"})
            payload = decode_token(token)

            assert payload is not None
            assert payload["sub"] == "42"
            assert payload["role"] == "admin"
            assert payload["env"] == "unit_test"
            assert "exp" in payload
            assert "iat" in payload

    def test_generate_and_decode_token_standalone_fallback(self) -> None:
        token = generate_token(user_id=101, role="user")
        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "101"
        assert payload["role"] == "user"

    def test_decode_token_expired(self) -> None:
        now = datetime.now(timezone.utc)
        expired_payload = {
            "sub": "99",
            "role": "user",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        }
        expired_token = jwt.encode(expired_payload, DEFAULT_SECRET_KEY, algorithm=DEFAULT_JWT_ALGORITHM)
        assert decode_token(expired_token) is None

    def test_decode_token_invalid_signature(self) -> None:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": "99",
            "role": "user",
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        tampered_token = jwt.encode(payload, "wrong-secret-key-1234567890!", algorithm=DEFAULT_JWT_ALGORITHM)
        assert decode_token(tampered_token) is None

    def test_decode_empty_or_malformed_token(self) -> None:
        assert decode_token("") is None
        assert decode_token("not.a.valid.jwt") is None


@pytest.mark.unit
class TestAuthDecoratorsAndUserExtraction:
    @pytest.fixture
    def test_flask_app(self) -> Flask:
        test_app = Flask(__name__)
        test_app.config["SECRET_KEY"] = "unit-test-secret-key-0123456789!"
        test_app.config["JWT_SECRET_KEY"] = "unit-test-secret-key-0123456789!"
        test_app.config["TESTING"] = True

        @test_app.route("/api/protected", methods=["GET"])
        @login_required
        def protected_route():
            return jsonify({"user_id": g.current_user.id, "role": g.current_user.role}), 200

        @test_app.route("/api/admin-only", methods=["GET"])
        @admin_required
        def admin_route():
            return jsonify({"admin_user_id": g.current_user.id, "status": "authorized"}), 200

        return test_app

    def test_login_required_unauthorized_missing_token(self, test_flask_app: Flask) -> None:
        client = test_flask_app.test_client()
        response = client.get("/api/protected")
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Authentication required"

    def test_login_required_success_via_bearer(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        mock_user = User(
            id=7,
            username="dwight_fairfield",
            email="dwight@example.com",
            password_hash=hash_password("test"),
            role="user",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=7, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: mock_user if pk == 7 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["user_id"] == 7
        assert data["role"] == "user"

    def test_login_required_success_via_query_token(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        mock_user = User(
            id=12,
            username="meg_thomas",
            email="meg@example.com",
            password_hash=hash_password("sprintburst"),
            role="user",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=12, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: mock_user if pk == 12 else None)

        client = test_flask_app.test_client()
        response = client.get(f"/api/protected?token={token}")
        assert response.status_code == 200
        data = response.get_json()
        assert data["user_id"] == 12

    def test_admin_required_forbidden_for_standard_user(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        standard_user = User(
            id=15,
            username="claudette_morel",
            email="claudette@example.com",
            password_hash=hash_password("botany"),
            role="user",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=15, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: standard_user if pk == 15 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/admin-only", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"] == "Admin access required"

    def test_admin_required_success_for_admin_role(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        admin_user = User(
            id=1,
            username="the_entity_admin",
            email="entity@example.com",
            password_hash=hash_password("masterkey"),
            role="admin",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=1, role="admin")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: admin_user if pk == 1 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/admin-only", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["admin_user_id"] == 1
        assert data["status"] == "authorized"

    def test_inactive_user_rejected(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        inactive_user = User(
            id=88,
            username="banned_player",
            email="banned@example.com",
            password_hash=hash_password("bannedpass"),
            role="user",
            is_active=False,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=88, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: inactive_user if pk == 88 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
```

### backend/tests/unit/test_security_guards.py
```python
import pytest
from app.core.limiter import get_client_ip, validate_honeypot
from app.services.altcha_service import AltchaService


@pytest.mark.unit
def test_validate_honeypot_clean_data():
    assert validate_honeypot({}) is True
    assert validate_honeypot({"username": "entity", "email": "entity@lemondbd.com"}) is True
    assert validate_honeypot({"website_trap": "", "honeypot_verification": None, "company_fax": "  "}) is True
    assert validate_honeypot({"website_trap": False, "honeypot_verification": None}) is True
    assert validate_honeypot(None) is True


@pytest.mark.unit
def test_validate_honeypot_trapped_data():
    assert validate_honeypot({"website_trap": "http://spam.org"}) is False
    assert validate_honeypot({"honeypot_verification": "bot_value"}) is False
    assert validate_honeypot({"company_fax": "555-0199"}) is False
    assert validate_honeypot({"website_trap": True}) is False
    assert validate_honeypot({"honeypot_verification": True}) is False
    assert validate_honeypot({"company_fax": True}) is False
    assert validate_honeypot({"custom_trap": "spam"}, field_names=("custom_trap",)) is False
    assert validate_honeypot({"custom_trap": True}, field_names=("custom_trap",)) is False


@pytest.mark.unit
def test_get_client_ip(app):
    with app.test_request_context("/", headers={
        "X-Real-IP": "198.51.100.99",
        "X-Forwarded-For": "203.0.113.195, 70.41.3.18"
    }):
        ip = get_client_ip()
        assert ip == "198.51.100.99"

    with app.test_request_context("/", headers={"X-Real-IP": "  198.51.100.50  "}):
        ip = get_client_ip()
        assert ip == "198.51.100.50"

    with app.test_request_context("/", headers={"X-Forwarded-For": "203.0.113.195, 70.41.3.18"}):
        ip = get_client_ip()
        assert ip == "203.0.113.195"

    with app.test_request_context("/", headers={"X-Forwarded-For": "   198.51.100.1  , 10.0.0.1"}):
        ip = get_client_ip()
        assert ip == "198.51.100.1"

    with app.test_request_context("/"):
        ip = get_client_ip()
        assert ip in ("127.0.0.1", "localhost", None) or isinstance(ip, str)


@pytest.mark.unit
def test_register_honeypot_rejection_string(client):
    payload = {
        "username": "spambot1",
        "email": "spambot1@test.com",
        "password": "Password123!",
        "website_trap": "http://spamsite.xyz",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Spam detected."
    assert data["status"] == 400


@pytest.mark.unit
def test_register_honeypot_rejection_boolean(client):
    payload = {
        "username": "spambot2",
        "email": "spambot2@test.com",
        "password": "Password123!",
        "honeypot_verification": True,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Spam detected."
    assert data["status"] == 400


@pytest.mark.unit
def test_bug_report_honeypot_rejection(client):
    payload = {
        "title": "Broken link spam",
        "message": "Click here to buy stuff",
        "reporter_email": "bot@spam.com",
        "company_fax": "1-800-SPAM-NOW",
    }
    response = client.post("/api/v1/bug-reports", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Spam detected."
    assert data["status"] == 400


@pytest.mark.unit
def test_altcha_challenge_cache_control_headers(client):
    response = client.get("/api/v1/auth/altcha-challenge")
    assert response.status_code == 200
    cache_control = response.headers.get("Cache-Control", "")
    assert "no-store" in cache_control
    assert "no-cache" in cache_control
    assert "must-revalidate" in cache_control


@pytest.mark.unit
def test_rate_limit_429_format():
    from app import create_app
    from app.core.config import TestingConfig

    class RateLimitConfig(TestingConfig):
        RATELIMIT_ENABLED = True

    rate_app = create_app(RateLimitConfig)
    rate_client = rate_app.test_client()

    ip_headers = {"X-Real-IP": "192.0.2.42"}
    for i in range(5):
        rate_client.post("/api/v1/auth/forgot-password", json={"email": f"test{i}@test.com"}, headers=ip_headers)

    resp = rate_client.post("/api/v1/auth/forgot-password", json={"email": "test6@test.com"}, headers=ip_headers)
    assert resp.status_code == 429
    data = resp.get_json()
    assert data["error"] == "Too Many Requests"
    assert data["message"] == "Rate limit exceeded. Please wait a moment before trying again."
    assert "retry_after" in data


@pytest.mark.unit
def test_altcha_service_max_number_validation():
    secret_key = "test-secret-key"
    with pytest.raises(ValueError, match="max_number must be positive"):
        AltchaService.create_challenge(secret_key, max_number=0)

    with pytest.raises(ValueError, match="max_number must be positive"):
        AltchaService.create_challenge(secret_key, max_number=-10)


@pytest.mark.unit
def test_altcha_service_verify_missing_maxnumber():
    secret_key = "test-secret-key"
    payload = {
        "algorithm": "SHA-256",
        "challenge": "a" * 64,
        "number": 100,
        "salt": "somesalt1234",
        "signature": "b" * 64,
        "expires": 9999999999,
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "maxnumber" in err.lower()
```

### backend/tests/unit/test_smash_api.py
```python
import time
import pytest
from app.core.security import generate_token, hash_password
from app.models.user import User
from app.routes.others.smash_or_pass import vote_rate_limiter
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.others.smash_or_pass_service import SmashOrPassService


@pytest.fixture(autouse=True)
def setup_smash_data(db_session):
    seed_smash_rosters()
    vote_rate_limiter.reset()
    yield
    vote_rate_limiter.reset()


def _create_user(db_session, username="testuser", email="test@example.com", role="user"):
    user = User(
        username=username,
        email=email,
        password_hash=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.mark.unit
def test_get_rosters(app):
    client = app.test_client()
    res = client.get("/api/v1/smash-or-pass/rosters")
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["count"] == 6
    assert len(json_data["data"]) == 6

    slugs = {r["slug"] for r in json_data["data"]}
    assert slugs == {
        "canon",
        "hooked_on_you",
        "legendary_cosplay",
        "cyberpunk_2077",
        "anime_manga",
        "gothic_eldritch",
    }

    canon = next(r for r in json_data["data"] if r["slug"] == "canon")
    assert canon["entity_count"] == 98
    assert canon["total_votes"] == 0
    assert canon["is_active"] is True
    assert "theme_color" in canon
    assert "name_i18n_key" in canon


@pytest.mark.unit
def test_get_roster_feed_success(app):
    client = app.test_client()
    res = client.get("/api/v1/smash-or-pass/rosters/canon/feed")
    assert res.status_code == 200
    json_data = res.get_json()
    assert "data" in json_data
    feed_data = json_data["data"]

    assert feed_data["roster"]["slug"] == "canon"
    assert feed_data["total_remaining"] == 98
    assert len(feed_data["entities"]) == 50

    entity = feed_data["entities"][0]
    assert "id" in entity
    assert "name" in entity
    assert "slug" in entity
    assert "role" in entity
    assert "gender" in entity
    assert "stat" in entity


@pytest.mark.unit
def test_get_roster_feed_with_filters_and_session(app):
    client = app.test_client()

    res = client.get(
        "/api/v1/smash-or-pass/rosters/canon/feed?role=Survivor&gender=female&limit=10"
    )
    assert res.status_code == 200
    feed_data = res.get_json()["data"]
    assert len(feed_data["entities"]) == 10
    assert feed_data["total_remaining"] == 28
    assert all(
        e["role"] == "Survivor" and e["gender"] == "female"
        for e in feed_data["entities"]
    )

    first_entity = feed_data["entities"][0]

    vote_res = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "entity_id": first_entity["id"],
            "vote_type": "smash",
            "session_id": "test_session_feed_filter",
        },
    )
    assert vote_res.status_code == 200

    res_after = client.get(
        "/api/v1/smash-or-pass/rosters/canon/feed?role=Survivor&gender=female&limit=10&session_id=test_session_feed_filter"
    )
    assert res_after.status_code == 200
    feed_after = res_after.get_json()["data"]
    assert feed_after["total_remaining"] == 27

    remaining_ids = {e["id"] for e in feed_after["entities"]}
    assert first_entity["id"] not in remaining_ids


@pytest.mark.unit
def test_get_roster_feed_not_found(app):
    client = app.test_client()
    res = client.get("/api/v1/smash-or-pass/rosters/non_existent_roster/feed")
    assert res.status_code == 404
    assert "error" in res.get_json()


@pytest.mark.unit
def test_cast_vote_valid_by_character_slug_and_entity_id(app):
    client = app.test_client()

    res1 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "session_id": "sess_cast_test",
        },
    )
    assert res1.status_code == 200
    data1 = res1.get_json()["data"]
    assert data1["character_slug"] == "ada_wong"
    assert data1["smash_count"] == 1
    assert data1["pass_count"] == 0
    assert data1["total_votes"] == 1
    assert data1["smash_rate"] == 100.0

    feed_res = client.get("/api/v1/smash-or-pass/rosters/cyberpunk_2077/feed?limit=1")
    cyber_entity = feed_res.get_json()["data"]["entities"][0]

    res2 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "entity_id": cyber_entity["id"],
            "vote_type": "super_smash",
            "session_id": "sess_cast_test",
        },
    )
    assert res2.status_code == 200
    data2 = res2.get_json()["data"]
    assert data2["id"] == cyber_entity["id"]
    assert data2["super_smash_count"] == 1
    assert data2["total_votes"] == 1

    res3 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "ada_wong",
            "vote_type": "pass",
            "session_id": "sess_cast_test",
        },
    )
    assert res3.status_code == 200
    data3 = res3.get_json()["data"]
    assert data3["smash_count"] == 0
    assert data3["pass_count"] == 1
    assert data3["total_votes"] == 1
    assert data3["smash_rate"] == 0.0


@pytest.mark.unit
def test_cast_vote_authenticated_and_spoof_prevention(app, db_session):
    client = app.test_client()
    user = _create_user(db_session, username="alice", email="alice@test.com")
    token = generate_token(user.id, role="user")

    res = client.post(
        "/api/v1/smash-or-pass/vote",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "user_id": 99999,
        },
    )
    assert res.status_code == 200

    service = SmashOrPassService()
    user_votes = service.get_user_votes(user_id=user.id, edition="canon")
    assert len(user_votes) == 1
    assert user_votes[0]["character_slug"] == "ada_wong"

    spoofed_votes = service.get_user_votes(user_id=99999, edition="canon")
    assert len(spoofed_votes) == 0


@pytest.mark.unit
def test_cast_vote_validation_errors(app):
    client = app.test_client()

    res1 = client.post("/api/v1/smash-or-pass/vote", json={"vote_type": "smash"})
    assert res1.status_code == 400
    assert "required" in res1.get_json()["error"]

    res2 = client.post(
        "/api/v1/smash-or-pass/vote", json={"character_slug": "ada_wong"}
    )
    assert res2.status_code == 400
    assert "required" in res2.get_json()["error"]

    res3 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={"character_slug": "ada_wong", "vote_type": "invalid_vote"},
    )
    assert res3.status_code == 400
    assert "Invalid vote_type" in res3.get_json()["error"]

    res4 = client.post(
        "/api/v1/smash-or-pass/vote",
        json={"character_slug": "non_existent_char_12345", "vote_type": "smash"},
    )
    assert res4.status_code == 400
    assert "not found" in res4.get_json()["error"].lower()


@pytest.mark.unit
def test_cast_vote_rate_limiting_and_pruning(app):
    client = app.test_client()
    vote_rate_limiter.reset()

    for i in range(60):
        res = client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": "rate_limit_session",
            },
        )
        assert res.status_code == 200

    res_blocked = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "session_id": "rate_limit_session",
        },
    )
    assert res_blocked.status_code == 429
    assert "Rate limit exceeded" in res_blocked.get_json()["error"]

    res_other = client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "session_id": "other_unlimited_session",
        },
    )
    assert res_other.status_code == 200

    vote_rate_limiter._requests["127.0.0.1:stale_sess"] = [time.time() - 100]
    vote_rate_limiter._prune_stale_keys(time.time() - 60)
    assert "127.0.0.1:stale_sess" not in vote_rate_limiter._requests


@pytest.mark.unit
def test_get_leaderboard_success_and_sorting(app):
    client = app.test_client()

    for i in range(3):
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "ada_wong",
                "vote_type": "smash",
                "session_id": f"lb_sess_ada_{i}",
            },
        )

    for i in range(2):
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "sable_ward",
                "vote_type": "smash",
                "session_id": f"lb_sess_sable_s_{i}",
            },
        )
    client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "sable_ward",
            "vote_type": "pass",
            "session_id": "lb_sess_sable_p",
        },
    )

    for i in range(2):
        client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "character_slug": "the_trapper",
                "vote_type": "pass",
                "session_id": f"lb_sess_trap_{i}",
            },
        )

    res = client.get("/api/v1/smash-or-pass/rosters/canon/leaderboard?sort_by=smash_rate")
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["roster"] == "canon"
    assert json_data["count"] > 0

    leaderboard = json_data["data"]
    ada_entry = next(e for e in leaderboard if e["slug"] == "ada_wong")
    assert ada_entry["rank"] == 1
    assert ada_entry["tier"] == "God Tier"
    assert ada_entry["smash_rate"] == 100.0

    sable_entry = next(e for e in leaderboard if e["slug"] == "sable_ward")
    assert sable_entry["tier"] == "Fatal Attraction"

    trapper_entry = next(e for e in leaderboard if e["slug"] == "the_trapper")
    assert trapper_entry["tier"] == "Eldritch Void"
    assert trapper_entry["smash_rate"] == 0.0

    res_surv = client.get(
        "/api/v1/smash-or-pass/rosters/canon/leaderboard?role=Survivor&limit=5"
    )
    assert res_surv.status_code == 200
    surv_data = res_surv.get_json()["data"]
    assert len(surv_data) == 5
    assert all(e["role"] == "Survivor" for e in surv_data)

    res_404 = client.get("/api/v1/smash-or-pass/rosters/unknown_roster/leaderboard")
    assert res_404.status_code == 404


@pytest.mark.unit
def test_post_session_reset(app):
    client = app.test_client()

    client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "ada_wong",
            "vote_type": "smash",
            "session_id": "session_to_reset_123",
        },
    )
    client.post(
        "/api/v1/smash-or-pass/vote",
        json={
            "character_slug": "sable_ward",
            "vote_type": "pass",
            "session_id": "session_to_reset_123",
        },
    )

    res = client.post(
        "/api/v1/smash-or-pass/session/reset",
        json={"session_id": "session_to_reset_123"},
    )
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["status"] == "success"
    assert json_data["data"]["reset_count"] == 2

    res_again = client.post(
        "/api/v1/smash-or-pass/session/reset",
        json={"session_id": "session_to_reset_123"},
    )
    assert res_again.status_code == 200
    assert res_again.get_json()["data"]["reset_count"] == 0

    res_bad = client.post("/api/v1/smash-or-pass/session/reset", json={})
    assert res_bad.status_code == 400


@pytest.mark.unit
def test_post_user_votes_reset_and_idor_protection(app, db_session):
    client = app.test_client()
    user1 = _create_user(db_session, username="bob", email="bob@test.com")
    user2 = _create_user(db_session, username="charlie", email="charlie@test.com")
    admin = _create_user(db_session, username="admin_bob", email="admin_bob@test.com", role="admin")

    token1 = generate_token(user1.id, role="user")
    token_admin = generate_token(admin.id, role="admin")

    service = SmashOrPassService()
    service.cast_vote(character_slug="feng_min", vote_type="super_smash", user_id=user1.id)
    assert len(service.get_user_votes(user1.id, "canon")) == 1

    res_unauth_no_id = client.post("/api/v1/smash-or-pass/user-votes/reset", json={})
    assert res_unauth_no_id.status_code == 400

    res_unauth_with_id = client.post(
        "/api/v1/smash-or-pass/user-votes/reset", json={"user_id": user1.id}
    )
    assert res_unauth_with_id.status_code == 401

    res_idor = client.post(
        "/api/v1/smash-or-pass/user-votes/reset",
        headers={"Authorization": f"Bearer {token1}"},
        json={"user_id": user2.id},
    )
    assert res_idor.status_code == 403

    res_own = client.post(
        "/api/v1/smash-or-pass/user-votes/reset",
        headers={"Authorization": f"Bearer {token1}"},
        json={},
    )
    assert res_own.status_code == 200
    assert res_own.get_json()["data"]["reset_count"] == 1
    assert len(service.get_user_votes(user1.id, "canon")) == 0

    service.cast_vote(character_slug="feng_min", vote_type="smash", user_id=user2.id)
    assert len(service.get_user_votes(user2.id, "canon")) == 1

    res_admin = client.post(
        "/api/v1/smash-or-pass/user-votes/reset",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"user_id": user2.id},
    )
    assert res_admin.status_code == 200
    assert res_admin.get_json()["data"]["reset_count"] == 1
    assert len(service.get_user_votes(user2.id, "canon")) == 0


@pytest.mark.unit
def test_get_translations_smash_route(app):
    client = app.test_client()

    res_en = client.get("/api/v1/smash-or-pass/translations?locale=en")
    assert res_en.status_code == 200
    data_en = res_en.get_json()
    assert data_en["locale"] == "en"
    assert data_en["data"]["smashOrPass.tiers.godTier"] == "God Tier"

    res_ja = client.get("/api/v1/smash-or-pass/translations?locale=ja")
    assert res_ja.status_code == 200
    data_ja = res_ja.get_json()
    assert data_ja["locale"] == "ja"
    assert data_ja["data"]["smashOrPass.tiers.godTier"] == "神ティア"


@pytest.mark.unit
def test_global_i18n_dynamic_endpoint(app):
    client = app.test_client()

    res_en = client.get("/api/v1/i18n/en")
    assert res_en.status_code == 200
    data_en = res_en.get_json()
    assert data_en["locale"] == "en"
    assert data_en["data"]["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Fog Canon"
    assert data_en["data"]["smashOrPass.tiers.godTier"] == "God Tier"

    res_ja = client.get("/api/v1/i18n/ja")
    assert res_ja.status_code == 200
    data_ja = res_ja.get_json()
    assert data_ja["locale"] == "ja"
    assert "霧の正史" in data_ja["data"]["smashOrPass.rosters.canon.name"]
    assert data_ja["data"]["smashOrPass.tiers.godTier"] == "神ティア"

    res_es = client.get("/api/v1/i18n/es")
    assert res_es.status_code == 200
    data_es = res_es.get_json()
    assert data_es["locale"] == "es"
    assert data_es["data"]["smashOrPass.tiers.godTier"] == "Nivel Dios"

    res_de = client.get("/api/v1/i18n/de")
    assert res_de.status_code == 200
    data_de = res_de.get_json()
    assert data_de["locale"] == "de"
    assert data_de["data"]["smashOrPass.tiers.godTier"] == "Götter-Stufe"

    res_pl = client.get("/api/v1/i18n/pl")
    assert res_pl.status_code == 200
    data_pl = res_pl.get_json()
    assert data_pl["locale"] == "pl"
    assert data_pl["data"]["smashOrPass.tiers.godTier"] == "Boski Poziom"


@pytest.mark.unit
def test_legacy_routes_backward_compatibility(app, db_session):
    client = app.test_client()
    user = _create_user(db_session, username="legacy_user", email="legacy@test.com")
    token = generate_token(user.id, role="user")

    res_ed = client.get("/api/v1/smash-or-pass/editions")
    assert res_ed.status_code == 200
    ed_data = res_ed.get_json()["data"]
    assert len(ed_data) >= 6

    res_chars = client.get(
        "/api/v1/smash-or-pass/characters?edition=canon&role=Survivor&search=Leon"
    )
    assert res_chars.status_code == 200
    chars_data = res_chars.get_json()
    assert chars_data["count"] == 1
    assert chars_data["data"][0]["character_slug"] == "leon_scott_kennedy"

    client.post(
        "/api/v1/smash-or-pass/vote",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "character_slug": "leon_scott_kennedy",
            "vote_type": "smash",
        },
    )

    res_uv = client.get(
        "/api/v1/smash-or-pass/user-votes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_uv.status_code == 200
    uv_data = res_uv.get_json()
    assert uv_data["count"] == 1
    assert uv_data["data"][0]["character_slug"] == "leon_scott_kennedy"
```

### backend/tests/unit/test_smash_seeder_service.py
```python
import pytest
from sqlalchemy import func, select
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashPassStat,
    Translation,
)
from app.seeds.smash_roster_seeder import seed_smash_rosters
from app.services.others.smash_or_pass_service import SmashOrPassService


@pytest.mark.unit
def test_seed_smash_rosters_creates_all_rosters_entities_and_stats(db_session):
    seed_smash_rosters()

    rosters = db_session.scalars(select(Roster)).all()
    assert len(rosters) == 6
    roster_slugs = {r.slug for r in rosters}
    assert roster_slugs == {
        "canon",
        "hooked_on_you",
        "legendary_cosplay",
        "cyberpunk_2077",
        "anime_manga",
        "gothic_eldritch",
    }

    canon_roster = db_session.scalar(select(Roster).where(Roster.slug == "canon"))
    assert canon_roster is not None
    canon_entities = canon_roster.entities
    assert len(canon_entities) == 98

    survivor_count = sum(1 for e in canon_entities if e.role == "Survivor")
    killer_count = sum(1 for e in canon_entities if e.role == "Killer")
    assert survivor_count == 54
    assert killer_count == 44

    hoy_roster = db_session.scalar(select(Roster).where(Roster.slug == "hooked_on_you"))
    assert len(hoy_roster.entities) == 8

    leg_roster = db_session.scalar(select(Roster).where(Roster.slug == "legendary_cosplay"))
    assert len(leg_roster.entities) == 12

    cyber_roster = db_session.scalar(select(Roster).where(Roster.slug == "cyberpunk_2077"))
    assert len(cyber_roster.entities) == 10

    anime_roster = db_session.scalar(select(Roster).where(Roster.slug == "anime_manga"))
    assert len(anime_roster.entities) == 10

    gothic_roster = db_session.scalar(select(Roster).where(Roster.slug == "gothic_eldritch"))
    assert len(gothic_roster.entities) == 10

    all_entities = db_session.scalars(select(Entity)).all()
    assert len(all_entities) == 98 + 8 + 12 + 10 + 10 + 10

    for entity in all_entities:
        assert entity.stat is not None
        assert entity.stat.smash_count == 0
        assert entity.stat.pass_count == 0
        assert entity.stat.super_smash_count == 0
        assert entity.stat.total_votes == 0
        assert entity.stat.smash_rate == 0.0
        assert entity.metadata_json is not None
        assert "chaos_score" in entity.metadata_json
        assert "danger_level" in entity.metadata_json
        assert "quote" in entity.metadata_json
        assert "compatibility_tags" in entity.metadata_json

    locales = db_session.scalars(select(Translation.locale).distinct()).all()
    assert set(locales) == {"en", "es", "de", "ja", "pl"}


@pytest.mark.unit
def test_seed_smash_rosters_idempotency(db_session):
    seed_smash_rosters()
    initial_roster_count = db_session.scalar(select(func.count(Roster.id)))
    initial_entity_count = db_session.scalar(select(func.count(Entity.id)))
    initial_stat_count = db_session.scalar(select(func.count(EntityStat.id)))
    initial_trans_count = db_session.scalar(select(func.count(Translation.id)))

    seed_smash_rosters()
    assert db_session.scalar(select(func.count(Roster.id))) == initial_roster_count
    assert db_session.scalar(select(func.count(Entity.id))) == initial_entity_count
    assert db_session.scalar(select(func.count(EntityStat.id))) == initial_stat_count
    assert db_session.scalar(select(func.count(Translation.id))) == initial_trans_count


@pytest.mark.unit
def test_service_get_rosters(db_session):
    service = SmashOrPassService()
    rosters = service.get_rosters(active_only=True)

    assert len(rosters) == 6
    canon = next((r for r in rosters if r["slug"] == "canon"), None)
    assert canon is not None
    assert canon["entity_count"] == 98
    assert canon["total_votes"] == 0
    assert canon["theme_color"] == "#ff0055"
    assert canon["name_i18n_key"] == "smashOrPass.rosters.canon.name"


@pytest.mark.unit
def test_service_get_feed_and_unvoted_filtering(db_session):
    service = SmashOrPassService()

    feed_res = service.get_feed(roster_slug="canon", limit=10)
    assert feed_res is not None
    assert feed_res["total_remaining"] == 98
    feed = feed_res["entities"]
    assert len(feed) == 10

    first_entity = feed[0]
    second_entity = feed[1]

    service.cast_vote(
        entity_id=first_entity["id"],
        vote_type="smash",
        session_id="session_test_1",
    )
    service.cast_vote(
        entity_id=second_entity["id"],
        vote_type="pass",
        session_id="session_test_1",
    )

    feed_filtered_res = service.get_feed(
        roster_slug="canon", session_id="session_test_1", limit=10
    )
    assert feed_filtered_res["total_remaining"] == 96
    filtered_ids = {e["id"] for e in feed_filtered_res["entities"]}
    assert first_entity["id"] not in filtered_ids
    assert second_entity["id"] not in filtered_ids

    feed_other_res = service.get_feed(
        roster_slug="canon", session_id="session_other", limit=10
    )
    assert feed_other_res["total_remaining"] == 98
    other_ids = {e["id"] for e in feed_other_res["entities"]}
    assert first_entity["id"] in other_ids
    assert second_entity["id"] in other_ids

    female_survivors_res = service.get_feed(
        roster_slug="canon", role="Survivor", gender="female", limit=50
    )
    female_survivors = female_survivors_res["entities"]
    assert len(female_survivors) == 28
    assert female_survivors_res["total_remaining"] == 28
    assert all(e["role"] == "Survivor" and e["gender"] == "female" for e in female_survivors)


@pytest.mark.unit
def test_service_cast_vote_atomic_counts_and_rate(db_session):
    service = SmashOrPassService()

    res1 = service.cast_vote(
        character_slug="ada_wong",
        vote_type="smash",
        session_id="user_sess_1",
        edition="canon",
    )
    assert res1["stat"]["smash_count"] == 1
    assert res1["stat"]["pass_count"] == 0
    assert res1["stat"]["total_votes"] == 1
    assert res1["stat"]["smash_rate"] == 100.0

    res2 = service.cast_vote(
        character_slug="ada_wong",
        vote_type="pass",
        session_id="user_sess_2",
        edition="canon",
    )
    assert res2["stat"]["smash_count"] == 1
    assert res2["stat"]["pass_count"] == 1
    assert res2["stat"]["total_votes"] == 2
    assert res2["stat"]["smash_rate"] == 50.0

    res3 = service.cast_vote(
        character_slug="ada_wong",
        vote_type="super_smash",
        session_id="user_sess_3",
        edition="canon",
    )
    assert res3["stat"]["smash_count"] == 1
    assert res3["stat"]["pass_count"] == 1
    assert res3["stat"]["super_smash_count"] == 1
    assert res3["stat"]["total_votes"] == 3
    assert res3["stat"]["smash_rate"] == 66.7

    res4 = service.cast_vote(
        character_slug="ada_wong",
        vote_type="pass",
        session_id="user_sess_1",
        edition="canon",
    )
    assert res4["stat"]["smash_count"] == 0
    assert res4["stat"]["pass_count"] == 2
    assert res4["stat"]["super_smash_count"] == 1
    assert res4["stat"]["total_votes"] == 3
    assert res4["stat"]["smash_rate"] == 33.3

    leg_stat = db_session.scalar(
        select(SmashPassStat).where(
            SmashPassStat.character_slug == "ada_wong",
            SmashPassStat.edition == "canon",
        )
    )
    assert leg_stat is not None
    assert leg_stat.smash_count == 0
    assert leg_stat.pass_count == 2
    assert leg_stat.super_smash_count == 1
    assert leg_stat.total_votes == 3
    assert leg_stat.smash_rate == 33.3


@pytest.mark.unit
def test_service_cast_vote_by_entity_id(db_session):
    service = SmashOrPassService()
    feed_res = service.get_feed(roster_slug="cyberpunk_2077", limit=1)
    target = feed_res["entities"][0]

    res = service.cast_vote(
        entity_id=target["id"],
        vote_type="smash",
        user_id=10,
    )
    assert res["id"] == target["id"]
    assert res["stat"]["smash_count"] == 1
    assert res["stat"]["total_votes"] == 1


@pytest.mark.unit
def test_service_leaderboard_tiers_and_sorting(db_session):
    service = SmashOrPassService()

    for i in range(5):
        service.cast_vote(
            character_slug="ada_wong",
            vote_type="smash",
            session_id=f"tier_sess_ada_{i}",
        )

    for i in range(7):
        service.cast_vote(
            character_slug="sable_ward",
            vote_type="smash",
            session_id=f"tier_sess_sable_s_{i}",
        )
    for i in range(3):
        service.cast_vote(
            character_slug="sable_ward",
            vote_type="pass",
            session_id=f"tier_sess_sable_p_{i}",
        )

    service.cast_vote(character_slug="feng_min", vote_type="smash", session_id="f1")
    service.cast_vote(character_slug="feng_min", vote_type="pass", session_id="f2")

    for i in range(4):
        service.cast_vote(
            character_slug="kate_denson",
            vote_type="pass",
            session_id=f"tier_sess_kate_{i}",
        )

    leaderboard = service.get_leaderboard(roster_slug="canon", limit=10)

    ada_entry = next(e for e in leaderboard if e["slug"] == "ada_wong")
    assert ada_entry["rank"] == 1
    assert ada_entry["tier"] == "God Tier"
    assert ada_entry["smash_rate"] == 100.0

    sable_entry = next(e for e in leaderboard if e["slug"] == "sable_ward")
    assert sable_entry["tier"] == "Fatal Attraction"
    assert sable_entry["smash_rate"] == 70.0

    feng_entry = next(e for e in leaderboard if e["slug"] == "feng_min")
    assert feng_entry["tier"] == "Friendzone"
    assert feng_entry["smash_rate"] == 50.0

    kate_entry = next(e for e in leaderboard if e["slug"] == "kate_denson")
    assert kate_entry["tier"] == "Eldritch Void"
    assert kate_entry["smash_rate"] == 0.0

    by_votes = service.get_leaderboard(roster_slug="canon", sort_by="total_votes")
    assert by_votes[0]["slug"] == "sable_ward"


@pytest.mark.unit
def test_service_reset_session_and_user_votes(db_session):
    service = SmashOrPassService()

    service.cast_vote(character_slug="ada_wong", vote_type="smash", session_id="sess_reset_me")
    service.cast_vote(character_slug="sable_ward", vote_type="pass", session_id="sess_reset_me")

    ada_stat = service.get_character_stat("ada_wong")
    assert ada_stat["smash_count"] == 1

    reset_res = service.reset_session_votes(session_id="sess_reset_me")
    assert reset_res["status"] == "success"
    assert reset_res["reset_count"] == 2

    ada_stat_after = service.get_character_stat("ada_wong")
    assert ada_stat_after["smash_count"] == 0
    assert ada_stat_after["total_votes"] == 0

    service.cast_vote(character_slug="ada_wong", vote_type="super_smash", user_id=99)
    assert service.get_character_stat("ada_wong")["super_smash_count"] == 1

    user_reset_res = service.reset_user_votes(user_id=99)
    assert user_reset_res["status"] == "success"
    assert user_reset_res["reset_count"] == 1
    assert service.get_character_stat("ada_wong")["super_smash_count"] == 0


@pytest.mark.unit
def test_service_get_translations(db_session):
    service = SmashOrPassService()

    en_dict = service.get_translations("en")
    assert en_dict["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Fog Canon"
    assert en_dict["smashOrPass.tiers.godTier"] == "God Tier"

    es_dict = service.get_translations("es")
    assert es_dict["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Canon de la Niebla"
    assert es_dict["smashOrPass.tiers.godTier"] == "Nivel Dios"

    ja_dict = service.get_translations("ja")
    assert "霧の正史" in ja_dict["smashOrPass.rosters.canon.name"]
    assert ja_dict["smashOrPass.tiers.godTier"] == "神ティア"

    pl_dict = service.get_translations("pl")
    assert pl_dict["smashOrPass.rosters.canon.name"] == "Dead by Daylight: Kanon Mgły"
    assert pl_dict["smashOrPass.tiers.godTier"] == "Boski Poziom"


@pytest.mark.unit
def test_service_legacy_methods_compatibility(db_session):
    service = SmashOrPassService()

    editions = service.get_editions()
    assert len(editions) >= 6

    canon_chars = service.get_characters_with_stats(edition="canon")
    assert len(canon_chars) == 98
    assert "character_slug" in canon_chars[0]
    assert "smash_rate" in canon_chars[0]

    searched = service.get_characters_with_stats(edition="canon", search="Leon")
    assert len(searched) == 1
    assert searched[0]["character_slug"] == "leon_scott_kennedy"

    stat = service.get_character_stat("leon_scott_kennedy", edition="canon")
    assert stat is not None
    assert stat["character_name"] == "Leon S. Kennedy"

    service.cast_vote(character_slug="leon_scott_kennedy", vote_type="smash", user_id=55)
    user_votes = service.get_user_votes(user_id=55, edition="canon")
    assert len(user_votes) == 1
    assert user_votes[0]["character_slug"] == "leon_scott_kennedy"

    reset_out = service.reset_stats()
    assert reset_out["status"] == "reset_complete"
    stat_reset = service.get_character_stat("leon_scott_kennedy", edition="canon")
    assert stat_reset["smash_count"] == 0
```

### backend/tests/unit/test_sqlalchemy_models_and_seeder.py
```python
import unittest
import pytest
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk


@pytest.mark.unit
class TestSQLAlchemyModelsAndSeeder(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.session.execute(delete(Perk))
        db.session.execute(delete(Character))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_character_and_perk_mapped_models(self):
        char = Character(
            name="Test Trapper",
            role="Killer",
            code_prefix="K01",
            portrait_url="avatars/killers/test_trapper.png",
            real_name="Evan MacMillan",
            short_name="test_trapper",
            release_number=1,
        )
        db.session.add(char)
        db.session.commit()

        self.assertIsNotNone(char.id)
        self.assertEqual(char.role, "Killer")
        self.assertEqual(char.code_prefix, "K01")

        perk1 = Perk(
            name="Test Unnerving Presence",
            category="Killer",
            is_teachable=True,
            description="Causes survivors in terror radius to have difficult skill checks.",
            character_id=char.id,
        )
        perk2 = Perk(
            name="Test Brutal Strength",
            category="Killer",
            is_teachable=True,
            description="Increases pallet breaking speed.",
            character_id=char.id,
        )
        db.session.add_all([perk1, perk2])
        db.session.commit()

        stmt = select(Character).where(Character.name == "Test Trapper")
        retrieved_char = db.session.scalars(stmt).first()
        self.assertIsNotNone(retrieved_char)
        self.assertEqual(len(retrieved_char.perks), 2)
        self.assertEqual(retrieved_char.perks[0].character.name, "Test Trapper")

        char_dict = retrieved_char.to_dict()
        self.assertEqual(char_dict["name"], "Test Trapper")
        self.assertEqual(char_dict["real_name"], "Evan MacMillan")
        self.assertEqual(char_dict["code_prefix"], "K01")

        perk_dict = retrieved_char.perks[0].to_dict()
        self.assertEqual(perk_dict["character"], "Test Trapper")
        self.assertEqual(perk_dict["character_real_name"], "Evan MacMillan")
        self.assertTrue(perk_dict["is_teachable"])

    def test_cascade_delete(self):
        char = Character(name="Test Meg", role="Survivor", code_prefix="S01")
        db.session.add(char)
        db.session.commit()

        perk = Perk(name="Test Sprint Burst", category="Survivor", character_id=char.id)
        db.session.add(perk)
        db.session.commit()

        db.session.delete(char)
        db.session.commit()

        perk_check = db.session.scalars(select(Perk).where(Perk.name == "Test Sprint Burst")).first()
        self.assertIsNone(perk_check)

    def test_atomic_upsert_on_conflict(self):
        stmt1 = sqlite_insert(Character).values({
            "name": "Test Claudette",
            "role": "Survivor",
            "code_prefix": "S02",
            "portrait_url": "old_url.png",
        })
        db.session.execute(stmt1)
        db.session.commit()

        stmt2 = sqlite_insert(Character).values({
            "name": "Test Claudette",
            "role": "Survivor",
            "code_prefix": "S02",
            "portrait_url": "updated_url.png",
        })
        stmt2 = stmt2.on_conflict_do_update(
            index_elements=[Character.name],
            set_={"portrait_url": stmt2.excluded.portrait_url}
        )
        db.session.execute(stmt2)
        db.session.commit()

        char = db.session.scalars(select(Character).where(Character.name == "Test Claudette")).first()
        self.assertEqual(char.portrait_url, "updated_url.png")

    def test_database_url_psycopg3_normalization(self):
        import os
        orig_url = os.environ.get("DATABASE_URL")
        try:
            os.environ["DATABASE_URL"] = "postgres://user:pass@localhost:5432/testdb"
            from importlib import reload
            import app.core.config
            reload(app.core.config)
            self.assertEqual(app.core.config.Config.SQLALCHEMY_DATABASE_URI, "postgresql+psycopg://user:pass@localhost:5432/testdb")

            os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/testdb"
            reload(app.core.config)
            self.assertEqual(app.core.config.Config.SQLALCHEMY_DATABASE_URI, "postgresql+psycopg://user:pass@localhost:5432/testdb")
        finally:
            if orig_url:
                os.environ["DATABASE_URL"] = orig_url
            else:
                os.environ.pop("DATABASE_URL", None)

    def test_api_scrape_and_seed_route(self):
        response = self.client.post("/api/scrape-and-seed", json={"source": "test"})
        self.assertIn(response.status_code, [200, 401, 500])
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data.get("status"), "success")
            self.assertIn("characters_synced", data)
            self.assertIn("perks_synced", data)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_streak_cleanup_service.py
```python
import unittest
from datetime import timedelta
import pytest
from sqlalchemy import select

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import (
    ChaosMatchLog, ChaosRun, GauntletMatchLog, GauntletRun,
    HistoryMatchLog, HistoryRun, PageStreakPageLog, PageStreakRun, utcnow,
)
from app.services.streak_cleanup_service import apply_inactivity_losses


@pytest.mark.unit
class StreakCleanupTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _stale_gauntlet_run(self, days_old, status="in_progress"):
        run = GauntletRun(
            user_id=1,
            role="killer",
            status=status,
            current_character_id="Trapper",
            owned_characters_json="[]",
        )
        db.session.add(run)
        db.session.commit()
        run.updated_at = utcnow() - timedelta(days=days_old)
        db.session.commit()
        return run

    def test_applies_a_loss_to_an_in_progress_run_past_the_threshold(self):
        run = self._stale_gauntlet_run(days_old=91)
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 1)
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")
        self.assertEqual(db.session.query(GauntletRun).count(), 1)

    def test_does_not_touch_a_recently_touched_run(self):
        self._stale_gauntlet_run(days_old=10)
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 0)
        self.assertEqual(db.session.query(GauntletMatchLog).count(), 0)

    def test_does_not_touch_a_completed_run_past_the_threshold(self):
        self._stale_gauntlet_run(days_old=200, status="completed")
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 0)
        self.assertEqual(db.session.query(GauntletMatchLog).count(), 0)

    def test_applies_across_all_four_run_tables(self):
        self._stale_gauntlet_run(days_old=91)

        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        db.session.add(chaos)
        db.session.commit()
        chaos.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        history = HistoryRun(user_id=1, mode="hell", status="in_progress")
        db.session.add(history)
        db.session.commit()
        history.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        page = PageStreakRun(
            user_id=1, killer="Trapper", status="in_progress",
            attempt=1, current_page=1, best_page=0, pages_json="[]",
        )
        db.session.add(page)
        db.session.commit()
        page.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected, {
            "gauntlet_runs": 1,
            "chaos_runs": 1,
            "history_runs": 1,
            "page_streak_runs": 1,
        })
        self.assertEqual(db.session.query(ChaosMatchLog).filter_by(triggered_by="inactivity").count(), 1)
        self.assertEqual(db.session.query(HistoryMatchLog).filter_by(triggered_by="inactivity").count(), 1)
        self.assertEqual(db.session.query(PageStreakPageLog).filter_by(triggered_by="inactivity").count(), 1)

    def test_dedicated_lock_connection_plumbing_is_a_noop_on_sqlite(self):
        run = self._stale_gauntlet_run(days_old=91)
        self.assertEqual(db.engine.dialect.name, "sqlite")
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 1)
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_translations_jsonb.py
```python
import pytest
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models import Addon, Character, Item, Perk


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt"


@pytest.fixture
def app():
    flask_app = create_app(TestConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.mark.unit
def test_perk_translations_model(app):
    with app.app_context():
        perk = Perk(
            name="Decisive Strike",
            category="Survivor",
            description="English description for Decisive Strike.",
            translations={
                "en": {"name": "Decisive Strike", "description": "English description for Decisive Strike."},
                "pl": {"name": "Zdecydowany Cios", "description": "Polski opis Zdecydowanego Ciosu."},
                "de": {"name": "Entscheidungsschlag", "description": "Deutsche Beschreibung für Entscheidungsschlag."},
            },
        )
        db.session.add(perk)
        db.session.commit()

        loaded = db.session.scalars(db.select(Perk).where(Perk.name == "Decisive Strike")).first()
        assert loaded is not None
        assert "pl" in loaded.translations
        assert loaded.translations["pl"]["name"] == "Zdecydowany Cios"

        default_dict = loaded.to_dict()
        assert default_dict["name"] == "Decisive Strike"
        assert default_dict["description"] == "English description for Decisive Strike."
        assert "pl" in default_dict["translations"]

        pl_dict = loaded.to_dict(lang="pl")
        assert pl_dict["name"] == "Zdecydowany Cios"
        assert pl_dict["description"] == "Polski opis Zdecydowanego Ciosu."

        de_dict = loaded.to_dict(lang="de")
        assert de_dict["name"] == "Entscheidungsschlag"
        assert de_dict["description"] == "Deutsche Beschreibung für Entscheidungsschlag."

        ja_dict = loaded.to_dict(lang="ja")
        assert ja_dict["name"] == "Decisive Strike"
        assert ja_dict["description"] == "English description for Decisive Strike."


@pytest.mark.unit
def test_character_translations_model(app):
    with app.app_context():
        char = Character(
            name="The Trapper",
            role="Killer",
            power_name="Bear Trap",
            power_description="English power description.",
            lore="English lore.",
            chapter_name="Base Game",
            translations={
                "en": {
                    "name": "The Trapper",
                    "lore": "English lore.",
                    "chapter_name": "Base Game",
                    "power_name": "Bear Trap",
                    "power_description": "English power description.",
                },
                "pl": {
                    "name": "Traper",
                    "lore": "Polska historia.",
                    "chapter_name": "Gra Podstawowa",
                    "power_name": "Wnyki",
                    "power_description": "Polski opis mocy.",
                },
            },
        )
        db.session.add(char)
        db.session.commit()

        loaded = db.session.scalars(db.select(Character).where(Character.name == "The Trapper")).first()
        assert loaded is not None

        pl_dict = loaded.to_dict(lang="pl")
        assert pl_dict["name"] == "Traper"
        assert pl_dict["lore"] == "Polska historia."
        assert pl_dict["chapter_name"] == "Gra Podstawowa"
        assert pl_dict["power"]["name"] == "Wnyki"
        assert pl_dict["power"]["description"] == "Polski opis mocy."


@pytest.mark.unit
def test_item_and_addon_translations_model(app):
    with app.app_context():
        item = Item(
            name="Flashlight",
            category="Flashlight",
            role="Survivor",
            description="Illuminates the area.",
            translations={
                "en": {"name": "Flashlight", "description": "Illuminates the area."},
                "pl": {"name": "Latarka", "description": "Oświetla obszar."},
            },
        )
        addon = Addon(
            name="Battery",
            associated_target="Flashlight",
            category="Survivor",
            description="Increases battery life.",
            translations={
                "en": {"name": "Battery", "description": "Increases battery life."},
                "pl": {"name": "Bateria", "description": "Wydłuża czas działania."},
            },
        )
        db.session.add_all([item, addon])
        db.session.commit()

        loaded_item = db.session.scalars(db.select(Item).where(Item.name == "Flashlight")).first()
        loaded_addon = db.session.scalars(db.select(Addon).where(Addon.name == "Battery")).first()

        assert loaded_item.to_dict(lang="pl")["name"] == "Latarka"
        assert loaded_item.to_dict(lang="pl")["description"] == "Oświetla obszar."

        assert loaded_addon.to_dict(lang="pl")["name"] == "Bateria"
        assert loaded_addon.to_dict(lang="pl")["description"] == "Wydłuża czas działania."


@pytest.mark.unit
def test_api_routes_with_lang_parameter(client, app):
    with app.app_context():
        perk = Perk(
            name="Sprint Burst",
            category="Survivor",
            description="When starting to run, break into a sprint.",
            translations={
                "en": {"name": "Sprint Burst", "description": "When starting to run, break into a sprint."},
                "pl": {"name": "Sprint", "description": "Podczas rozpoczynania biegu zrywasz się do sprintu."},
            },
        )
        killer = Character(
            name="The Clown",
            role="Killer",
            power_name="The Afterpiece Tonic",
            translations={
                "en": {"name": "The Clown", "power_name": "The Afterpiece Tonic"},
                "pl": {"name": "Klaun", "power_name": "Tonik Poprawiający Nastrój"},
            },
        )
        db.session.add_all([perk, killer])
        db.session.commit()
        perk_id = perk.id
        killer_id = killer.id

    resp = client.get("/api/v1/perks?lang=pl")
    assert resp.status_code == 200
    data = resp.get_json().get("data", [])
    assert len(data) >= 1
    found_perk = next((p for p in data if p["id"] == perk_id), None)
    assert found_perk is not None
    assert found_perk["name"] == "Sprint"
    assert found_perk["description"] == "Podczas rozpoczynania biegu zrywasz się do sprintu."

    resp_char = client.get("/api/v1/characters?lang=pl")
    assert resp_char.status_code == 200
    char_data = resp_char.get_json().get("data", [])
    found_clown = next((c for c in char_data if c["id"] == killer_id), None)
    assert found_clown is not None
    assert found_clown["name"] == "Klaun"
    assert found_clown["power"]["name"] == "Tonik Poprawiający Nastrój"
```

### backend/tests/unit/test_translations_verification.py
```python
import pytest
from sqlalchemy import select
from app import create_app
from app.core.config import Config
from app.core.extensions import db
from app.models.character import Character
from app.models.perk import Perk
from app.models.equipment import Item, Addon
from app.services.translations import TranslationService


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt"


@pytest.fixture
def app():
    flask_app = create_app(TestConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.mark.unit
def test_translations_sync_and_retrieval(app):
    with app.app_context():
        trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
        if not trapper:
            trapper = Character(
                name="The Trapper",
                role="Killer",
                code_prefix="K01",
                lore="Evan MacMillan idolized his father.",
                chapter_name="Base Game",
            )
            db.session.add(trapper)

        unnerving = db.session.scalars(select(Perk).where(Perk.name == "Unnerving Presence")).first()
        if not unnerving:
            unnerving = Perk(
                name="Unnerving Presence",
                category="Killer",
                description="Your presence alone instills great fear.",
                character=trapper,
            )
            db.session.add(unnerving)

        item = db.session.scalars(select(Item).where(Item.name == "Chinese Firecracker")).first()
        if not item:
            item = Item(
                name="Chinese Firecracker",
                category="Survivor",
                role="Survivor",
                description="A row of small explosive devices wrapped in heavy paper casing.",
            )
            db.session.add(item)

        addon = db.session.scalars(select(Addon).where(Addon.name == "Trapper Gloves")).first()
        if not addon:
            addon = Addon(
                name="Trapper Gloves",
                associated_target="The Trapper",
                category="Killer",
                description="Setting speed of Bear Traps by protective gloves made out of thick leather.",
            )
            db.session.add(addon)

        ash = db.session.scalars(select(Character).where(Character.name == "Ash Williams")).first()
        if not ash:
            ash = Character(
                name="Ash Williams",
                role="Survivor",
                code_prefix="S17",
                real_name="Ash Williams",
                short_name="ash_williams",
                wiki_slug="Ash_Williams",
            )
            db.session.add(ash)

        db.session.commit()

        service = TranslationService()
        res = service.sync_all_locales_to_db(locales=["en", "pl", "de", "es", "ja"])

        assert res["characters_updated"] >= 1
        assert res["perks_updated"] >= 1
        assert res["items_updated"] >= 1
        assert res["addons_updated"] >= 1

        loaded_trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
        assert loaded_trapper is not None
        for lang in ["en", "pl", "de", "es", "ja"]:
            assert lang in loaded_trapper.translations
            trans_dict = loaded_trapper.to_dict(lang=lang)
            assert trans_dict["name"] is not None
            assert len(trans_dict["lore"]) > 0

        pl_char = loaded_trapper.to_dict(lang="pl")
        assert pl_char["name"] in ["Traper", "The Trapper"]
        assert len(pl_char["lore"]) > 20

        loaded_perk = db.session.scalars(select(Perk).where(Perk.name == "Unnerving Presence")).first()
        assert loaded_perk is not None
        for lang in ["en", "pl", "de", "es", "ja"]:
            assert lang in loaded_perk.translations
            p_dict = loaded_perk.to_dict(lang=lang)
            assert len(p_dict["description"]) > 10

        pl_perk = loaded_perk.to_dict(lang="pl")
        assert pl_perk["name"] in ["Niepokojąca Obecność", "Unnerving Presence"]

        from app.services.perk_service import PerkService
        perk_svc = PerkService()
        
        ash_detail_pl = perk_svc.get_character_detail("ashley_j_williams", lang="pl")
        assert ash_detail_pl is not None
        assert ash_detail_pl["character"]["name"] == "Ashley J. Williams"
        assert len(ash_detail_pl["character"]["lore"]) > 50

        trapper_detail_pl = perk_svc.get_character_detail("traper", lang="pl")
        assert trapper_detail_pl is not None
        assert trapper_detail_pl["character"]["name"] == "Traper"
```

### backend/tests/unit/test_user_ownership.py
```python
import unittest
import pytest
from sqlalchemy import select
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import User, Character, Perk, UserCharacterOwnership, UserPerkOwnership
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService


@pytest.mark.unit
class TestUserAndOwnership(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()

        with self.app.app_context():
            db.create_all()
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            if not trapper:
                trapper = Character(name="The Trapper", wiki_slug="The_Trapper", role="Killer", release_number=1)
                db.session.add(trapper)
                db.session.flush()

            for p_name in ["Unnerving Presence", "Brutal Strength", "Agitation"]:
                p = db.session.scalars(select(Perk).where(Perk.name == p_name)).first()
                if not p:
                    db.session.add(Perk(name=p_name, character_id=trapper.id, is_teachable=True, category="Killer"))
                else:
                    p.character_id = trapper.id
                    p.is_teachable = True

            dwight = db.session.scalars(select(Character).where(Character.name == "Dwight Fairfield")).first()
            if not dwight:
                dwight = Character(name="Dwight Fairfield", wiki_slug="Dwight_Fairfield", role="Survivor", release_number=1)
                db.session.add(dwight)
                db.session.flush()

            for p_name in ["Bond", "Prove Thyself", "Leader"]:
                p = db.session.scalars(select(Perk).where(Perk.name == p_name)).first()
                if not p:
                    db.session.add(Perk(name=p_name, character_id=dwight.id, is_teachable=True, category="Survivor"))
                else:
                    p.character_id = dwight.id
                    p.is_teachable = True

            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.query(UserCharacterOwnership).delete()
            db.session.query(UserPerkOwnership).delete()
            db.session.query(User).delete()
            db.session.commit()

    def test_user_registration_and_auth(self):
        with self.app.app_context():
            user, err = self.user_service.register_user("testkiller", "killer@test.com", "killerpassword", role="user")
            self.assertIsNone(err)
            self.assertIsNotNone(user)
            self.assertEqual(user.username, "testkiller")
            self.assertEqual(user.role, "user")

            dup, dup_err = self.user_service.register_user("testkiller", "other@test.com", "killerpassword")
            self.assertIsNotNone(dup_err)

            auth_user, token = self.user_service.authenticate("testkiller", "killerpassword")
            self.assertIsNotNone(auth_user)
            self.assertIsNotNone(token)

            verified = self.user_service.verify_token(token)
            self.assertIsNotNone(verified)
            self.assertEqual(verified.id, user.id)

    def test_default_state_is_all_owned_and_unlocked(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("freshuser", "fresh@test.com", "password123")

            characters = self.ownership_service.get_user_characters(user.id)
            self.assertTrue(len(characters) > 0)
            self.assertTrue(all(c["is_owned"] for c in characters))

            perks = self.ownership_service.get_user_perks(user.id)
            self.assertTrue(len(perks) > 0)
            self.assertTrue(all(p["is_unlocked"] for p in perks))

    def test_locking_character_cascades_lock_to_its_perks(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("trappermain", "trapper@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            self.assertIsNotNone(trapper)

            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()
            self.assertEqual(len(trapper_perks), 3)
            trapper_perk_ids = {p.id for p in trapper_perks}

            res = self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)
            self.assertFalse(res["is_owned"])
            self.assertEqual(res["auto_locked_teachable_perks_count"], 3)

            user_perks_after = self.ownership_service.get_user_perks(user.id)
            locked_trapper_perks = [
                p for p in user_perks_after if p["perk_id"] in trapper_perk_ids and not p["is_unlocked"]
            ]
            self.assertEqual(len(locked_trapper_perks), 3)

    def test_manually_unlock_single_perk_of_locked_character(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("partialuser", "partial@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()

            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)
            self.ownership_service.set_perk_ownership(user.id, trapper_perks[0].id, is_unlocked=True)

            user_perks = self.ownership_service.get_user_perks(user.id)
            trapper_perk_status = {p["perk_id"]: p["is_unlocked"] for p in user_perks if p["character_id"] == trapper.id}
            self.assertTrue(trapper_perk_status[trapper_perks[0].id])
            self.assertFalse(trapper_perk_status[trapper_perks[1].id])
            self.assertFalse(trapper_perk_status[trapper_perks[2].id])

    def test_character_ownership_auto_unlocks_teachable_perks(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("trappermain2", "trapper2@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()

            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

            res = self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=True)
            self.assertTrue(res["is_owned"])
            self.assertEqual(res["auto_unlocked_teachable_perks_count"], 3)

            user_perks_after = self.ownership_service.get_user_perks(user.id)
            trapper_perk_ids = {p.id for p in trapper_perks}
            unlocked_trapper_perks = [p for p in user_perks_after if p["perk_id"] in trapper_perk_ids and p["is_unlocked"]]
            self.assertEqual(len(unlocked_trapper_perks), 3)

    def test_bulk_character_and_perk_ownership(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("bulkuser", "bulk@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            dwight = db.session.scalars(select(Character).where(Character.name == "Dwight Fairfield")).first()

            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

            bulk_res = self.ownership_service.bulk_set_character_ownership(
                user.id,
                [{"character_id": trapper.id, "is_owned": True}, {"character_id": dwight.id, "is_owned": True}]
            )
            self.assertEqual(bulk_res["characters_updated_count"], 2)
            self.assertEqual(bulk_res["auto_unlocked_perks_count"], 6)

            summary = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertGreaterEqual(summary["survivors"]["owned"], summary["survivors"]["total"])
            self.assertGreaterEqual(summary["perks"]["unlocked"], 6)

    def test_ownership_summary_reflects_default_and_explicit_locks(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("summaryuser", "summary@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()

            summary_default = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertEqual(summary_default["killers"]["owned"], summary_default["killers"]["total"])
            self.assertEqual(summary_default["perks"]["unlocked"], summary_default["perks"]["total"])

            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

            summary_after_lock = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertEqual(summary_after_lock["killers"]["owned"], summary_default["killers"]["total"] - 1)
            self.assertEqual(summary_after_lock["perks"]["unlocked"], summary_default["perks"]["total"] - 3)

    def test_auth_and_user_routes(self):
        reg_res = self.client.post("/api/v1/auth/register", json={
            "username": "apicheck",
            "email": "api@check.com",
            "password": "password123",
        })
        self.assertEqual(reg_res.status_code, 201, reg_res.get_json())
        data = reg_res.get_json()
        token = data["token"]
        user_id = data["user"]["id"]

        headers = {"Authorization": f"Bearer {token}"}

        me_res = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["user"]["username"], "apicheck")

        chars_res = self.client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        self.assertEqual(chars_res.status_code, 200)
        chars_data = chars_res.get_json()["data"]
        trapper_char = next(c for c in chars_data if c["name"] == "The Trapper")
        self.assertTrue(trapper_char["is_owned"])

        with self.app.app_context():
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_id = trapper.id

        lock_res = self.client.post(f"/api/v1/users/{user_id}/characters", json={
            "character_id": trapper_id,
            "is_owned": False
        }, headers=headers)
        self.assertEqual(lock_res.status_code, 200)
        self.assertEqual(lock_res.get_json()["data"]["auto_locked_teachable_perks_count"], 3)

        own_res = self.client.post(f"/api/v1/users/{user_id}/characters", json={
            "character_id": trapper_id,
            "is_owned": True
        }, headers=headers)
        self.assertEqual(own_res.status_code, 200)
        self.assertEqual(own_res.get_json()["data"]["auto_unlocked_teachable_perks_count"], 3)

        perks_res = self.client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        self.assertEqual(perks_res.status_code, 200)
        perks_data = perks_res.get_json()["data"]
        self.assertTrue(all(p["is_unlocked"] for p in perks_data))

    def test_admin_routes(self):
        with self.app.app_context():
            admin, admin_token = self.user_service.authenticate("admin", "admin123")
            if not admin:
                admin, _ = self.user_service.register_user("adminuser", "adm@test.com", "adminpass", role="admin")
                admin_token = self.user_service.generate_token(admin.id)
            user, _ = self.user_service.register_user("regular", "reg@test.com", "regpass", role="user")

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        stats_res = self.client.get("/api/v1/admin/stats", headers=admin_headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.get_json()
        self.assertIn("total_users", stats)
        self.assertIn("survivors_count", stats)
        self.assertIn("killers_count", stats)

        list_res = self.client.get("/api/v1/users", headers=admin_headers)
        self.assertEqual(list_res.status_code, 200)
        users = list_res.get_json()["users"]
        self.assertTrue(any(u["username"] == "regular" for u in users))

        update_res = self.client.put(f"/api/v1/users/{user.id}", json={"role": "admin"}, headers=admin_headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()["user"]["role"], "admin")

        del_res = self.client.delete(f"/api/v1/users/{user.id}", headers=admin_headers)
        self.assertEqual(del_res.status_code, 200)

    def test_default_seeder_lemon_and_user(self):
        with self.app.app_context():
            from app.seeds.user_seeder import seed_default_users
            seed_default_users()

            lemon, l_token = self.user_service.authenticate("lemon", "lemon")
            self.assertIsNotNone(lemon)
            self.assertEqual(lemon.username, "lemon")
            self.assertEqual(lemon.role, "admin")
            self.assertIsNotNone(l_token)

            u, u_token = self.user_service.authenticate("user", "user")
            self.assertIsNotNone(u)
            self.assertEqual(u.username, "user")
            self.assertEqual(u.role, "user")
            self.assertIsNotNone(u_token)

    def test_admin_create_user_endpoint(self):
        with self.app.app_context():
            from app.seeds.user_seeder import seed_default_users
            seed_default_users()
            lemon, _ = self.user_service.authenticate("lemon", "lemon")
            admin_token = self.user_service.generate_token(lemon.id)

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.post(
            "/api/v1/users",
            json={
                "username": "custom_player",
                "email": "custom@player.com",
                "password": "secretpassword",
                "role": "user",
            },
            headers=admin_headers,
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["username"], "custom_player")


if __name__ == "__main__":
    unittest.main()
```
