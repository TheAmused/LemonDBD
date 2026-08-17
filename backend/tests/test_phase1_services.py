import os
import tempfile
import unittest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.challenge_service import ChallengeService
from app.services.others.draft_service import DraftService
from app.services.others.quest_service import QuestService


class TestPhase1Services(unittest.TestCase):
    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp()
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["DRAFT_SERVICE"] = DraftService(db_service=self.db_service)
        self.app.config["QUEST_SERVICE"] = QuestService(db_service=self.db_service)
        self.app.config["CHALLENGE_SERVICE"] = ChallengeService(db_service=self.db_service)
        self.client = self.app.test_client()

    def tearDown(self):
        os.close(self.db_fd)
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    # -------------------------------------------------------------
    # 1. Killer Gauntlet Tiers Tests
    # -------------------------------------------------------------
    def test_killer_gauntlet_tiers(self):
        service = ChallengeService(db_service=self.db_service)

        # Tier 0 (Streak 0-2)
        tier0 = service.get_tier_info(0, role="killer")
        self.assertEqual(tier0["name"], "The Warm Up")
        self.assertEqual(tier0["perk_limit"], 4)
        self.assertEqual(tier0["addon_limit"], 2)

        # Tier 1 (Streak 3-5)
        tier1 = service.get_tier_info(3, role="killer")
        self.assertEqual(tier1["name"], "The Restriction")
        self.assertEqual(tier1["perk_limit"], 3)
        self.assertEqual(tier1["addon_limit"], 1)

        # Tier 2 (Streak 6-8)
        tier2 = service.get_tier_info(6, role="killer")
        self.assertEqual(tier2["name"], "The Deprivation")
        self.assertEqual(tier2["perk_limit"], 2)
        self.assertEqual(tier2["addon_limit"], 0)

        # Tier 3 (Streak 9-11)
        tier3 = service.get_tier_info(9, role="killer")
        self.assertEqual(tier3["name"], "The Barebones")
        self.assertEqual(tier3["perk_limit"], 1)
        self.assertEqual(tier3["addon_limit"], 0)

        # Tier 4 (Streak 12+)
        tier4 = service.get_tier_info(12, role="killer")
        self.assertEqual(tier4["name"], "The Entity's Chosen")
        self.assertEqual(tier4["perk_limit"], 0)
        self.assertEqual(tier4["addon_limit"], 0)

        # Confirm survivor tiers differ from killer tiers
        survivor_tier0 = service.get_tier_info(0, role="survivor")
        self.assertEqual(survivor_tier0["name"], "The Warm Up")
        self.assertNotIn("addon_limit", survivor_tier0)

        survivor_tier1 = service.get_tier_info(3, role="survivor")
        self.assertEqual(survivor_tier1["name"], "The Thinning")

    # -------------------------------------------------------------
    # 2. Tournament Draft Service & API Tests
    # -------------------------------------------------------------
    def test_draft_service_and_endpoints(self):
        # Create draft room via POST /api/v1/draft/create
        res = self.client.post("/api/v1/draft/create", json={"room_code": "TESTROOM"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["room"]["room_code"], "TESTROOM")
        self.assertEqual(data["room"]["phase"], "bans")

        # Fetch state via GET /api/v1/draft/<room_code>
        res = self.client.get("/api/v1/draft/TESTROOM")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["room"]["room_code"], "TESTROOM")
        self.assertEqual(data["room"]["banned_perks"], [])

        # Action: Ban perk
        res = self.client.post("/api/v1/draft/TESTROOM/action", json={
            "action": "ban",
            "perk": "Sprint Burst",
            "phase": "picks"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("Sprint Burst", data["room"]["banned_perks"])
        self.assertEqual(data["room"]["phase"], "picks")

        # Action: Pick survivor perk & killer perk
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

        # Fetch non-existent room
        res = self.client.get("/api/v1/draft/NONEXISTENT")
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------
    # 3. Daily & Weekly Quest Service & API Tests
    # -------------------------------------------------------------
    def test_quest_service_and_endpoints(self):
        # GET /api/v1/quests/ should auto-seed 3 daily + 1 weekly
        res = self.client.get("/api/v1/quests/")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        quests = data["quests"]
        self.assertEqual(len(quests), 4)

        daily_quests = [q for q in quests if q["category"] == "daily"]
        weekly_quests = [q for q in quests if q["category"] == "weekly"]
        self.assertEqual(len(daily_quests), 3)
        self.assertEqual(len(weekly_quests), 1)

        # Claim a quest via POST /api/v1/quests/claim
        first_quest_id = quests[0]["id"]
        res = self.client.post("/api/v1/quests/claim", json={"quest_id": first_quest_id})
        self.assertEqual(res.status_code, 200)
        claim_data = res.get_json()
        self.assertEqual(claim_data["status"], "success")
        self.assertTrue(claim_data["quest"]["is_completed"])
        self.assertGreater(claim_data["xp_reward"], 0)

        # Attempting to claim again should return 400 error
        res = self.client.post("/api/v1/quests/claim", json={"quest_id": first_quest_id})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
