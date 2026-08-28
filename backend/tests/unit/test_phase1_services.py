# backend/tests/unit/test_phase1_services.py
import gc
import tempfile
from pathlib import Path
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app import create_app
from app.services.db_service import DatabaseService
from app.services.others.draft_service import DraftService
from app.services.others.quest_service import QuestService


@pytest.mark.unit
class TestPhase1Services:
    """Tests for Phase 1 Draft bans/picks state machine and Quest claiming."""

    @pytest.fixture
    def phase1_env(self) -> tuple[FlaskClient, DatabaseService]:
        temp_dir = tempfile.TemporaryDirectory()
        db_path = str(Path(temp_dir.name) / "test_phase1.db")
        db_service = DatabaseService(db_path=db_path)
        db_service.init_db()

        app = create_app()
        app.config["TESTING"] = True
        app.config["DRAFT_SERVICE"] = DraftService(db_service=db_service)
        app.config["QUEST_SERVICE"] = QuestService(db_service=db_service)
        client = app.test_client()

        yield client, db_service

        gc.collect()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    def test_draft_service_and_endpoints(self, phase1_env: tuple[FlaskClient, DatabaseService]) -> None:
        client, _ = phase1_env

        res = client.post("/api/v1/draft/create", json={"room_code": "TESTROOM"})
        assert res.status_code == 201
        data = res.get_json()
        assert data["status"] == "success"
        assert data["room"]["room_code"] == "TESTROOM"
        assert data["room"]["phase"] == "bans"

        res = client.get("/api/v1/draft/TESTROOM")
        assert res.status_code == 200
        data = res.get_json()
        assert data["room"]["room_code"] == "TESTROOM"
        assert data["room"]["banned_perks"] == []

        res = client.post(
            "/api/v1/draft/TESTROOM/action",
            json={"action": "ban", "perk": "Sprint Burst", "phase": "picks"},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "Sprint Burst" in data["room"]["banned_perks"]
        assert data["room"]["phase"] == "picks"

        res = client.post(
            "/api/v1/draft/TESTROOM/action",
            json={"action": "pick", "perk": "Dead Hard", "role": "survivor"},
        )
        assert res.status_code == 200

        res = client.post(
            "/api/v1/draft/TESTROOM/action",
            json={
                "action": "pick",
                "perk": "Scourge Hook: Pain Resonance",
                "role": "killer",
                "phase": "complete",
            },
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "Dead Hard" in data["room"]["picked_survivor_perks"]
        assert "Scourge Hook: Pain Resonance" in data["room"]["picked_killer_perks"]
        assert data["room"]["phase"] == "complete"

        res = client.get("/api/v1/draft/NONEXISTENT")
        assert res.status_code == 404

    def test_quest_service_and_endpoints(self, phase1_env: tuple[FlaskClient, DatabaseService]) -> None:
        client, _ = phase1_env

        res = client.get("/api/v1/quests/")
        assert res.status_code == 200
        data = res.get_json()
        quests = data["quests"]
        assert len(quests) == 4

        daily_quests = [q for q in quests if q["category"] == "daily"]
        weekly_quests = [q for q in quests if q["category"] == "weekly"]
        assert len(daily_quests) == 3
        assert len(weekly_quests) == 1

        first_quest_id = quests[0]["id"]
        res = client.post("/api/v1/quests/claim", json={"quest_id": first_quest_id})
        assert res.status_code == 200
        claim_data = res.get_json()
        assert claim_data["status"] == "success"
        assert claim_data["quest"]["is_completed"] is True
        assert claim_data["xp_reward"] > 0

        # Duplicate claim attempt must be rejected
        res = client.post("/api/v1/quests/claim", json={"quest_id": first_quest_id})
        assert res.status_code == 400
