### backend/tests/conftest.py
```python
import os
import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "unit: mark test as unit test (SQLite memory)")
    config.addinivalue_line("markers", "live: mark test as live test (PostgreSQL clone)")
    config.addinivalue_line("markers", "workflow: mark test as multi-step E2E workflow test")
```

### backend/tests/unit/__init__.py
```python
"""
Unit Tests Package
"""
```

### backend/tests/unit/conftest.py
```python
import os
import pytest

os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db


@pytest.fixture(scope="session")
def app():
    flask_app = create_app(TestingConfig)
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    return flask_app


@pytest.fixture(autouse=True)
def test_db(app):
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()


@pytest.fixture
def db_session(test_db):
    return test_db.session


@pytest.fixture
def client(app):
    return app.test_client()
```

### backend/tests/unit/test_altcha_service.py
```python
import hashlib
import hmac
import time
import pytest
from app.services.altcha_service import AltchaService


def _solve_challenge(challenge_data: dict) -> int:
    """Helper to solve ALTCHA PoW by brute forcing secret number."""
    salt = challenge_data["salt"]
    target_challenge = challenge_data["challenge"]
    max_num = challenge_data.get("maxnumber", 50000)

    for n in range(max_num + 1):
        h = hashlib.sha256(f"{salt}{n}".encode("utf-8")).hexdigest()
        if h == target_challenge:
            return n
    raise ValueError(f"Could not find solution up to {max_num}")


@pytest.mark.unit
def test_altcha_create_challenge():
    secret_key = "test-secret-key-altcha"
    challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=300)

    assert isinstance(challenge, dict)
    assert challenge["algorithm"] == "SHA-256"
    assert "challenge" in challenge
    assert len(challenge["challenge"]) == 64
    assert "salt" in challenge
    assert len(challenge["salt"]) >= 16
    assert challenge["maxnumber"] == 1000
    assert challenge["expires"] > time.time()
    assert "signature" in challenge
    assert len(challenge["signature"]) == 64

    expected_sig_payload = f"{challenge['challenge']}:{challenge['salt']}:{challenge['maxnumber']}:{challenge['expires']}"
    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        expected_sig_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    assert challenge["signature"] == expected_signature


@pytest.mark.unit
def test_altcha_solve_and_verify_success():
    secret_key = "test-secret-key-solve"
    challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

    solved_number = _solve_challenge(challenge)

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": solved_number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is True
    assert err == ""


@pytest.mark.unit
def test_altcha_verify_invalid_number():
    secret_key = "test-secret-key-invalid-num"
    challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

    solved_number = _solve_challenge(challenge)
    wrong_number = solved_number + 1

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": wrong_number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert len(err) > 0


@pytest.mark.unit
def test_altcha_verify_expired_challenge():
    secret_key = "test-secret-key-expired"
    challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=-10)

    solved_number = _solve_challenge(challenge)

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": solved_number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "expired" in err.lower()


@pytest.mark.unit
def test_altcha_verify_tampered_signature():
    secret_key = "test-secret-key-tamper"
    challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

    solved_number = _solve_challenge(challenge)
    tampered_signature = "a" + challenge["signature"][1:] if challenge["signature"][0] != "a" else "b" + challenge["signature"][1:]

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": solved_number,
        "salt": challenge["salt"],
        "signature": tampered_signature,
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert len(err) > 0


@pytest.mark.unit
def test_altcha_verify_missing_fields():
    secret_key = "test-secret-key"
    payload = {
        "algorithm": "SHA-256",
        "challenge": "abc",
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "Missing required field" in err


@pytest.mark.unit
def test_altcha_verify_wrong_algorithm():
    secret_key = "test-secret-key"
    payload = {
        "algorithm": "MD5",
        "challenge": "abc",
        "number": 123,
        "salt": "salt",
        "signature": "sig",
        "expires": int(time.time()) + 100,
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "algorithm" in err.lower()


@pytest.mark.unit
def test_altcha_challenge_route(client, app):
    response = client.get("/api/v1/auth/altcha-challenge")
    assert response.status_code == 200
    data = response.get_json()

    assert data["algorithm"] == "SHA-256"
    assert "challenge" in data
    assert "salt" in data
    assert "maxnumber" in data
    assert "signature" in data
    assert "expires" in data

    secret_key = app.config.get("SECRET_KEY")
    solved_number = _solve_challenge(data)
    payload = {
        "algorithm": data["algorithm"],
        "challenge": data["challenge"],
        "number": solved_number,
        "salt": data["salt"],
        "signature": data["signature"],
        "expires": data["expires"],
        "maxnumber": data["maxnumber"],
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is True
    assert err == ""
```

### backend/tests/unit/test_chaos_models.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.models import ChaosMatchLog, ChaosRun, User


@pytest.mark.unit
class TestChaosModels(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _make_user(self):
        user = User(username="chaosuser", email="chaos@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        return user

    def test_chaos_run_round_trip(self):
        user = self._make_user()
        run = ChaosRun(
            user_id=user.id,
            difficulty="hell",
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers_json="[]",
            checkpoint_killers_json="[]",
            used_perks_json=safe_json_dumps(["Hex: Ruin"]),
            checkpoint_used_perks_json="[]",
            current_perks_json=safe_json_dumps([{"name": "Hex: Ruin"}]),
            current_addon_rarities_json=safe_json_dumps(["Rare", "Rare"]),
            perks_revealed=False,
        )
        db.session.add(run)
        db.session.commit()

        d = run.to_dict()
        self.assertEqual(d["difficulty"], "hell")
        self.assertEqual(d["used_perks"], ["Hex: Ruin"])
        self.assertEqual(d["current_perks"], [{"name": "Hex: Ruin"}])
        self.assertEqual(d["current_addon_rarities"], ["Rare", "Rare"])
        self.assertFalse(d["perks_revealed"])

    def test_unique_constraint_on_user_and_difficulty(self):
        user = self._make_user()
        db.session.add(ChaosRun(user_id=user.id, difficulty="hell"))
        db.session.commit()
        db.session.add(ChaosRun(user_id=user.id, difficulty="hell"))
        with self.assertRaises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_chaos_match_log_round_trip(self):
        user = self._make_user()
        run = ChaosRun(user_id=user.id, difficulty="easy")
        db.session.add(run)
        db.session.commit()

        log = ChaosMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            perks_json=safe_json_dumps([{"name": "Hex: Ruin"}]),
            addon_rarities_json=safe_json_dumps(["Common", "Rare"]),
            streak_before=0,
            streak_after=1,
        )
        db.session.add(log)
        db.session.commit()

        d = log.to_dict()
        self.assertEqual(d["killer_id"], "The Trapper")
        self.assertEqual(d["perks"], [{"name": "Hex: Ruin"}])
        self.assertEqual(d["addon_rarities"], ["Common", "Rare"])


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_chaos_roller.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.chaos.constants import (
    ADDON_RARITY_POOL,
    CHAOS_CHECKPOINT_INTERVAL,
    DIFFICULTIES,
    checkpoint_interval,
)
from app.services.chaos.roller import draw_addon_rarities, draw_chaos_perks, resolve_perks_by_names


@pytest.mark.unit
class TestChaosConstants(unittest.TestCase):
    def test_checkpoint_interval_per_difficulty(self):
        self.assertEqual(checkpoint_interval("easy"), 5)
        self.assertEqual(checkpoint_interval("medium"), 10)
        self.assertEqual(checkpoint_interval("hell"), 0)

    def test_checkpoint_interval_unknown_defaults_to_zero(self):
        self.assertEqual(checkpoint_interval("nonsense"), 0)

    def test_difficulties_tuple(self):
        self.assertEqual(DIFFICULTIES, ("easy", "medium", "hell"))

    def test_addon_rarity_pool_excludes_event(self):
        self.assertNotIn("Event", ADDON_RARITY_POOL)
        self.assertEqual(
            set(ADDON_RARITY_POOL),
            {"Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"},
        )


@pytest.mark.unit
class TestDrawAddonRarities(unittest.TestCase):
    def test_always_returns_two(self):
        for _ in range(20):
            rarities = draw_addon_rarities()
            self.assertEqual(len(rarities), 2)
            for r in rarities:
                self.assertIn(r, ADDON_RARITY_POOL)

    def test_duplicates_are_possible_over_many_draws(self):
        saw_duplicate = False
        for _ in range(200):
            a, b = draw_addon_rarities()
            if a == b:
                saw_duplicate = True
                break
        self.assertTrue(saw_duplicate)


def _perk(name):
    return {"id": hash(name) % 100000, "name": name, "category": "Killer"}


@pytest.mark.unit
class TestDrawChaosPerks(unittest.TestCase):
    def test_draws_four_perks(self):
        pool = [_perk(f"Perk {i}") for i in range(10)]
        drawn, used = draw_chaos_perks(pool, [])
        self.assertEqual(len(drawn), 4)
        self.assertEqual(len(used), 4)

    def test_no_repeats_within_a_draw_when_pool_is_large_enough(self):
        pool = [_perk(f"Perk {i}") for i in range(10)]
        drawn, _ = draw_chaos_perks(pool, [])
        names = [p["name"] for p in drawn]
        self.assertEqual(len(names), len(set(names)))

    def test_respects_already_used_perks(self):
        pool = [_perk(f"Perk {i}") for i in range(6)]
        already_used = [p["name"] for p in pool[:4]]
        drawn, updated_used = draw_chaos_perks(pool, already_used)
        drawn_names = {p["name"] for p in drawn}
        self.assertEqual(len(drawn), 4)
        self.assertGreaterEqual(len(updated_used), 1)
        previously_unused = {p["name"] for p in pool[4:]}
        self.assertTrue(previously_unused.issubset(drawn_names))

    def test_refills_when_pool_fully_exhausted_mid_draw(self):
        pool = [_perk("Only Perk")]
        drawn, updated_used = draw_chaos_perks(pool, [])
        self.assertEqual(len(drawn), 4)
        self.assertTrue(all(p["name"] == "Only Perk" for p in drawn))
        self.assertEqual(updated_used, ["Only Perk"])

    def test_empty_pool_returns_nothing(self):
        drawn, updated_used = draw_chaos_perks([], [])
        self.assertEqual(drawn, [])
        self.assertEqual(updated_used, [])


@pytest.mark.unit
class TestResolvePerksByNames(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        character = Character(name="The Trapper", role="Killer")
        db.session.add(character)
        db.session.flush()
        db.session.add(Perk(name="Brutal Strength", character_id=character.id, is_teachable=True, category="Killer"))
        db.session.add(Perk(name="Unnerving Presence", character_id=None, is_teachable=False, category="Killer"))
        db.session.add(Perk(name="Iron Will", character_id=None, is_teachable=False, category="Survivor"))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_resolves_names_to_full_objects_in_order(self):
        result = resolve_perks_by_names(["Unnerving Presence", "Brutal Strength"])
        self.assertEqual([p["name"] for p in result], ["Unnerving Presence", "Brutal Strength"])
        self.assertIn("icon_local_path", result[0])

    def test_filters_by_killer_category(self):
        result = resolve_perks_by_names(["Iron Will"])
        self.assertEqual(result, [])

    def test_unknown_name_is_silently_dropped(self):
        result = resolve_perks_by_names(["Brutal Strength", "Does Not Exist"])
        self.assertEqual([p["name"] for p in result], ["Brutal Strength"])

    def test_empty_input_returns_empty_list(self):
        self.assertEqual(resolve_perks_by_names([]), [])


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_chaos_service.py
```python
import unittest
import pytest
from sqlalchemy import select

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import ChaosMatchLog, Character, Perk, User
from app.services.chaos_service import ChaosService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


def seed_new_perk(name, character_name="The Trapper"):
    character = db.session.scalars(select(Character).where(Character.name == character_name)).first()
    perk = Perk(name=name, character_id=character.id, is_teachable=True, category="Killer")
    db.session.add(perk)
    db.session.commit()
    return perk


@pytest.mark.unit
class ChaosTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = ChaosService(ownership_service=self.ownership_service)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


@pytest.mark.unit
class TestGetOrCreateRun(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = self.register_user("chaosplayer")

    def test_creates_a_run_with_a_fresh_unrevealed_build(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["difficulty"], "hell")
        self.assertEqual(run["current_streak"], 0)
        self.assertFalse(run["perks_revealed"])
        self.assertEqual(len(run["current_perks"]), 4)
        self.assertEqual(len(run["current_addon_rarities"]), 2)
        self.assertEqual(run["checkpoint_interval"], 0)

    def test_easy_and_hell_runs_for_the_same_user_are_independent(self):
        hell_run = self.service.get_or_create_run(self.user_id, "hell")
        easy_run = self.service.get_or_create_run(self.user_id, "easy")
        self.assertNotEqual(hell_run["id"], easy_run["id"])
        self.assertEqual(easy_run["checkpoint_interval"], 5)

    def test_getting_twice_returns_the_same_run(self):
        first = self.service.get_or_create_run(self.user_id, "medium")
        second = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(first["id"], second["id"])


@pytest.mark.unit
class TestReveal(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("revealuser")

    def test_reveal_flips_the_flag(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        revealed = self.service.reveal(self.user_id, run["id"])
        self.assertTrue(revealed["perks_revealed"])

    def test_reveal_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reveal(self.user_id, 999999)

    def test_reveal_carries_the_frozen_perk_pool_names(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        revealed = self.service.reveal(self.user_id, run["id"])
        self.assertEqual(sorted(revealed["unlocked_perks"]), sorted(run["unlocked_perks"]))


@pytest.mark.unit
class TestHellDifficulty(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
        self.user_id = self.register_user("hellplayer")
        self.difficulty = "hell"
        self.run = self.service.get_or_create_run(self.user_id, self.difficulty)

    def test_new_killer_mid_run_is_not_in_the_completion_check(self):
        seed_killer("Huntress")
        run = self.run
        remaining = list(run["owned_killers"])
        for killer in remaining:
            run = self.service.submit_result(self.user_id, run["id"], "win", killer)
        self.assertEqual(run["status"], "completed")

    def test_new_perk_mid_run_is_not_drawn(self):
        run = self.service.submit_result(self.user_id, self.run["id"], "win", self.run["owned_killers"][0])
        unlocked_names_before = set(run["unlocked_perks"])
        seed_new_perk("Brand New Perk")
        drawn_names = {p["name"] for p in run["current_perks"]}
        self.assertFalse(drawn_names - unlocked_names_before)

    def test_loss_to_zero_refreezes_both_pools(self):
        seed_killer("Huntress")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", self.run["owned_killers"][0])
        self.assertIn("Huntress", after_loss["owned_killers"])

    def test_win_advances_streak_and_completes_killer(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.assertEqual(updated["current_streak"], 1)
        self.assertIn("The Trapper", updated["completed_killers"])
        self.assertEqual(len(updated["current_perks"]), 4)
        self.assertFalse(updated["perks_revealed"])

    def test_win_with_every_owned_killer_completes_the_run(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        self.assertEqual(final["status"], "completed")

    def test_one_loss_resets_everything(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "The Wraith")
        self.assertEqual(after_loss["current_streak"], 0)
        self.assertEqual(after_loss["completed_killers"], [])

    def test_cannot_win_with_an_already_completed_killer(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        run = self.service.get_or_create_run(self.user_id, "hell")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")

    def test_apply_inactivity_loss_resets_to_zero_with_no_checkpoint(self):
        self.service.apply_inactivity_loss(self.run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, self.difficulty)
        self.assertEqual(reloaded["current_streak"], 0)

    def test_apply_inactivity_loss_writes_a_flagged_match_log(self):
        self.service.apply_inactivity_loss(self.run["id"])
        log = db.session.scalars(
            select(ChaosMatchLog).where(ChaosMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.result, "loss")
        self.assertEqual(log.triggered_by, "inactivity")

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self):
        run = self.run
        for killer in run["owned_killers"]:
            run = self.service.submit_result(self.user_id, run["id"], "win", killer)
        self.assertEqual(run["status"], "completed")
        before_count = db.session.query(ChaosMatchLog).count()
        self.service.apply_inactivity_loss(run["id"])
        self.assertEqual(db.session.query(ChaosMatchLog).count(), before_count)


@pytest.mark.unit
class TestEasyCheckpoint(ChaosTestCase):
    def setUp(self):
        super().setUp()
        for i in range(6):
            seed_killer(f"Killer {i}")
        self.user_id = self.register_user("easyplayer")
        self.run = self.service.get_or_create_run(self.user_id, "easy")

    def _win(self, killer_name):
        return self.service.submit_result(self.user_id, self.run["id"], "win", killer_name)

    def test_banks_a_checkpoint_every_five_wins(self):
        result = None
        for i in range(5):
            result = self._win(f"Killer {i}")
        self.assertEqual(result["current_streak"], 5)
        self.assertEqual(result["last_checkpoint_streak"], 5)
        self.assertEqual(len(result["checkpoint_killers"]), 5)

    def test_loss_before_a_checkpoint_falls_back_to_zero(self):
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        self.assertEqual(after_loss["current_streak"], 0)
        self.assertEqual(after_loss["completed_killers"], [])

    def test_loss_after_a_checkpoint_falls_back_to_the_checkpoint_not_zero(self):
        for i in range(5):
            self._win(f"Killer {i}")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_streak"], 5)
        self.assertEqual(len(after_loss["completed_killers"]), 5)


@pytest.mark.unit
class TestResetRun(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("resetuser")

    def test_reset_wipes_and_starts_over(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        reset = self.service.reset_run(self.user_id, "hell")
        self.assertEqual(reset["current_streak"], 0)
        self.assertEqual(reset["completed_killers"], [])
        self.assertFalse(reset["perks_revealed"])

    def test_reset_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "medium")


@pytest.mark.unit
class TestGetStats(ChaosTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("The Trapper")
        self.user_id = self.register_user("statsplayer")

    def test_stats_reflect_submitted_results(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        stats = self.service.get_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 1)
        self.assertEqual(stats["wins"], 1)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_chaos_stats.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun, User
from app.services.chaos.stats import fetch_chaos_user_stats


@pytest.mark.unit
class TestChaosStats(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        user = User(username="statsuser", email="stats@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        self.user_id = user.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_no_runs_yet(self):
        stats = fetch_chaos_user_stats(self.user_id, "hell")
        self.assertEqual(
            stats,
            {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []},
        )

    def test_counts_wins_and_losses_for_the_given_difficulty_only(self):
        hell_run = ChaosRun(user_id=self.user_id, difficulty="hell")
        easy_run = ChaosRun(user_id=self.user_id, difficulty="easy")
        db.session.add_all([hell_run, easy_run])
        db.session.commit()

        db.session.add_all([
            ChaosMatchLog(
                run_id=hell_run.id, killer_id="The Trapper", result="win",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=0, streak_after=1,
            ),
            ChaosMatchLog(
                run_id=hell_run.id, killer_id="The Wraith", result="loss",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=1, streak_after=0,
            ),
            ChaosMatchLog(
                run_id=easy_run.id, killer_id="The Hillbilly", result="win",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=0, streak_after=1,
            ),
        ])
        db.session.commit()

        stats = fetch_chaos_user_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 2)
        self.assertEqual(stats["wins"], 1)
        self.assertEqual(stats["losses"], 1)
        self.assertEqual(stats["win_rate"], 50.0)
        self.assertEqual(len(stats["recent_logs"]), 2)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_db_pool_config.py
```python
import os
import unittest
from unittest.mock import patch
import pytest
from app.core.config import Config, TestingConfig


@pytest.mark.unit
class TestDatabasePoolConfig(unittest.TestCase):
    def test_default_pool_options(self):
        engine_options = Config.SQLALCHEMY_ENGINE_OPTIONS
        self.assertTrue(engine_options.get("pool_pre_ping"))
        self.assertEqual(engine_options.get("pool_size"), 10)
        self.assertEqual(engine_options.get("max_overflow"), 20)
        self.assertEqual(engine_options.get("pool_recycle"), 300)
        self.assertEqual(engine_options.get("pool_timeout"), 30)

    def test_testing_config_pool_options_empty_for_sqlite(self):
        self.assertEqual(TestingConfig.SQLALCHEMY_ENGINE_OPTIONS, {})
        self.assertEqual(TestingConfig.SQLALCHEMY_DATABASE_URI, "sqlite:///:memory:")

    @patch.dict(os.environ, {
        "DB_POOL_SIZE": "15",
        "DB_MAX_OVERFLOW": "30",
        "DB_POOL_RECYCLE": "600",
        "DB_POOL_TIMEOUT": "45",
    })
    def test_custom_pool_env_vars(self):
        pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "300"))
        pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))

        self.assertEqual(pool_size, 15)
        self.assertEqual(max_overflow, 30)
        self.assertEqual(pool_recycle, 600)
        self.assertEqual(pool_timeout, 45)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_db_service.py
```python
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService


@pytest.mark.unit
class TestDatabaseService(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_lemon.db")
        self.db = DatabaseService(db_path=self.db_path)

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_init_db_creates_tables_and_default_records(self):
        self.db.init_db()
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        self.assertIn("perk_rules", tables)
        self.assertIn("gauntlet_runs", tables)
        self.assertIn("gauntlet_match_logs", tables)
        conn.close()


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_description_cleaner.py
```python
import json
import tempfile
import unittest
from pathlib import Path
import pytest

from app.services.perk_service import PerkService
from app.services.scraper_service import ScraperService


@pytest.mark.unit
class TestDescriptionCleaner(unittest.TestCase):
    def test_clean_description_text(self):
        raw_html = "<p>Increases your <span>movement speed</span> by <b>5%</b>.</p>"
        cleaned = ScraperService.clean_description_text(raw_html)
        self.assertEqual(cleaned, "Increases your movement speed by 5%.")

        raw_fragment = 'data-discover="true">Unlocks potential in your Aura-reading ability.'
        cleaned_fragment = ScraperService.clean_description_text(raw_fragment)
        self.assertEqual(cleaned_fragment, "Unlocks potential in your Aura-reading ability.")

        raw_attr_tag = '<div data-discover="true">Unlocks potential in your Aura-reading ability.</div>'
        cleaned_attr_tag = ScraperService.clean_description_text(raw_attr_tag)
        self.assertEqual(cleaned_attr_tag, "Unlocks potential in your Aura-reading ability.")

        raw_duplicate = "Sprint Burst\nUnlocks potential in your Aura-reading ability.\nSprint Burst"
        cleaned_dup = ScraperService.clean_description_text(raw_duplicate)
        self.assertEqual(cleaned_dup, "Sprint Burst\nUnlocks potential in your Aura-reading ability.")

    def test_perk_service_sanitizes_descriptions(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            perks_file = tmp_path / "perks.json"
            items_file = tmp_path / "items.json"
            addons_file = tmp_path / "addons.json"

            perks_data = [
                {
                    "name": "Test Perk",
                    "character": "General",
                    "category": "Survivor",
                    "description": 'data-discover="true">Test perk description.',
                    "icon_url": "http://example.com/icon.png",
                    "icon_local_path": "icons/test.png",
                }
            ]
            items_data = [
                {
                    "name": "Test Item",
                    "category": "Item",
                    "role": "Survivor",
                    "description": '<p data-discover="true">Test item description.</p>',
                    "icon_url": "",
                    "icon_local_path": "",
                    "rarity": "Common",
                }
            ]
            addons_data = [
                {
                    "name": "Test Addon",
                    "associated_target": "Test Item",
                    "category": "Survivor",
                    "description": 'data-discover="true">Test addon description.',
                    "icon_url": "",
                    "icon_local_path": "",
                    "rarity": "Rare",
                }
            ]

            with open(perks_file, "w", encoding="utf-8") as f:
                json.dump(perks_data, f)
            with open(items_file, "w", encoding="utf-8") as f:
                json.dump(items_data, f)
            with open(addons_file, "w", encoding="utf-8") as f:
                json.dump(addons_data, f)

            service = PerkService(data_path=perks_file)
            service._load_fallback_files()

            self.assertEqual(service._cache[0]["description"], "Test perk description.")
            self.assertEqual(service._items_cache[0]["description"], "Test item description.")
            self.assertEqual(service._addons_cache[0]["description"], "Test addon description.")


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_fullscreen_maps_service.py
```python
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService
from app.services.map_service import MapService


@pytest.mark.unit
class TestFullscreenMapsService(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_fullscreen_maps.db")
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = MapService(db_service=self.db_service)

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_get_map_with_seed_variants_and_pallets(self):
        detail = self.service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=1)
        self.assertIsNotNone(detail)
        self.assertIn("tiles", detail)
        self.assertIn("objectives", detail)
        
        tiles = detail["tiles"]
        self.assertGreaterEqual(len(tiles), 1)
        
        for tile in tiles:
            self.assertIn("has_pallet", tile)
            self.assertIn("has_window", tile)
            self.assertIn("pallet_safety_rating", tile)
            self.assertIn("looping_tips", tile)
            self.assertIn("mindgame_counter", tile)

        pallets = [t for t in tiles if t.get("has_pallet")]
        self.assertGreaterEqual(len(pallets), 1)
        for p in pallets:
            self.assertIn(p["pallet_safety_rating"], ["god", "safe", "mindgameable", "unsafe"])

        objectives = detail["objectives"]
        self.assertGreaterEqual(len(objectives), 1)
        obj_types = {obj["type"] for obj in objectives if "type" in obj}
        expected_types = {"totem", "generator", "exit_gate", "hatch", "chest", "basement"}
        for et in expected_types:
            self.assertIn(et, obj_types)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_gauntlet_service.py
```python
import unittest
import pytest
from sqlalchemy import select
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, GauntletMatchLog, GauntletRun, Perk
from app.services.gauntlet import CHECKPOINT_INTERVAL, get_owned_character_names
from app.services.gauntlet_service import GauntletService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Killer",
        ))
    db.session.commit()
    return character


def seed_survivor(name="Meg Thomas", perk_count=1):
    character = Character(name=name, role="Survivor")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Survivor",
        ))
    db.session.commit()
    return character


@pytest.mark.unit
class GauntletTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = GauntletService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id

    def lock_character(self, user_id, character_id):
        self.ownership_service.set_character_ownership(user_id, character_id, is_owned=False)


@pytest.mark.unit
class TestGauntletTiers(GauntletTestCase):
    def test_survivor_tier_perk_limits(self):
        self.assertEqual(self.service.get_tier_info(0, "survivor")["perk_limit"], 4)
        self.assertEqual(self.service.get_tier_info(9, "survivor")["perk_limit"], 4)
        self.assertEqual(self.service.get_tier_info(10, "survivor")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(20, "survivor")["perk_limit"], 2)
        self.assertEqual(self.service.get_tier_info(30, "survivor")["perk_limit"], 1)
        self.assertEqual(self.service.get_tier_info(40, "survivor")["perk_limit"], 0)
        self.assertEqual(self.service.get_tier_info(999, "survivor")["perk_limit"], 0)

    def test_killer_tier_perk_limits_start_at_three(self):
        self.assertEqual(self.service.get_tier_info(0, "killer")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(9, "killer")["perk_limit"], 3)
        self.assertEqual(self.service.get_tier_info(10, "killer")["perk_limit"], 2)
        self.assertEqual(self.service.get_tier_info(20, "killer")["perk_limit"], 1)
        self.assertEqual(self.service.get_tier_info(30, "killer")["perk_limit"], 0)
        self.assertEqual(self.service.get_tier_info(999, "killer")["perk_limit"], 0)

    def test_tier_steps_up_on_the_checkpoint_it_banks(self):
        for role in ("killer", "survivor"):
            below = self.service.get_tier_info(CHECKPOINT_INTERVAL - 1, role)
            at = self.service.get_tier_info(CHECKPOINT_INTERVAL, role)
            self.assertEqual(at["tier_level"], below["tier_level"] + 1)
            self.assertEqual(at["perk_limit"], below["perk_limit"] - 1)

    def test_tier_info_hides_the_internal_threshold(self):
        self.assertNotIn("min_streak", self.service.get_tier_info(0, "killer"))
        self.assertNotIn("min_streak", self.service.get_tier_info(0, "survivor"))

    def test_tier_info_carries_the_roster_limit(self):
        self.assertEqual(self.service.get_tier_info(0, "killer")["roster_limit"], 43)
        self.assertEqual(self.service.get_tier_info(0, "survivor")["roster_limit"], 52)

    def test_only_killers_are_restricted_to_their_own_perks(self):
        self.assertTrue(self.service.get_tier_info(0, "killer")["character_perks_only"])
        self.assertFalse(self.service.get_tier_info(0, "survivor")["character_perks_only"])

    def test_killer_tier_names_differ_from_survivor(self):
        survivor = self.service.get_tier_info(10, "survivor")
        killer = self.service.get_tier_info(10, "killer")
        self.assertEqual(survivor["name"], "The Thinning")
        self.assertEqual(killer["name"], "The Obsession")


@pytest.mark.unit
class TestOriginalKillerRosterCap(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.trapper = seed_killer("Trapper")
        self.trapper.release_number = 1
        self.slasher = seed_killer("The Slasher")
        self.slasher.release_number = 43
        self.newer = seed_killer("The Judgment")
        self.newer.release_number = 44
        db.session.commit()
        self.user_id = self.register_user("gauntletcapuser")

    def test_pool_excludes_killers_past_the_original_cutoff(self):
        names = get_owned_character_names(self.user_id, "killer", self.ownership_service)
        self.assertIn("Trapper", names)
        self.assertIn("The Slasher", names)
        self.assertNotIn("The Judgment", names)

    def test_a_killer_past_the_cutoff_is_never_drawn(self):
        for _ in range(20):
            run = self.service.roll(self.user_id, "killer")
            self.assertNotEqual(run["current_character_id"], "The Judgment")

    def test_gauntlet_can_be_won_without_the_newer_killer(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")
        self.assertNotIn("The Judgment", run["completed_characters"])


@pytest.mark.unit
class TestGauntletRun(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.nurse = seed_killer("Nurse")
        self.trapper = seed_killer("Trapper")
        self.user_id = self.register_user("gauntletuser")

    def test_get_or_create_run_targets_an_owned_character(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(run["status"], "in_progress")
        self.assertIn(run["current_character_id"], ["Nurse", "Trapper"])
        self.assertEqual(run["current_streak"], 0)
        self.assertEqual(run["tier_info"]["perk_limit"], 3)

    def test_new_run_defaults_to_original_mode_and_unrevealed_target(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(run["game_mode"], "original")
        self.assertFalse(run["target_revealed"])

    def test_get_or_create_run_is_idempotent(self):
        first = self.service.get_or_create_run(self.user_id, "killer")
        second = self.service.get_or_create_run(self.user_id, "killer")
        self.assertEqual(first["id"], second["id"])

    def test_runs_are_isolated_per_role(self):
        seed_survivor = Character(name="Meg Thomas", role="Survivor")
        db.session.add(seed_survivor)
        db.session.commit()

        killer_run = self.service.get_or_create_run(self.user_id, "killer")
        survivor_run = self.service.get_or_create_run(self.user_id, "survivor")
        self.assertNotEqual(killer_run["id"], survivor_run["id"])
        self.assertEqual(killer_run["role"], "killer")
        self.assertEqual(survivor_run["role"], "survivor")

    def test_runs_are_isolated_per_user(self):
        other_user_id = self.register_user("otheruser")
        run1 = self.service.get_or_create_run(self.user_id, "killer")
        run2 = self.service.get_or_create_run(other_user_id, "killer")
        self.assertNotEqual(run1["id"], run2["id"])

    def test_roll_never_targets_a_locked_character(self):
        self.lock_character(self.user_id, self.nurse.id)
        for _ in range(10):
            run = self.service.roll(self.user_id, "killer")
            self.assertEqual(run["current_character_id"], "Trapper")

    def test_roll_no_longer_assigns_a_playable_build(self):
        run = self.service.roll(self.user_id, "killer", target_character="Trapper")
        self.assertNotIn("perks", run["current_loadout"])
        self.assertTrue(
            all(p["character"] == "Trapper" for p in run["current_loadout"]["character_perks"])
        )

    def test_reveal_target_flips_flag_without_changing_character(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        target = run["current_character_id"]
        self.assertFalse(run["target_revealed"])
        revealed = self.service.reveal_target(self.user_id, run["id"])
        self.assertTrue(revealed["target_revealed"])
        self.assertEqual(revealed["current_character_id"], target)


@pytest.mark.unit
class TestGauntletResults(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Nurse")
        seed_killer("Trapper")
        self.user_id = self.register_user("resultsuser")
        self.run = self.service.get_or_create_run(self.user_id, "killer")

    def test_win_increments_streak_and_records_checkpoint(self):
        for expected in range(1, 10):
            updated = self.service.submit_result(self.user_id, self.run["id"], "win")
            self.assertEqual(updated["current_streak"], expected)
            self.assertEqual(updated["last_checkpoint_streak"], 0)

        tenth = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertEqual(tenth["current_streak"], 10)
        self.assertEqual(tenth["last_checkpoint_streak"], 10)

    def test_loss_reverts_to_last_checkpoint(self):
        for _ in range(10):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(after_loss["current_streak"], 10)

    def test_loss_before_any_checkpoint_resets_to_zero(self):
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(after_loss["current_streak"], 0)

    def test_win_marks_character_completed(self):
        target = self.run["current_character_id"]
        updated = self.service.submit_result(self.user_id, self.run["id"], "win")
        self.assertIn(target, updated["completed_characters"])

    def test_best_streak_is_never_decreased_by_a_loss(self):
        for _ in range(3):
            self.service.submit_result(self.user_id, self.run["id"], "win")
        updated = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertEqual(updated["best_streak"], 3)

    def test_rejects_invalid_result(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "draw")

    def test_rejects_result_for_another_users_run(self):
        other_user_id = self.register_user("intruder")
        with self.assertRaises(ValueError):
            self.service.submit_result(other_user_id, self.run["id"], "win")

    def test_new_character_mid_run_is_not_immediately_rollable(self):
        huntress = seed_killer("Huntress")
        for _ in range(20):
            run = self.service.roll(self.user_id, "killer")
            self.assertNotEqual(run["current_character_id"], "Huntress")

    def test_completion_check_ignores_a_character_owned_mid_run(self):
        seed_killer("Huntress")
        run = self.service.get_or_create_run(self.user_id, "killer")
        for _ in range(2):
            run = self.service.submit_result(self.user_id, run["id"], "win")
            if run["status"] != "completed":
                run = self.service.roll(self.user_id, "killer")
        self.assertEqual(run["status"], "completed")

    def test_loss_to_zero_refreezes_the_pool(self):
        seed_killer("Huntress")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss")
        self.assertIn("Huntress", after_loss["owned_characters"])

    def test_completing_the_run_refreezes_the_pool(self):
        run = self.run
        self.service.submit_result(self.user_id, run["id"], "win")
        run = self.service.roll(self.user_id, "killer")
        seed_killer("Huntress")
        run = self.service.submit_result(self.user_id, run["id"], "win")
        self.assertEqual(run["status"], "completed")
        self.assertIn("Huntress", run["owned_characters"])

    def test_submit_result_records_triggered_by_player_by_default(self):
        self.service.submit_result(self.user_id, self.run["id"], "win")
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.triggered_by, "player")

    def test_submit_result_records_triggered_by_inactivity_when_passed(self):
        self.service.submit_result(self.user_id, self.run["id"], "loss", triggered_by="inactivity")
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")


@pytest.mark.unit
class TestGauntletLazyFreeze(GauntletTestCase):
    def test_existing_run_with_empty_snapshot_freezes_on_read(self):
        seed_killer("Nurse")
        seed_killer("Trapper")
        user_id = self.register_user("lazyfreezeuser")
        run = self.service.get_or_create_run(user_id, "killer")
        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.owned_characters_json = "[]"
        db.session.commit()

        reloaded = self.service.get_or_create_run(user_id, "killer")
        self.assertEqual(sorted(reloaded["owned_characters"]), ["Nurse", "Trapper"])


@pytest.mark.unit
class TestGauntletCharacterPerks(GauntletTestCase):
    def setUp(self):
        super().setUp()
        self.trapper = seed_killer("Trapper", perk_count=3)
        seed_killer("Nurse", perk_count=3)
        self.user_id = self.register_user("perkdisplayuser")

    def test_loadout_carries_the_targets_own_teachable_perks(self):
        self.service.get_or_create_run(self.user_id, "killer")
        run = self.service.roll(self.user_id, "killer", target_character="Trapper")

        names = {p["name"] for p in run["current_loadout"]["character_perks"]}
        self.assertEqual(names, {"Trapper Perk 1", "Trapper Perk 2", "Trapper Perk 3"})

    def test_character_perks_are_present_on_a_brand_new_run(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        target = run["current_character_id"]

        perks = run["current_loadout"]["character_perks"]
        self.assertEqual(len(perks), 3)
        self.assertTrue(all(p["character"] == target for p in perks))


@pytest.mark.unit
class TestGauntletCompletion(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Trapper")
        seed_killer("Nurse")
        self.user_id = self.register_user("completionuser")

    def _clear(self, name):
        self.service.roll(self.user_id, "killer", target_character=name)
        run = self.service.get_or_create_run(self.user_id, "killer")
        return self.service.submit_result(self.user_id, run["id"], "win")

    def test_run_completes_once_every_owned_character_is_cleared(self):
        self.service.get_or_create_run(self.user_id, "killer")

        after_first = self._clear("Trapper")
        self.assertEqual(after_first["status"], "in_progress")

        after_last = self._clear("Nurse")
        self.assertEqual(after_last["status"], "completed")
        self.assertEqual(sorted(after_last["completed_characters"]), ["Nurse", "Trapper"])

    def test_completed_run_rejects_further_results(self):
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        run = self.service.get_or_create_run(self.user_id, "killer")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, run["id"], "win")

    def test_reset_starts_a_fresh_run(self):
        self.service.get_or_create_run(self.user_id, "killer")
        self._clear("Trapper")
        self._clear("Nurse")

        fresh = self.service.reset_run(self.user_id, "killer")
        self.assertEqual(fresh["status"], "in_progress")
        self.assertEqual(fresh["current_streak"], 0)
        self.assertEqual(fresh["completed_characters"], [])
        self.assertFalse(fresh["target_revealed"])


@pytest.mark.unit
class TestGauntletStats(GauntletTestCase):
    def setUp(self):
        super().setUp()
        seed_killer("Nurse")
        seed_killer("Trapper")
        self.user_id = self.register_user("statsuser")

    def test_stats_start_empty(self):
        stats = self.service.get_stats(self.user_id, "killer")
        self.assertEqual(stats["total_matches"], 0)
        self.assertEqual(stats["win_rate"], 0.0)

    def test_stats_reflect_wins_and_losses(self):
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.service.submit_result(self.user_id, run["id"], "win")
        self.service.submit_result(self.user_id, run["id"], "loss")

        stats = self.service.get_stats(self.user_id, "killer")
        self.assertEqual(stats["total_matches"], 2)
        self.assertEqual(stats["wins"], 1)
        self.assertEqual(stats["losses"], 1)
        self.assertEqual(stats["win_rate"], 50.0)
        self.assertEqual(len(stats["recent_logs"]), 2)

    def test_stats_are_isolated_per_role(self):
        db.session.add(Character(name="Meg Thomas", role="Survivor"))
        db.session.commit()
        run = self.service.get_or_create_run(self.user_id, "killer")
        self.service.submit_result(self.user_id, run["id"], "win")

        killer_stats = self.service.get_stats(self.user_id, "killer")
        survivor_stats = self.service.get_stats(self.user_id, "survivor")
        self.assertEqual(killer_stats["total_matches"], 1)
        self.assertEqual(survivor_stats["total_matches"], 0)


@pytest.mark.unit
class TestGauntletLoadoutHasNoGear(GauntletTestCase):
    def test_survivor_loadout_carries_no_item(self):
        seed_survivor()
        user_id = self.register_user("noitemuser")
        self.service.get_or_create_run(user_id, "survivor")
        run = self.service.roll(user_id, "survivor")
        self.assertNotIn("item", run["current_loadout"])

    def test_killer_loadout_carries_no_gear(self):
        seed_killer("Trapper", perk_count=1)
        user_id = self.register_user("killergearuser")
        self.service.get_or_create_run(user_id, "killer")
        run = self.service.roll(user_id, "killer", target_character="Trapper")
        loadout = run["current_loadout"]
        self.assertNotIn("item", loadout)
        self.assertNotIn("addons", loadout)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_generator_service.py
```python
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService
from app.services.generator_service import GeneratorService


@pytest.mark.unit
class TestGeneratorService(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_generator.db")
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = GeneratorService(db_service=self.db_service)

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_add_drawn_perks_and_reset(self):
        drawn_before = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_before), 0)

        self.service.add_drawn_perks("Survivor", ["Sprint Burst", "Adrenaline"])
        drawn_after = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_after), 2)
        self.assertIn("Sprint Burst", drawn_after)

        self.service.reset_drawn_perks("Survivor")
        drawn_reset = self.service.get_drawn_perks("Survivor")
        self.assertEqual(len(drawn_reset), 0)

    def test_get_and_update_config(self):
        config = self.service.get_config()
        self.assertEqual(config["role"], "Survivor")
        self.assertEqual(config["no_repeat_perks"], 1)

        updated = self.service.update_config({"role": "Killer", "no_repeat_perks": 0})
        self.assertEqual(updated["role"], "Killer")
        self.assertEqual(updated["no_repeat_perks"], 0)

        config_after = self.service.get_config()
        self.assertEqual(config_after["role"], "Killer")
        self.assertEqual(config_after["no_repeat_perks"], 0)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_guesser.py
```python
import gc
import json
import tempfile
import unittest
from pathlib import Path
import pytest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.others.guesser_service import GuesserService


@pytest.mark.unit
class TestGuesserModule(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_guesser.db")
            
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        
        self.app = create_app()
        self.app.config["TESTING"] = True
        from app.routes.others.guesser import guesser_service
        self.original_db = guesser_service.db_service
        self.original_use_sa = guesser_service._use_sqlalchemy
        guesser_service.db_service = self.db_service
        guesser_service._use_sqlalchemy = False
        
        self.client = self.app.test_client()
        self.service = GuesserService(db_service=self.db_service)

    def tearDown(self):
        from app.routes.others.guesser import guesser_service
        guesser_service.db_service = self.original_db
        guesser_service._use_sqlalchemy = self.original_use_sa
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_database_initialization(self):
        stats = self.service.get_all_stats()
        self.assertIn("character", stats)
        self.assertIn("perk_description", stats)
        self.assertIn("perk_name_to_icon", stats)
        self.assertIn("perk_icon_to_name", stats)
        
        self.assertEqual(stats["character"]["current_streak"], 0)
        self.assertEqual(stats["character"]["best_streak"], 0)
        self.assertEqual(stats["character"]["total_guesses"], 0)
        self.assertEqual(stats["character"]["correct_guesses"], 0)

    def test_update_stats_correct_guess(self):
        updated = self.service.update_stats("character", is_correct=True)
        self.assertEqual(updated["current_streak"], 1)
        self.assertEqual(updated["best_streak"], 1)
        self.assertEqual(updated["total_guesses"], 1)
        self.assertEqual(updated["correct_guesses"], 1)
        
        updated = self.service.update_stats("character", is_correct=True)
        self.assertEqual(updated["current_streak"], 2)
        self.assertEqual(updated["best_streak"], 2)
        
        stats = self.service.get_all_stats()
        self.assertEqual(stats["character"]["current_streak"], 2)
        self.assertEqual(stats["character"]["best_streak"], 2)

    def test_update_stats_incorrect_guess_breaks_streak(self):
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        
        updated = self.service.update_stats("character", is_correct=False)
        self.assertEqual(updated["current_streak"], 0)
        self.assertEqual(updated["best_streak"], 2)
        self.assertEqual(updated["total_guesses"], 3)
        self.assertEqual(updated["correct_guesses"], 2)

    def test_reset_streak(self):
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        
        updated = self.service.reset_streak("character")
        self.assertEqual(updated["current_streak"], 0)
        self.assertEqual(updated["best_streak"], 3)

    def test_api_routes(self):
        response = self.client.get("/api/v1/guesser/stats")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertIsInstance(data["data"], dict)

        response = self.client.post("/api/v1/guesser/stats", json={
            "guesser_type": "character",
            "is_correct": True
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertEqual(data["data"]["current_streak"], 1)

        response = self.client.get("/api/v1/guesser/stats")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertIn("character", data["data"])

        response = self.client.post("/api/v1/guesser/reset", json={
            "guesser_type": "character"
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertEqual(data["data"]["current_streak"], 0)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_gunicorn_config.py
```python
import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch
import pytest


def load_gunicorn_config():
    config_path = Path(__file__).resolve().parent.parent.parent / "gunicorn.conf.py"
    spec = importlib.util.spec_from_file_location("gunicorn_config", config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.unit
class TestGunicornConfig(unittest.TestCase):
    def test_default_gunicorn_settings(self):
        conf = load_gunicorn_config()
        self.assertEqual(conf.bind, "0.0.0.0:5000")
        self.assertEqual(conf.workers, 2)
        self.assertEqual(conf.threads, 4)
        self.assertEqual(conf.worker_class, "gthread")
        self.assertEqual(conf.worker_tmp_dir, "/dev/shm")
        self.assertEqual(conf.timeout, 60)
        self.assertEqual(conf.keepalive, 5)
        self.assertTrue(conf.preload_app)
        self.assertEqual(conf.max_requests, 1000)
        self.assertEqual(conf.max_requests_jitter, 100)
        self.assertEqual(conf.accesslog, "-")
        self.assertEqual(conf.errorlog, "-")
        self.assertEqual(conf.loglevel, "info")

    @patch.dict(os.environ, {
        "GUNICORN_WORKERS": "4",
        "GUNICORN_THREADS": "8",
        "GUNICORN_TIMEOUT": "90",
        "GUNICORN_PRELOAD": "false",
        "GUNICORN_MAX_REQUESTS": "2000",
    })
    def test_custom_gunicorn_env_vars(self):
        conf = load_gunicorn_config()
        self.assertEqual(conf.workers, 4)
        self.assertEqual(conf.threads, 8)
        self.assertEqual(conf.timeout, 90)
        self.assertFalse(conf.preload_app)
        self.assertEqual(conf.max_requests, 2000)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_history_models.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.core.json_provider import safe_json_dumps
from app.models import HistoryMatchLog, HistoryRun, User


@pytest.mark.unit
class TestHistoryModels(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _make_user(self):
        user = User(username="historyuser", email="history@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        return user

    def test_history_run_round_trip(self):
        user = self._make_user()
        run = HistoryRun(
            user_id=user.id,
            mode="medium",
            status="in_progress",
            current_row_index=1,
            total_killers_beaten=6,
            best_killers_beaten=6,
            completed_killers_json=safe_json_dumps(["The Wraith"]),
            unlocked_perk_names_json=safe_json_dumps(["Hex: Ruin", "Save the Best for Last"]),
            checkpoint_row_index=1,
            checkpoint_total_killers_beaten=5,
            checkpoint_completed_killers_json="[]",
            checkpoint_unlocked_perk_names_json=safe_json_dumps(["Hex: Ruin"]),
        )
        db.session.add(run)
        db.session.commit()

        d = run.to_dict()
        self.assertEqual(d["mode"], "medium")
        self.assertEqual(d["current_row_index"], 1)
        self.assertEqual(d["total_killers_beaten"], 6)
        self.assertEqual(d["completed_killers"], ["The Wraith"])
        self.assertEqual(d["unlocked_perk_names"], ["Hex: Ruin", "Save the Best for Last"])
        self.assertEqual(d["checkpoint_row_index"], 1)

    def test_unique_constraint_on_user_and_mode(self):
        user = self._make_user()
        db.session.add(HistoryRun(user_id=user.id, mode="hell"))
        db.session.commit()
        db.session.add(HistoryRun(user_id=user.id, mode="hell"))
        with self.assertRaises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_history_match_log_round_trip(self):
        user = self._make_user()
        run = HistoryRun(user_id=user.id, mode="hell")
        db.session.add(run)
        db.session.commit()

        log = HistoryMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            row_index=0,
            streak_before=0,
            streak_after=1,
        )
        db.session.add(log)
        db.session.commit()

        d = log.to_dict()
        self.assertEqual(d["killer_id"], "The Trapper")
        self.assertEqual(d["result"], "win")
        self.assertEqual(d["row_index"], 0)
        self.assertEqual(d["streak_after"], 1)


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_history_roster.py
```python
import unittest
import pytest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.history.roster import (
    ROW_SIZE,
    build_rows,
    get_general_killer_perk_names,
    get_killer_teachable_perk_names,
    get_owned_killer_names_by_release,
)
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


@pytest.mark.unit
class TestBuildRows(unittest.TestCase):
    def test_row_size_is_five(self):
        self.assertEqual(ROW_SIZE, 5)

    def test_chunks_into_rows_of_five(self):
        names = [f"Killer {i}" for i in range(12)]
        rows = build_rows(names)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0], names[0:5])
        self.assertEqual(rows[1], names[5:10])
        self.assertEqual(rows[2], names[10:12])

    def test_empty_list_yields_no_rows(self):
        self.assertEqual(build_rows([]), [])


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


@pytest.mark.unit
class HistoryRosterTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
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


@pytest.mark.unit
class TestGetOwnedKillerNamesByRelease(HistoryRosterTestCase):
    def test_sorted_by_release_number(self):
        seed_killer("The Nurse", release_number=4)
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)
        user_id = self.register_user("rosteruser")

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper", "The Wraith", "The Nurse"])

    def test_null_release_number_sorts_last(self):
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Mystery", release_number=None)
        user_id = self.register_user("nulluser")

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper", "The Mystery"])

    def test_unowned_killers_excluded(self):
        seed_killer("The Trapper", release_number=1)
        char2 = seed_killer("The Wraith", release_number=2)
        user_id = self.register_user("jeweluser")
        self.ownership_service.set_character_ownership(user_id, char2.id, is_owned=False)

        names = get_owned_killer_names_by_release(user_id, self.ownership_service)
        self.assertEqual(names, ["The Trapper"])


@pytest.mark.unit
class TestPerkNameHelpers(HistoryRosterTestCase):
    def test_general_perks_have_no_character(self):
        db.session.add(Perk(name="Whispers", character_id=None, category="Killer"))
        db.session.add(Perk(name="A Nurse's Calling", character_id=None, category="Killer"))
        db.session.commit()

        names = get_general_killer_perk_names()
        self.assertIn("Whispers", names)
        self.assertIn("A Nurse's Calling", names)

    def test_general_perks_exclude_teachables(self):
        seed_killer("The Trapper", release_number=1, perk_count=1)
        db.session.commit()

        names = get_general_killer_perk_names()
        self.assertNotIn("The Trapper Perk 1", names)

    def test_teachable_perks_for_killer(self):
        seed_killer("The Trapper", release_number=1, perk_count=2)

        names = get_killer_teachable_perk_names("The Trapper")
        self.assertEqual(set(names), {"The Trapper Perk 1", "The Trapper Perk 2"})

    def test_teachable_perks_for_unknown_killer(self):
        self.assertEqual(get_killer_teachable_perk_names("Nobody"), [])


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_history_service.py
```python
import unittest
import pytest
from sqlalchemy import select
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, HistoryMatchLog, Perk, User
from app.services.history_service import HistoryService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


def seed_general_perk(name="Whispers"):
    db.session.add(Perk(name=name, character_id=None, category="Killer"))
    db.session.commit()


@pytest.mark.unit
class HistoryTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()
        self.service = HistoryService(ownership_service=self.ownership_service)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def register_user(self, username):
        user, err = self.user_service.register_user(username, f"{username}@test.com", "password123")
        self.assertIsNone(err)
        return user.id


@pytest.mark.unit
class TestGetOrCreateRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("historyplayer")

    def test_creates_a_fresh_run_with_general_perks_unlocked(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(run["status"], "in_progress")
        self.assertEqual(run["current_row_index"], 0)
        self.assertEqual(run["unlocked_perk_names"], ["Whispers"])
        self.assertEqual(run["current_row_killers"], ["The Trapper", "The Wraith", "The Hillbilly"])
        self.assertEqual(run["row_size"], 5)
        self.assertEqual(run["total_rows"], 1)
        self.assertEqual(run["total_owned_killers"], 3)

    def test_medium_and_hell_runs_are_independent(self):
        medium_run = self.service.get_or_create_run(self.user_id, "medium")
        hell_run = self.service.get_or_create_run(self.user_id, "hell")
        self.assertNotEqual(medium_run["id"], hell_run["id"])

    def test_getting_twice_returns_the_same_run(self):
        first = self.service.get_or_create_run(self.user_id, "medium")
        second = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(first["id"], second["id"])


@pytest.mark.unit
class TestSubmitResultWithinARow(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("rowplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_win_adds_killer_and_unlocks_their_perks(self):
        updated = self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.assertIn("The Trapper", updated["completed_killers"])
        self.assertIn("The Trapper Perk 1", updated["unlocked_perk_names"])
        self.assertIn("The Trapper Perk 2", updated["unlocked_perk_names"])
        self.assertEqual(set(updated["newly_unlocked_perks"]), {"The Trapper Perk 1", "The Trapper Perk 2"})
        self.assertFalse(updated["row_cleared"])
        self.assertEqual(updated["total_killers_beaten"], 1)

    def test_cannot_win_with_a_killer_outside_the_active_row(self):
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "Someone Else")

    def test_cannot_win_with_an_already_completed_killer_in_the_row(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        with self.assertRaises(ValueError):
            self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")

    def test_clearing_every_killer_in_the_row_advances_and_completes(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertTrue(final["row_cleared"])
        self.assertEqual(final["status"], "completed")
        self.assertEqual(final["completed_killers"], [])
        self.assertEqual(final["total_killers_beaten"], 3)

    def test_match_log_records_the_row_the_match_was_actually_played_in(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertTrue(final["row_cleared"])
        logs = db.session.scalars(
            select(HistoryMatchLog).where(
                HistoryMatchLog.run_id == self.run["id"], HistoryMatchLog.killer_id == "The Hillbilly"
            )
        ).all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].row_index, 0)

    def test_apply_inactivity_loss_writes_a_flagged_match_log(self):
        self.service.apply_inactivity_loss(self.run["id"])
        log = db.session.scalars(
            select(HistoryMatchLog).where(HistoryMatchLog.run_id == self.run["id"])
        ).first()
        self.assertEqual(log.result, "loss")
        self.assertEqual(log.triggered_by, "inactivity")

    def test_apply_inactivity_loss_is_a_noop_on_a_completed_run(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Trapper")
        self.service.submit_result(self.user_id, self.run["id"], "win", "The Wraith")
        final = self.service.submit_result(self.user_id, self.run["id"], "win", "The Hillbilly")
        self.assertEqual(final["status"], "completed")

        before_count = db.session.query(HistoryMatchLog).count()
        self.service.apply_inactivity_loss(self.run["id"])
        self.assertEqual(db.session.query(HistoryMatchLog).count(), before_count)

        reloaded = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(reloaded["status"], "completed")


@pytest.mark.unit
class TestHellModeLoss(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(7)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("hellplayer")
        self.run = self.service.get_or_create_run(self.user_id, "hell")

    def test_any_loss_resets_everything(self):
        self.service.submit_result(self.user_id, self.run["id"], "win", "Killer 0")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 1")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["unlocked_perk_names"], ["Whispers"])
        self.assertEqual(after_loss["total_killers_beaten"], 0)

    def test_loss_after_clearing_a_row_still_resets_to_zero(self):
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self.service.submit_result(self.user_id, self.run["id"], "win", name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["total_killers_beaten"], 0)

        logs = db.session.scalars(
            select(HistoryMatchLog).where(
                HistoryMatchLog.run_id == self.run["id"], HistoryMatchLog.killer_id == "Killer 5"
            )
        ).all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].row_index, 1)


@pytest.mark.unit
class TestMediumModeCheckpoint(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(10)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("mediumplayer")
        self.run = self.service.get_or_create_run(self.user_id, "medium")

    def _win(self, name):
        return self.service.submit_result(self.user_id, self.run["id"], "win", name)

    def test_loss_within_a_row_falls_back_to_start_of_that_row(self):
        self._win("Killer 0")
        self._win("Killer 1")
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 2")
        self.assertEqual(after_loss["current_row_index"], 0)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["total_killers_beaten"], 0)

    def test_loss_after_clearing_a_row_falls_back_to_that_rows_checkpoint_not_zero(self):
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            self._win(name)
        after_loss = self.service.submit_result(self.user_id, self.run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["current_row_index"], 1)
        self.assertEqual(after_loss["completed_killers"], [])
        self.assertEqual(after_loss["total_killers_beaten"], 5)
        self.assertIn("Killer 0 Perk 1", after_loss["unlocked_perk_names"])


@pytest.mark.unit
class TestResetRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        self.user_id = self.register_user("resetplayer")

    def test_reset_wipes_and_starts_over(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        reset = self.service.reset_run(self.user_id, "hell")
        self.assertEqual(reset["total_killers_beaten"], 0)
        self.assertEqual(reset["completed_killers"], [])
        self.assertEqual(reset["unlocked_perk_names"], ["Whispers"])

    def test_reset_missing_run_raises(self):
        with self.assertRaises(ValueError):
            self.service.reset_run(self.user_id, "medium")


@pytest.mark.unit
class TestGetStats(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        seed_killer("The Trapper", release_number=1)
        self.user_id = self.register_user("statsplayer")

    def test_stats_reflect_submitted_results(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        self.service.submit_result(self.user_id, run["id"], "win", "The Trapper")
        stats = self.service.get_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 1)
        self.assertEqual(stats["wins"], 1)


@pytest.mark.unit
class TestFrozenKillerRoster(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate(["The Trapper", "The Wraith", "The Hillbilly"], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("frozenplayer")

    def test_new_killer_mid_run_does_not_reshuffle_the_active_row(self):
        before = self.service.get_or_create_run(self.user_id, "hell")
        row_before = before["current_row_killers"]
        seed_killer("Some New Killer", release_number=99)
        after = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(after["current_row_killers"], row_before)

    def test_hell_loss_refreezes_the_roster(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        seed_killer("Some New Killer", release_number=99)
        refrozen = self.service.submit_result(
            self.user_id, run["id"], "loss", run["current_row_killers"][0]
        )
        self.assertIn("Some New Killer", refrozen["owned_killers"])

    def test_medium_loss_before_any_checkpoint_refreezes_the_roster(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        seed_killer("Some New Killer", release_number=99)
        after_loss = self.service.submit_result(
            self.user_id, run["id"], "loss", run["current_row_killers"][0]
        )
        self.assertIn("Some New Killer", after_loss["owned_killers"])

    def test_medium_apply_inactivity_loss_before_any_checkpoint_refreezes_the_roster(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        seed_killer("Some New Killer", release_number=99)
        self.service.apply_inactivity_loss(run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, "medium")
        self.assertIn("Some New Killer", reloaded["owned_killers"])


@pytest.mark.unit
class TestMediumCheckpointLossDoesNotRefreeze(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        for i, name in enumerate([f"Killer {n}" for n in range(10)], start=1):
            seed_killer(name, release_number=i)
        self.user_id = self.register_user("mediumfreezeplayer")

    def test_medium_checkpoint_loss_does_not_refreeze(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            cleared = self.service.submit_result(self.user_id, run["id"], "win", name)
        self.assertTrue(cleared["row_cleared"])
        snapshot_before = cleared["owned_killers"]
        self.assertNotIn("Some New Killer", snapshot_before)

        seed_killer("Some New Killer", release_number=99)
        after_loss = self.service.submit_result(self.user_id, run["id"], "loss", "Killer 5")
        self.assertEqual(after_loss["owned_killers"], snapshot_before)
        self.assertNotIn("Some New Killer", after_loss["owned_killers"])

    def test_medium_apply_inactivity_loss_after_checkpoint_does_not_refreeze(self):
        run = self.service.get_or_create_run(self.user_id, "medium")
        for name in ["Killer 0", "Killer 1", "Killer 2", "Killer 3", "Killer 4"]:
            cleared = self.service.submit_result(self.user_id, run["id"], "win", name)
        self.assertTrue(cleared["row_cleared"])
        snapshot_before = cleared["owned_killers"]
        self.assertNotIn("Some New Killer", snapshot_before)

        seed_killer("Some New Killer", release_number=99)
        self.service.apply_inactivity_loss(run["id"])
        reloaded = self.service.get_or_create_run(self.user_id, "medium")
        self.assertEqual(reloaded["owned_killers"], snapshot_before)
        self.assertNotIn("Some New Killer", reloaded["owned_killers"])


@pytest.mark.unit
class TestOwnershipShrinksMidRun(HistoryTestCase):
    def setUp(self):
        super().setUp()
        seed_general_perk("Whispers")
        self.killers = {}
        for i, name in enumerate([f"Killer {n}" for n in range(1, 7)], start=1):
            self.killers[name] = seed_killer(name, release_number=i)
        self.user_id = self.register_user("shrinkplayer")

    def test_unowning_the_only_killer_in_the_next_row_does_not_soft_lock_the_run(self):
        run = self.service.get_or_create_run(self.user_id, "hell")
        for name in ["Killer 1", "Killer 2", "Killer 3", "Killer 4", "Killer 5"]:
            self.service.submit_result(self.user_id, run["id"], "win", name)

        killer_6 = self.killers["Killer 6"]
        self.ownership_service.set_character_ownership(self.user_id, killer_6.id, is_owned=False)

        reloaded = self.service.get_or_create_run(self.user_id, "hell")
        self.assertEqual(reloaded["status"], "in_progress")
        self.assertLess(reloaded["current_row_index"], reloaded["total_rows"])
        self.assertTrue(reloaded["current_row_killers"])


if __name__ == "__main__":
    unittest.main()
```

### backend/tests/unit/test_json_provider.py
```python
import dataclasses
import uuid
from datetime import date, datetime, timezone
import pytest
from flask import Flask, jsonify
from app.core.json_provider import ORJSONProvider


@dataclasses.dataclass
class CustomPerkMeta:
    tier: int
    bloodpoint_cost: int
    tags: set[str]


class ModelWithToDict:
    def __init__(self, item_id: str, name: str) -> None:
        self.item_id = item_id
        self.name = name

    def to_dict(self) -> dict[str, str]:
        return {"id": self.item_id, "name": self.name}


@pytest.mark.unit
class TestORJSONProvider:
    @pytest.fixture
    def app_with_orjson(self) -> Flask:
        app = Flask(__name__)
        app.json = ORJSONProvider(app)
        return app

    def test_serialize_datetimes_and_uuids(self, app_with_orjson: Flask) -> None:
        fixed_uuid = uuid.UUID("12345678-1234-5678-1234-567812345678")
        dt_val = datetime(2026, 8, 28, 12, 0, 0, tzinfo=timezone.utc)
        d_val = date(2026, 8, 28)

        @app_with_orjson.route("/api/types")
        def route():
            return jsonify({
                "id": fixed_uuid,
                "timestamp": dt_val,
                "release_date": d_val,
            })

        client = app_with_orjson.test_client()
        res = client.get("/api/types")
        assert res.status_code == 200
        data = res.get_json()
        assert data["id"] == "12345678-1234-5678-1234-567812345678"
        assert "2026-08-28T12:00:00" in data["timestamp"]
        assert data["release_date"] == "2026-08-28"

    def test_serialize_sets_dataclasses_and_to_dict_objects(self, app_with_orjson: Flask) -> None:
        dc_obj = CustomPerkMeta(tier=3, bloodpoint_cost=4000, tags={"chase", "stealth"})
        custom_obj = ModelWithToDict("medkit_ranger", "Ranger Med-Kit")

        @app_with_orjson.route("/api/complex")
        def complex_route():
            return jsonify({
                "meta": dc_obj,
                "equipment": custom_obj,
                "raw_set": {"generator", "exit_gate"},
            })

        client = app_with_orjson.test_client()
        res = client.get("/api/complex")
        assert res.status_code == 200
        data = res.get_json()
        assert data["meta"]["tier"] == 3
        assert data["meta"]["bloodpoint_cost"] == 4000
        assert set(data["meta"]["tags"]) == {"chase", "stealth"}
        assert data["equipment"] == {"id": "medkit_ranger", "name": "Ranger Med-Kit"}
        assert set(data["raw_set"]) == {"generator", "exit_gate"}

    def test_loads_and_dumps_fidelity(self, app_with_orjson: Flask) -> None:
        provider = ORJSONProvider(app_with_orjson)
        source_data = {"key": "value", "count": 10, "flags": [True, False]}
        serialized = provider.dumps(source_data)
        assert isinstance(serialized, str)
        deserialized = provider.loads(serialized)
        assert deserialized == source_data
```

### backend/tests/unit/test_limiter_and_honeypot.py
```python
import pytest
from flask import Flask
from app.core.limiter import get_client_ip, validate_honeypot


@pytest.mark.unit
class TestClientIPExtraction:
    @pytest.fixture
    def app_with_ip_test_route(self) -> Flask:
        app = Flask(__name__)

        @app.route("/ip-probe")
        def ip_probe():
            return {"ip": get_client_ip()}

        return app

    def test_x_real_ip_precedence(self, app_with_ip_test_route: Flask) -> None:
        client = app_with_ip_test_route.test_client()
        headers = {
            "X-Real-IP": "203.0.113.195",
            "X-Forwarded-For": "198.51.100.1, 198.51.100.2",
        }
        res = client.get("/ip-probe", headers=headers)
        assert res.get_json()["ip"] == "203.0.113.195"

    def test_x_forwarded_for_fallback_first_hop(self, app_with_ip_test_route: Flask) -> None:
        client = app_with_ip_test_route.test_client()
        headers = {
            "X-Forwarded-For": "198.51.100.44, 10.0.0.1",
        }
        res = client.get("/ip-probe", headers=headers)
        assert res.get_json()["ip"] == "198.51.100.44"

    def test_fallback_to_remote_addr_when_no_proxy_headers(self, app_with_ip_test_route: Flask) -> None:
        client = app_with_ip_test_route.test_client()
        res = client.get("/ip-probe", environ_base={"REMOTE_ADDR": "127.0.0.1"})
        assert res.get_json()["ip"] == "127.0.0.1"


@pytest.mark.unit
class TestHoneypotValidation:
    def test_clean_payload_passes(self) -> None:
        payload = {
            "username": "trapper_main",
            "email": "trapper@example.com",
            "website_trap": "",
            "honeypot_verification": None,
            "company_fax": False,
        }
        assert validate_honeypot(payload) is True

    def test_honeypot_triggered_by_string(self) -> None:
        payload = {
            "username": "bot_user",
            "website_trap": "http://spamsite.example.com",
        }
        assert validate_honeypot(payload) is False

    def test_honeypot_triggered_by_boolean_true(self) -> None:
        payload = {
            "username": "bot_user",
            "honeypot_verification": True,
        }
        assert validate_honeypot(payload) is False

    def test_honeypot_triggered_by_non_empty_custom_field(self) -> None:
        payload = {"hidden_spam_catcher": "Filled By Bot"}
        assert validate_honeypot(payload, field_names=("hidden_spam_catcher",)) is False

    def test_non_dict_payload_passes_gracefully(self) -> None:
        assert validate_honeypot(None) is True
        assert validate_honeypot(["item1", "item2"]) is True
```
