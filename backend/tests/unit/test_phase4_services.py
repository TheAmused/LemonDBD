# backend/tests/unit/test_phase4_services.py
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
