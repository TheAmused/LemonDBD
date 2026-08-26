# backend/tests/live/services/test_live_services_integration.py
import pytest
from sqlalchemy import select, func
from app.models import Character, Perk, User
from app.services.perk_service import PerkService
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.services.chaos_service import ChaosService
from app.services.history_service import HistoryService
from app.services.others.smash_or_pass_service import SmashOrPassService

def test_live_perk_service_queries(live_app):
    with live_app.app_context():
        service = PerkService()
        perks = service.get_perks(limit=100)
        assert len(perks["data"]) == 100
        assert perks["pagination"]["total"] > 200

        chars = service.get_characters()
        assert len(chars) >= 50


def test_live_user_service_registration_and_token(live_app):
    with live_app.app_context():
        user_service = UserService()
        user, err = user_service.register_user("service_tester", "serv@test.com", "secure123")
        assert err is None
        assert user.id is not None

        token = user_service.generate_auth_token(user)
        assert token is not None
        assert len(token) > 20


def test_live_smash_or_pass_service_stats(live_app):
    with live_app.app_context():
        service = SmashOrPassService()
        rosters = service.get_rosters(active_only=True)
        assert len(rosters) > 0
