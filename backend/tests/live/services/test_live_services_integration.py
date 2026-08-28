# backend/tests/live/services/test_live_services_integration.py
import pytest
from flask import Flask
from app.services.others.smash_or_pass_service import SmashOrPassService
from app.services.perk_service import PerkService
from app.services.user_service import UserService


@pytest.mark.live
class TestLiveServicesIntegration:
    """Live PostgreSQL service layer queries, entity counts, user creation, and mini-game rosters."""

    def test_live_perk_service_queries(self, live_app: Flask) -> None:
        with live_app.app_context():
            service = PerkService()
            perks = service.get_perks(limit=100)
            assert len(perks["data"]) == 100
            assert perks["pagination"]["total"] > 200

            chars = service.get_characters()
            assert len(chars) >= 50

    def test_live_user_service_registration_and_token(self, live_app: Flask) -> None:
        with live_app.app_context():
            user_service = UserService()
            user, err = user_service.register_user("service_tester", "serv@example.com", "secure123")
            assert err is None
            assert user.id is not None

            token = user_service.generate_auth_token(user)
            assert token is not None
            assert len(token) > 20

    def test_live_smash_or_pass_service_stats(self, live_app: Flask) -> None:
        with live_app.app_context():
            service = SmashOrPassService()
            rosters = service.get_rosters(active_only=True)
            assert len(rosters) > 0
