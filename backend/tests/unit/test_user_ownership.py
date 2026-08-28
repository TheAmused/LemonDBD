# backend/tests/unit/test_user_ownership.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.extensions import db
from app.models import Character, Perk, User, UserCharacterOwnership, UserPerkOwnership
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService


@pytest.fixture(autouse=True)
def setup_ownership_db(db_session: Session) -> None:
    trapper = db_session.scalars(
        select(Character).where(Character.name == "The Trapper")
    ).first()
    if not trapper:
        trapper = Character(
            name="The Trapper",
            wiki_slug="The_Trapper",
            role="Killer",
            release_number=1,
        )
        db_session.add(trapper)
        db_session.flush()

    for p_name in ["Unnerving Presence", "Brutal Strength", "Agitation"]:
        p = db_session.scalars(select(Perk).where(Perk.name == p_name)).first()
        if not p:
            db_session.add(
                Perk(
                    name=p_name,
                    character_id=trapper.id,
                    is_teachable=True,
                    category="Killer",
                )
            )
        else:
            p.character_id = trapper.id
            p.is_teachable = True

    dwight = db_session.scalars(
        select(Character).where(Character.name == "Dwight Fairfield")
    ).first()
    if not dwight:
        dwight = Character(
            name="Dwight Fairfield",
            wiki_slug="Dwight_Fairfield",
            role="Survivor",
            release_number=1,
        )
        db_session.add(dwight)
        db_session.flush()

    for p_name in ["Bond", "Prove Thyself", "Leader"]:
        p = db_session.scalars(select(Perk).where(Perk.name == p_name)).first()
        if not p:
            db_session.add(
                Perk(
                    name=p_name,
                    character_id=dwight.id,
                    is_teachable=True,
                    category="Survivor",
                )
            )
        else:
            p.character_id = dwight.id
            p.is_teachable = True

    db_session.commit()


@pytest.fixture
def user_service() -> UserService:
    return UserService()


@pytest.fixture
def ownership_service() -> OwnershipService:
    return OwnershipService()


@pytest.mark.unit
class TestUserAndOwnership:
    """Tests for User registration, JWT tokens, character/perk ownership cascades, and Admin CRUD."""

    def test_user_registration_and_auth(self, user_service: UserService) -> None:
        user, err = user_service.register_user(
            "testkiller", "killer@test.com", "killerpassword", role="user"
        )
        assert err is None
        assert user is not None
        assert user.username == "testkiller"
        assert user.role == "user"

        dup, dup_err = user_service.register_user(
            "testkiller", "other@test.com", "killerpassword"
        )
        assert dup_err is not None

        auth_user, token = user_service.authenticate("testkiller", "killerpassword")
        assert auth_user is not None
        assert token is not None

        verified = user_service.verify_token(token)
        assert verified is not None
        assert verified.id == user.id

    def test_default_state_is_all_owned_and_unlocked(
        self, user_service: UserService, ownership_service: OwnershipService
    ) -> None:
        user, _ = user_service.register_user("freshuser", "fresh@test.com", "password123")

        characters = ownership_service.get_user_characters(user.id)
        assert len(characters) > 0
        assert all(c["is_owned"] for c in characters)

        perks = ownership_service.get_user_perks(user.id)
        assert len(perks) > 0
        assert all(p["is_unlocked"] for p in perks)

    def test_locking_character_cascades_lock_to_its_perks(
        self,
        user_service: UserService,
        ownership_service: OwnershipService,
        db_session: Session,
    ) -> None:
        user, _ = user_service.register_user("trappermain", "trapper@test.com", "password123")
        trapper = db_session.scalars(
            select(Character).where(Character.name == "The Trapper")
        ).first()
        assert trapper is not None

        trapper_perks = db_session.scalars(
            select(Perk).where(Perk.character_id == trapper.id)
        ).all()
        assert len(trapper_perks) == 3
        trapper_perk_ids = {p.id for p in trapper_perks}

        res = ownership_service.set_character_ownership(
            user.id, trapper.id, is_owned=False
        )
        assert res["is_owned"] is False
        assert res["auto_locked_teachable_perks_count"] == 3

        user_perks_after = ownership_service.get_user_perks(user.id)
        locked_trapper_perks = [
            p
            for p in user_perks_after
            if p["perk_id"] in trapper_perk_ids and not p["is_unlocked"]
        ]
        assert len(locked_trapper_perks) == 3

    def test_manually_unlock_single_perk_of_locked_character(
        self,
        user_service: UserService,
        ownership_service: OwnershipService,
        db_session: Session,
    ) -> None:
        user, _ = user_service.register_user("partialuser", "partial@test.com", "password123")
        trapper = db_session.scalars(
            select(Character).where(Character.name == "The Trapper")
        ).first()
        trapper_perks = db_session.scalars(
            select(Perk).where(Perk.character_id == trapper.id)
        ).all()

        ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)
        ownership_service.set_perk_ownership(
            user.id, trapper_perks[0].id, is_unlocked=True
        )

        user_perks = ownership_service.get_user_perks(user.id)
        trapper_perk_status = {
            p["perk_id"]: p["is_unlocked"]
            for p in user_perks
            if p["character_id"] == trapper.id
        }
        assert trapper_perk_status[trapper_perks[0].id] is True
        assert trapper_perk_status[trapper_perks[1].id] is False
        assert trapper_perk_status[trapper_perks[2].id] is False

    def test_character_ownership_auto_unlocks_teachable_perks(
        self,
        user_service: UserService,
        ownership_service: OwnershipService,
        db_session: Session,
    ) -> None:
        user, _ = user_service.register_user("trappermain2", "trapper2@test.com", "password123")
        trapper = db_session.scalars(
            select(Character).where(Character.name == "The Trapper")
        ).first()
        trapper_perks = db_session.scalars(
            select(Perk).where(Perk.character_id == trapper.id)
        ).all()

        ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

        res = ownership_service.set_character_ownership(user.id, trapper.id, is_owned=True)
        assert res["is_owned"] is True
        assert res["auto_unlocked_teachable_perks_count"] == 3

        user_perks_after = ownership_service.get_user_perks(user.id)
        trapper_perk_ids = {p.id for p in trapper_perks}
        unlocked_trapper_perks = [
            p
            for p in user_perks_after
            if p["perk_id"] in trapper_perk_ids and p["is_unlocked"]
        ]
        assert len(unlocked_trapper_perks) == 3

    def test_bulk_character_and_perk_ownership(
        self,
        user_service: UserService,
        ownership_service: OwnershipService,
        db_session: Session,
    ) -> None:
        user, _ = user_service.register_user("bulkuser", "bulk@test.com", "password123")
        trapper = db_session.scalars(
            select(Character).where(Character.name == "The Trapper")
        ).first()
        dwight = db_session.scalars(
            select(Character).where(Character.name == "Dwight Fairfield")
        ).first()

        ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

        bulk_res = ownership_service.bulk_set_character_ownership(
            user.id,
            [
                {"character_id": trapper.id, "is_owned": True},
                {"character_id": dwight.id, "is_owned": True},
            ],
        )
        assert bulk_res["characters_updated_count"] == 2
        assert bulk_res["auto_unlocked_perks_count"] == 6

        summary = ownership_service.get_user_ownership_summary(user.id)
        assert summary["survivors"]["owned"] >= summary["survivors"]["total"]
        assert summary["perks"]["unlocked"] >= 6

    def test_ownership_summary_reflects_default_and_explicit_locks(
        self,
        user_service: UserService,
        ownership_service: OwnershipService,
        db_session: Session,
    ) -> None:
        user, _ = user_service.register_user("summaryuser", "summary@test.com", "password123")
        trapper = db_session.scalars(
            select(Character).where(Character.name == "The Trapper")
        ).first()

        summary_default = ownership_service.get_user_ownership_summary(user.id)
        assert summary_default["killers"]["owned"] == summary_default["killers"]["total"]
        assert summary_default["perks"]["unlocked"] == summary_default["perks"]["total"]

        ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

        summary_after_lock = ownership_service.get_user_ownership_summary(user.id)
        assert (
            summary_after_lock["killers"]["owned"]
            == summary_default["killers"]["total"] - 1
        )
        assert (
            summary_after_lock["perks"]["unlocked"]
            == summary_default["perks"]["total"] - 3
        )

    def test_auth_and_user_routes(
        self, client: FlaskClient, db_session: Session
    ) -> None:
        reg_res = client.post(
            "/api/v1/auth/register",
            json={
                "username": "apicheck",
                "email": "api@check.com",
                "password": "password123",
            },
        )
        assert reg_res.status_code == 201
        data = reg_res.get_json()
        token = data["token"]
        user_id = data["user"]["id"]

        headers = {"Authorization": f"Bearer {token}"}

        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.get_json()["user"]["username"] == "apicheck"

        chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        assert chars_res.status_code == 200
        chars_data = chars_res.get_json()["data"]
        trapper_char = next(c for c in chars_data if c["name"] == "The Trapper")
        assert trapper_char["is_owned"] is True

        trapper = db_session.scalars(
            select(Character).where(Character.name == "The Trapper")
        ).first()
        trapper_id = trapper.id

        lock_res = client.post(
            f"/api/v1/users/{user_id}/characters",
            json={"character_id": trapper_id, "is_owned": False},
            headers=headers,
        )
        assert lock_res.status_code == 200
        assert (
            lock_res.get_json()["data"]["auto_locked_teachable_perks_count"] == 3
        )

        own_res = client.post(
            f"/api/v1/users/{user_id}/characters",
            json={"character_id": trapper_id, "is_owned": True},
            headers=headers,
        )
        assert own_res.status_code == 200
        assert (
            own_res.get_json()["data"]["auto_unlocked_teachable_perks_count"] == 3
        )

        perks_res = client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        assert perks_res.status_code == 200
        perks_data = perks_res.get_json()["data"]
        assert all(p["is_unlocked"] for p in perks_data)

    def test_admin_routes(
        self, client: FlaskClient, user_service: UserService, db_session: Session
    ) -> None:
        admin, admin_token = user_service.authenticate("admin", "admin123")
        if not admin:
            admin, _ = user_service.register_user(
                "adminuser", "adm@test.com", "adminpass", role="admin"
            )
            admin_token = user_service.generate_token(admin.id)
        user, _ = user_service.register_user(
            "regular", "reg@test.com", "regpass", role="user"
        )

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert "total_users" in stats
        assert "survivors_count" in stats
        assert "killers_count" in stats

        list_res = client.get("/api/v1/users", headers=admin_headers)
        assert list_res.status_code == 200
        users = list_res.get_json()["users"]
        assert any(u["username"] == "regular" for u in users)

        update_res = client.put(
            f"/api/v1/users/{user.id}", json={"role": "admin"}, headers=admin_headers
        )
        assert update_res.status_code == 200
        assert update_res.get_json()["user"]["role"] == "admin"

        del_res = client.delete(f"/api/v1/users/{user.id}", headers=admin_headers)
        assert del_res.status_code == 200

    def test_default_seeder_lemon_and_user(self, user_service: UserService) -> None:
        from app.seeds.user_seeder import seed_default_users

        seed_default_users()

        lemon, l_token = user_service.authenticate("lemon", "lemon")
        assert lemon is not None
        assert lemon.username == "lemon"
        assert lemon.role == "admin"
        assert l_token is not None

        u, u_token = user_service.authenticate("user", "user")
        assert u is not None
        assert u.username == "user"
        assert u.role == "user"
        assert u_token is not None

    def test_admin_create_user_endpoint(
        self, client: FlaskClient, user_service: UserService
    ) -> None:
        from app.seeds.user_seeder import seed_default_users

        seed_default_users()
        lemon, _ = user_service.authenticate("lemon", "lemon")
        admin_token = user_service.generate_token(lemon.id)

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res = client.post(
            "/api/v1/users",
            json={
                "username": "custom_player",
                "email": "custom@player.com",
                "password": "secretpassword",
                "role": "user",
            },
            headers=admin_headers,
        )
        assert res.status_code == 201
        data = res.get_json()
        assert data["status"] == "success"
        assert data["user"]["username"] == "custom_player"
