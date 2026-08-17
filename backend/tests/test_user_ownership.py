import unittest
from sqlalchemy import select
from app import create_app
from app.extensions import db
from app.models import User, Character, Perk, UserCharacterOwnership, UserPerkOwnership
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService


class TestUserAndOwnership(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.user_service = UserService()
        self.ownership_service = OwnershipService()

        with self.app.app_context():
            db.create_all()
            # Seed test killer and survivor
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            if not trapper:
                trapper = Character(name="The Trapper", role="Killer", release_number=1)
                db.session.add(trapper)
                db.session.flush()

            for p_name in ["Unnerving Presence", "Brutal Strength", "Agitation"]:
                p = db.session.scalars(select(Perk).where(Perk.name == p_name)).first()
                if not p:
                    db.session.add(Perk(name=p_name, character_id=trapper.id, is_teachable=True, category="Killer"))
                else:
                    p.character_id = trapper.id
                    p.is_teachable = True

            dwight = db.session.scalars(select(Character).where(Character.name == "Dwight Fairfield")).first()
            if not dwight:
                dwight = Character(name="Dwight Fairfield", role="Survivor", release_number=1)
                db.session.add(dwight)
                db.session.flush()

            for p_name in ["Bond", "Prove Thyself", "Leader"]:
                p = db.session.scalars(select(Perk).where(Perk.name == p_name)).first()
                if not p:
                    db.session.add(Perk(name=p_name, character_id=dwight.id, is_teachable=True, category="Survivor"))
                else:
                    p.character_id = dwight.id
                    p.is_teachable = True

            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.query(UserCharacterOwnership).delete()
            db.session.query(UserPerkOwnership).delete()
            db.session.query(User).delete()
            db.session.commit()

    def test_user_registration_and_auth(self):
        with self.app.app_context():
            # Test registration
            user, err = self.user_service.register_user("testkiller", "killer@test.com", "killerpassword", role="user")
            self.assertIsNone(err)
            self.assertIsNotNone(user)
            self.assertEqual(user.username, "testkiller")
            self.assertEqual(user.role, "user")

            # Test duplicate
            dup, dup_err = self.user_service.register_user("testkiller", "other@test.com", "killerpassword")
            self.assertIsNotNone(dup_err)

            # Test authentication
            auth_user, token = self.user_service.authenticate("testkiller", "killerpassword")
            self.assertIsNotNone(auth_user)
            self.assertIsNotNone(token)

            # Verify token
            verified = self.user_service.verify_token(token)
            self.assertIsNotNone(verified)
            self.assertEqual(verified.id, user.id)

    def test_default_state_is_all_owned_and_unlocked(self):
        """
        CRITICAL REQUIREMENT:
        A fresh user with no explicit ownership records must see every
        character as owned and every perk as unlocked by default.
        """
        with self.app.app_context():
            user, _ = self.user_service.register_user("freshuser", "fresh@test.com", "password123")

            characters = self.ownership_service.get_user_characters(user.id)
            self.assertTrue(len(characters) > 0)
            self.assertTrue(all(c["is_owned"] for c in characters))

            perks = self.ownership_service.get_user_perks(user.id)
            self.assertTrue(len(perks) > 0)
            self.assertTrue(all(p["is_unlocked"] for p in perks))

    def test_locking_character_cascades_lock_to_its_perks(self):
        """
        CRITICAL REQUIREMENT:
        When a user marks a character as NOT owned (is_owned = False),
        all teachable perks for that character must automatically be
        locked (is_unlocked = False), mirroring the auto-unlock on True.
        """
        with self.app.app_context():
            user, _ = self.user_service.register_user("trappermain", "trapper@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            self.assertIsNotNone(trapper)

            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()
            self.assertEqual(len(trapper_perks), 3)
            trapper_perk_ids = {p.id for p in trapper_perks}

            # Default: Trapper owned, perks unlocked
            res = self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)
            self.assertFalse(res["is_owned"])
            self.assertEqual(res["auto_locked_teachable_perks_count"], 3)

            user_perks_after = self.ownership_service.get_user_perks(user.id)
            locked_trapper_perks = [
                p for p in user_perks_after if p["perk_id"] in trapper_perk_ids and not p["is_unlocked"]
            ]
            self.assertEqual(len(locked_trapper_perks), 3)

    def test_manually_unlock_single_perk_of_locked_character(self):
        """
        A user can own a single perk of an otherwise-locked character:
        lock the character (cascades to lock all its perks), then
        manually re-unlock one specific perk.
        """
        with self.app.app_context():
            user, _ = self.user_service.register_user("partialuser", "partial@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()

            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)
            self.ownership_service.set_perk_ownership(user.id, trapper_perks[0].id, is_unlocked=True)

            user_perks = self.ownership_service.get_user_perks(user.id)
            trapper_perk_status = {p["perk_id"]: p["is_unlocked"] for p in user_perks if p["character_id"] == trapper.id}
            self.assertTrue(trapper_perk_status[trapper_perks[0].id])
            self.assertFalse(trapper_perk_status[trapper_perks[1].id])
            self.assertFalse(trapper_perk_status[trapper_perks[2].id])

    def test_character_ownership_auto_unlocks_teachable_perks(self):
        """
        When a user marks a character as owned (is_owned = True) after it
        was locked, all teachable perks for that character must
        automatically be set to is_unlocked = True.
        """
        with self.app.app_context():
            user, _ = self.user_service.register_user("trappermain2", "trapper2@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()

            # Lock first, so re-owning is a meaningful transition
            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

            res = self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=True)
            self.assertTrue(res["is_owned"])
            self.assertEqual(res["auto_unlocked_teachable_perks_count"], 3)

            user_perks_after = self.ownership_service.get_user_perks(user.id)
            trapper_perk_ids = {p.id for p in trapper_perks}
            unlocked_trapper_perks = [p for p in user_perks_after if p["perk_id"] in trapper_perk_ids and p["is_unlocked"]]
            self.assertEqual(len(unlocked_trapper_perks), 3)

    def test_bulk_character_and_perk_ownership(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("bulkuser", "bulk@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            dwight = db.session.scalars(select(Character).where(Character.name == "Dwight Fairfield")).first()

            # Lock Trapper first, then bulk re-own via Dwight + Trapper
            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

            bulk_res = self.ownership_service.bulk_set_character_ownership(
                user.id,
                [{"character_id": trapper.id, "is_owned": True}, {"character_id": dwight.id, "is_owned": True}]
            )
            self.assertEqual(bulk_res["characters_updated_count"], 2)
            self.assertEqual(bulk_res["auto_unlocked_perks_count"], 6)

            # Verify summary: everything owned/unlocked again
            summary = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertGreaterEqual(summary["survivors"]["owned"], summary["survivors"]["total"])
            self.assertGreaterEqual(summary["perks"]["unlocked"], 6)

    def test_ownership_summary_reflects_default_and_explicit_locks(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("summaryuser", "summary@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()

            summary_default = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertEqual(summary_default["killers"]["owned"], summary_default["killers"]["total"])
            self.assertEqual(summary_default["perks"]["unlocked"], summary_default["perks"]["total"])

            self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=False)

            summary_after_lock = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertEqual(summary_after_lock["killers"]["owned"], summary_default["killers"]["total"] - 1)
            self.assertEqual(summary_after_lock["perks"]["unlocked"], summary_default["perks"]["total"] - 3)

    def test_auth_and_user_routes(self):
        # Register via API
        reg_res = self.client.post("/api/v1/auth/register", json={
            "username": "apicheck",
            "email": "api@check.com",
            "password": "password123",
        })
        self.assertEqual(reg_res.status_code, 201, reg_res.get_json())
        data = reg_res.get_json()
        token = data["token"]
        user_id = data["user"]["id"]

        headers = {"Authorization": f"Bearer {token}"}

        # Check /api/v1/auth/me
        me_res = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["user"]["username"], "apicheck")

        # Check get characters -> default all owned
        chars_res = self.client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        self.assertEqual(chars_res.status_code, 200)
        chars_data = chars_res.get_json()["data"]
        self.assertTrue(all(c["is_owned"] for c in chars_data))

        # Lock character via API -> cascades to lock its perks
        with self.app.app_context():
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_id = trapper.id

        lock_res = self.client.post(f"/api/v1/users/{user_id}/characters", json={
            "character_id": trapper_id,
            "is_owned": False
        }, headers=headers)
        self.assertEqual(lock_res.status_code, 200)
        self.assertEqual(lock_res.get_json()["data"]["auto_locked_teachable_perks_count"], 3)

        # Re-own via API -> auto unlocks its teachable perks
        own_res = self.client.post(f"/api/v1/users/{user_id}/characters", json={
            "character_id": trapper_id,
            "is_owned": True
        }, headers=headers)
        self.assertEqual(own_res.status_code, 200)
        self.assertEqual(own_res.get_json()["data"]["auto_unlocked_teachable_perks_count"], 3)

        # Check get perks via API -> default all unlocked
        perks_res = self.client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        self.assertEqual(perks_res.status_code, 200)
        perks_data = perks_res.get_json()["data"]
        self.assertTrue(all(p["is_unlocked"] for p in perks_data))

    def test_admin_routes(self):
        with self.app.app_context():
            admin, admin_token = self.user_service.authenticate("admin", "admin123")
            if not admin:
                admin, _ = self.user_service.register_user("adminuser", "adm@test.com", "adminpass", role="admin")
                admin_token = self.user_service.generate_token(admin.id)
            user, _ = self.user_service.register_user("regular", "reg@test.com", "regpass", role="user")

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Admin stats
        stats_res = self.client.get("/api/v1/admin/stats", headers=admin_headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.get_json()
        self.assertIn("total_users", stats)
        self.assertIn("survivors_count", stats)
        self.assertIn("killers_count", stats)

        # Admin list users
        list_res = self.client.get("/api/v1/users", headers=admin_headers)
        self.assertEqual(list_res.status_code, 200)
        users = list_res.get_json()["users"]
        self.assertTrue(any(u["username"] == "regular" for u in users))

        # Admin update user role
        update_res = self.client.put(f"/api/v1/users/{user.id}", json={"role": "admin"}, headers=admin_headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()["user"]["role"], "admin")

        # Admin delete user
        del_res = self.client.delete(f"/api/v1/users/{user.id}", headers=admin_headers)
        self.assertEqual(del_res.status_code, 200)

    def test_default_seeder_lemon_and_user(self):
        with self.app.app_context():
            from app.seeds.user_seeder import seed_default_users
            seed_default_users()

            # Test admin login: lemon / lemon
            lemon, l_token = self.user_service.authenticate("lemon", "lemon")
            self.assertIsNotNone(lemon)
            self.assertEqual(lemon.username, "lemon")
            self.assertEqual(lemon.role, "admin")
            self.assertIsNotNone(l_token)

            # Test user login: user / user
            u, u_token = self.user_service.authenticate("user", "user")
            self.assertIsNotNone(u)
            self.assertEqual(u.username, "user")
            self.assertEqual(u.role, "user")
            self.assertIsNotNone(u_token)

    def test_admin_create_user_endpoint(self):
        with self.app.app_context():
            from app.seeds.user_seeder import seed_default_users
            seed_default_users()
            lemon, _ = self.user_service.authenticate("lemon", "lemon")
            admin_token = self.user_service.generate_token(lemon.id)

        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Create new user via admin POST /api/v1/users
        res = self.client.post(
            "/api/v1/users",
            json={
                "username": "custom_player",
                "email": "custom@player.com",
                "password": "secretpassword",
                "role": "user",
            },
            headers=admin_headers,
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["username"], "custom_player")


if __name__ == "__main__":
    unittest.main()
