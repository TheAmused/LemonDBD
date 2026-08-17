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
                # 3 teachable perks for Trapper
                p1 = Perk(name="Unnerving Presence", character_id=trapper.id, is_teachable=True, category="Killer")
                p2 = Perk(name="Brutal Strength", character_id=trapper.id, is_teachable=True, category="Killer")
                p3 = Perk(name="Agitation", character_id=trapper.id, is_teachable=True, category="Killer")
                db.session.add_all([p1, p2, p3])

            dwight = db.session.scalars(select(Character).where(Character.name == "Dwight Fairfield")).first()
            if not dwight:
                dwight = Character(name="Dwight Fairfield", role="Survivor", release_number=1)
                db.session.add(dwight)
                db.session.flush()
                # 3 teachable perks for Dwight
                p4 = Perk(name="Bond", character_id=dwight.id, is_teachable=True, category="Survivor")
                p5 = Perk(name="Prove Thyself", character_id=dwight.id, is_teachable=True, category="Survivor")
                p6 = Perk(name="Leader", character_id=dwight.id, is_teachable=True, category="Survivor")
                db.session.add_all([p4, p5, p6])

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

    def test_character_ownership_auto_unlocks_teachable_perks(self):
        """
        CRITICAL REQUIREMENT:
        When a user marks a character as owned (is_owned = True),
        all teachable perks for that character must automatically be set to is_unlocked = True!
        """
        with self.app.app_context():
            user, _ = self.user_service.register_user("trappermain", "trapper@test.com", "password123")
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            self.assertIsNotNone(trapper)

            # Trapper's teachable perks before ownership
            trapper_perks = db.session.scalars(select(Perk).where(Perk.character_id == trapper.id)).all()
            self.assertEqual(len(trapper_perks), 3)

            # Trapper not owned yet -> perks should not be unlocked
            user_perks_before = self.ownership_service.get_user_perks(user.id)
            unlocked_before = [p for p in user_perks_before if p["is_unlocked"]]
            self.assertEqual(len(unlocked_before), 0)

            # User acquires The Trapper
            res = self.ownership_service.set_character_ownership(user.id, trapper.id, is_owned=True)
            self.assertTrue(res["is_owned"])
            self.assertEqual(res["auto_unlocked_teachable_perks_count"], 3)

            # Verify that all 3 Trapper teachables are now automatically marked as unlocked!
            user_perks_after = self.ownership_service.get_user_perks(user.id)
            trapper_perk_ids = {p.id for p in trapper_perks}
            unlocked_trapper_perks = [p for p in user_perks_after if p["perk_id"] in trapper_perk_ids and p["is_unlocked"]]
            self.assertEqual(len(unlocked_trapper_perks), 3)

    def test_bulk_character_and_perk_ownership(self):
        with self.app.app_context():
            user, _ = self.user_service.register_user("bulkuser", "bulk@test.com", "password123")
            dwight = db.session.scalars(select(Character).where(Character.name == "Dwight Fairfield")).first()

            # Bulk set character ownership
            bulk_res = self.ownership_service.bulk_set_character_ownership(
                user.id,
                [{"character_id": dwight.id, "is_owned": True}]
            )
            self.assertEqual(bulk_res["characters_updated_count"], 1)
            self.assertEqual(bulk_res["auto_unlocked_perks_count"], 3)

            # Verify summary
            summary = self.ownership_service.get_user_ownership_summary(user.id)
            self.assertGreaterEqual(summary["survivors"]["owned"], 1)
            self.assertGreaterEqual(summary["perks"]["unlocked"], 3)

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

        # Check get characters
        chars_res = self.client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        self.assertEqual(chars_res.status_code, 200)

        # Set character ownership via API
        with self.app.app_context():
            trapper = db.session.scalars(select(Character).where(Character.name == "The Trapper")).first()
            trapper_id = trapper.id

        own_res = self.client.post(f"/api/v1/users/{user_id}/characters", json={
            "character_id": trapper_id,
            "is_owned": True
        }, headers=headers)
        self.assertEqual(own_res.status_code, 200)
        self.assertEqual(own_res.get_json()["data"]["auto_unlocked_teachable_perks_count"], 3)

        # Check get perks via API
        perks_res = self.client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        self.assertEqual(perks_res.status_code, 200)
        perks_data = perks_res.get_json()["data"]
        unlocked_count = sum(1 for p in perks_data if p["is_unlocked"])
        self.assertEqual(unlocked_count, 3)

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
