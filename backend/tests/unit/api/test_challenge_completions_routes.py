# backend/tests/unit/api/test_challenge_completions_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.services.page_streak_service import PageStreakService
from app.services.user_service import UserService
from tests.unit.test_page_streak_service import FakePerkService, make_perks, seed_perks


@pytest.fixture(autouse=True)
def setup_page_streak(app: Flask, db_session: Session) -> None:
    perks = make_perks(4, character="Nurse")
    seed_perks(perks)
    app.config["PAGE_STREAK_SERVICE"] = PageStreakService(
        perk_service=FakePerkService(perks),
    )


@pytest.fixture
def auth_headers() -> dict[str, str]:
    user_service = UserService()
    user, err = user_service.register_user("completionstatususer", "status@test.com", "password123")
    assert err is None
    token = user_service.generate_token(user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.unit
class TestChallengeCompletionStatusRoute:
    """Tests for the shared /challenge-completions/status endpoint, in
    particular the live-computed Page Streak badge merged into its response."""

    def test_page_streak_badge_absent_before_the_roster_is_cleared(
        self, client: FlaskClient, auth_headers: dict[str, str]
    ) -> None:
        res = client.get("/api/v1/challenge-completions/status", headers=auth_headers)
        assert res.status_code == 200
        body = res.get_json()
        assert "page_streak" not in body["completions"]
        assert "page_streak" not in body["full_roster"]
        assert "page_streak" not in body["completion_counts"]

    def test_page_streak_badge_merged_in_after_clearing_the_only_killer(
        self, client: FlaskClient, auth_headers: dict[str, str]
    ) -> None:
        run = client.post(
            "/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=auth_headers
        ).get_json()["run"]

        for page_index, page in enumerate(run["pages"], start=1):
            res = client.post(
                "/api/v1/page-streak/run/result",
                json={"killer": "Nurse", "page": page_index, "perks": page[:4], "result": "win"},
                headers=auth_headers,
            )
        assert res.get_json()["run"]["status"] == "completed"

        status = client.get("/api/v1/challenge-completions/status", headers=auth_headers).get_json()
        assert "roster_complete" in status["completions"]["page_streak"]
        assert status["completion_counts"]["page_streak"]["roster_complete"] == 1
        assert status["full_roster"]["page_streak"] == {"roster_complete": 1}
