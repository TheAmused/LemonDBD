# backend/tests/unit/test_guesser.py
import gc
import json
import tempfile
from pathlib import Path
import pytest
from flask import Flask
from app import create_app
from app.services.db_service import DatabaseService
from app.services.others.guesser_service import GuesserService


@pytest.mark.unit
class TestGuesserModule:
    """Tests for mini-game GuesserService stats tracking, streaks, and HTTP endpoints."""

    @pytest.fixture
    def guesser_env(self) -> tuple[GuesserService, Flask]:
        temp_dir = tempfile.TemporaryDirectory()
        db_path = str(Path(temp_dir.name) / "test_guesser.db")

        db_service = DatabaseService(db_path=db_path)
        db_service.init_db()

        app = create_app()
        app.config["TESTING"] = True

        from app.routes.others.guesser import guesser_service

        original_db = guesser_service.db_service
        original_use_sa = guesser_service._use_sqlalchemy
        guesser_service.db_service = db_service
        guesser_service._use_sqlalchemy = False

        service = GuesserService(db_service=db_service)
        yield service, app

        guesser_service.db_service = original_db
        guesser_service._use_sqlalchemy = original_use_sa
        gc.collect()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    def test_database_initialization(self, guesser_env: tuple[GuesserService, Flask]) -> None:
        service, _ = guesser_env
        stats = service.get_all_stats()
        assert "character" in stats
        assert "perk_description" in stats
        assert "perk_name_to_icon" in stats
        assert "perk_icon_to_name" in stats

        assert stats["character"]["current_streak"] == 0
        assert stats["character"]["best_streak"] == 0
        assert stats["character"]["total_guesses"] == 0
        assert stats["character"]["correct_guesses"] == 0

    @pytest.mark.parametrize(
        "guesser_type",
        ["character", "perk_description", "perk_name_to_icon", "perk_icon_to_name"],
    )
    def test_update_stats_correct_guess_across_types(
        self, guesser_env: tuple[GuesserService, Flask], guesser_type: str
    ) -> None:
        service, _ = guesser_env
        updated = service.update_stats(guesser_type, is_correct=True)
        assert updated["current_streak"] == 1
        assert updated["best_streak"] == 1
        assert updated["total_guesses"] == 1
        assert updated["correct_guesses"] == 1

        updated = service.update_stats(guesser_type, is_correct=True)
        assert updated["current_streak"] == 2
        assert updated["best_streak"] == 2

        stats = service.get_all_stats()
        assert stats[guesser_type]["current_streak"] == 2
        assert stats[guesser_type]["best_streak"] == 2

    def test_update_stats_incorrect_guess_breaks_streak(
        self, guesser_env: tuple[GuesserService, Flask]
    ) -> None:
        service, _ = guesser_env
        service.update_stats("character", is_correct=True)
        service.update_stats("character", is_correct=True)

        updated = service.update_stats("character", is_correct=False)
        assert updated["current_streak"] == 0
        assert updated["best_streak"] == 2
        assert updated["total_guesses"] == 3
        assert updated["correct_guesses"] == 2

    def test_reset_streak(self, guesser_env: tuple[GuesserService, Flask]) -> None:
        service, _ = guesser_env
        service.update_stats("character", is_correct=True)
        service.update_stats("character", is_correct=True)
        service.update_stats("character", is_correct=True)

        updated = service.reset_streak("character")
        assert updated["current_streak"] == 0
        assert updated["best_streak"] == 3

    def test_api_routes(self, guesser_env: tuple[GuesserService, Flask]) -> None:
        _, app = guesser_env
        client = app.test_client()

        response = client.get("/api/v1/guesser/stats")
        assert response.status_code == 200
        data = json.loads(response.data.decode("utf-8"))
        assert isinstance(data["data"], dict)

        response = client.post(
            "/api/v1/guesser/stats",
            json={"guesser_type": "character", "is_correct": True},
        )
        assert response.status_code == 200
        data = json.loads(response.data.decode("utf-8"))
        assert data["data"]["current_streak"] == 1

        response = client.get("/api/v1/guesser/stats")
        assert response.status_code == 200
        data = json.loads(response.data.decode("utf-8"))
        assert "character" in data["data"]

        response = client.post(
            "/api/v1/guesser/reset",
            json={"guesser_type": "character"},
        )
        assert response.status_code == 200
        data = json.loads(response.data.decode("utf-8"))
        assert data["data"]["current_streak"] == 0
