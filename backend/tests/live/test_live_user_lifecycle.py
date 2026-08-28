# backend/tests/live/test_live_user_lifecycle.py
import pytest
from sqlalchemy import select
from app.core.extensions import db
from app.core.security import verify_password
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.character import Character, Survivor
from app.models.perk import Perk
from app.models.user import User, UserCharacterOwnership, UserPerkOwnership
from app.services.user_service import UserService


@pytest.mark.live
class TestLiveUserAndOwnershipLifecycle:
    def test_user_registration_and_verification_cycle(self, live_app) -> None:
        with live_app.app_context():
            user_service = UserService()
            username = "live_test_user_alpha"
            email = "alpha@example.com"
            password = "liveSecurePassword2026!"

            existing = db.session.scalars(select(User).where(User.username == username)).first()
            if existing:
                db.session.delete(existing)
                db.session.commit()

            user, token = user_service.register_user(
                username=username,
                email=email,
                password=password,
                role="user",
            )
            assert user.id is not None
            assert user.username == username
            assert verify_password(password, user.password_hash) is True

            fetched = db.session.scalars(select(User).where(User.id == user.id)).one()
            assert fetched.email == email
            assert fetched.role == "user"

            fetched.is_verified = True
            db.session.commit()

            refetched = db.session.get(User, user.id)
            assert refetched.is_verified is True

    def test_user_ownership_relations_integrity(self, live_app) -> None:
        with live_app.app_context():
            test_char = db.session.scalars(select(Character).where(Character.name == "Live Ace Visconti")).first()
            if not test_char:
                test_char = Survivor(
                    name="Live Ace Visconti",
                    role="Survivor",
                    real_name="Ace Visconti",
                )
                db.session.add(test_char)
                db.session.flush()

            test_perk = db.session.scalars(select(Perk).where(Perk.name == "Live Open-Handed")).first()
            if not test_perk:
                test_perk = Perk(
                    name="Live Open-Handed",
                    category="Survivor",
                    character_id=test_char.id,
                )
                db.session.add(test_perk)
                db.session.flush()

            user_service = UserService()
            user, _ = user_service.register_user(
                username="live_gambler_ace",
                email="ace_gambler@example.com",
                password="acePassword777!",
                role="user",
            )
            db.session.commit()

            char_ownership = UserCharacterOwnership(user_id=user.id, character_id=test_char.id, is_owned=True)
            perk_ownership = UserPerkOwnership(user_id=user.id, perk_id=test_perk.id, is_unlocked=True)
            db.session.add_all([char_ownership, perk_ownership])
            db.session.commit()

            reloaded_user = db.session.get(User, user.id)
            assert len(reloaded_user.character_ownerships) == 1
            assert reloaded_user.character_ownerships[0].character_id == test_char.id
            assert len(reloaded_user.perk_ownerships) == 1
            assert reloaded_user.perk_ownerships[0].perk_id == test_perk.id

    def test_admin_audit_log_and_challenge_setting(self, live_app, live_admin_token) -> None:
        with live_app.app_context():
            admin_user = db.session.scalars(select(User).where(User.username == "admin_live_tester")).first()
            assert admin_user is not None

            audit_entry = AdminAuditLog(
                admin_user_id=admin_user.id,
                action="UPDATE_SETTING",
                target_type="ChallengeModeSetting",
                target_id="gauntlet",
                details="Testing gauntlet pause trigger in live PostgreSQL",
            )
            db.session.add(audit_entry)

            gauntlet_setting = db.session.scalars(
                select(ChallengeModeSetting).where(ChallengeModeSetting.mode == "gauntlet")
            ).first()
            if not gauntlet_setting:
                gauntlet_setting = ChallengeModeSetting(mode="gauntlet", is_enabled=True)
                db.session.add(gauntlet_setting)

            gauntlet_setting.is_enabled = False
            gauntlet_setting.disabled_reason = "Live test maintenance"
            db.session.commit()

            persisted_audit = db.session.scalars(
                select(AdminAuditLog).where(AdminAuditLog.admin_user_id == admin_user.id)
            ).all()
            assert len(persisted_audit) >= 1

            persisted_setting = db.session.scalars(
                select(ChallengeModeSetting).where(ChallengeModeSetting.mode == "gauntlet")
            ).one()
            assert persisted_setting.is_enabled is False
            assert persisted_setting.disabled_reason == "Live test maintenance"
