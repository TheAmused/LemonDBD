# backend/tests/unit/api/test_smash_or_pass_admin_routes.py
"""POST /api/v1/smash-or-pass/rosters -- the "Official?" checkbox in the
smash-or-pass roster creator. Mirrors test_tier_list_routes.py's
TestTierListAdminCreate one-to-one, adapted for this feature's differences:
one seed file per roster (never a shared rewrite-all file), a zeroed
EntityStat row per entity, and admin-authored `translations`.
"""
import json
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.smash_or_pass import Entity, EntityStat, Roster
from app.models.user import User


@pytest.mark.unit
class TestSmashOrPassAdminCreate:
    @pytest.fixture
    def admin_user(self, db_session: Session) -> User:
        user = User(username="sp_admin", email="sp_admin@example.com", password_hash="hashed", role="admin")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def plain_user(self, db_session: Session) -> User:
        user = User(username="sp_user", email="sp_user@example.com", password_hash="hashed", role="user")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def admin_headers(self, app: Flask, admin_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(admin_user.id, role="admin")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def user_headers(self, app: Flask, plain_user: User) -> dict[str, str]:
        with app.app_context():
            token = generate_token(plain_user.id, role="user")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture(autouse=True)
    def _seed_dir_sandbox(self, tmp_path: Path, monkeypatch):
        """`create_roster` writes a new file under `ROSTERS_DIR` (see
        `_write_roster_seed_file`) -- point it at a throwaway directory for
        every test in this class so a run can never touch the repo's actual
        seed files, no matter how the test ends."""
        monkeypatch.setattr("app.services.smash_or_pass_service.ROSTERS_DIR", tmp_path)
        self.rosters_dir = tmp_path

    @staticmethod
    def _payload(**overrides) -> dict:
        payload = {
            "name": "Test Admin Roster",
            "description": "A roster authored from the admin creator",
            "entities": [
                {"name": "Alpha Entity", "role": "Survivor", "gender": "female"},
                {"name": "Beta Entity", "role": "Killer", "gender": "monster_other"},
            ],
        }
        payload.update(overrides)
        return payload

    def test_requires_auth(self, client: FlaskClient) -> None:
        res = client.post("/api/v1/smash-or-pass/rosters", json=self._payload())
        assert res.status_code == 401

    def test_requires_admin(self, client: FlaskClient, user_headers: dict[str, str]) -> None:
        res = client.post("/api/v1/smash-or-pass/rosters", json=self._payload(), headers=user_headers)
        assert res.status_code == 403

    def test_creates_a_published_roster_visible_on_the_public_hub(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        res = client.post("/api/v1/smash-or-pass/rosters", json=self._payload(), headers=admin_headers)

        assert res.status_code == 201
        data = res.get_json()["data"]
        assert data["slug"] == "test-admin-roster"
        assert data["is_active"] is True
        assert data["entity_count"] == 2
        assert len(data["entities"]) == 2

        row = db_session.scalar(select(Roster).where(Roster.slug == "test-admin-roster"))
        assert row is not None and row.is_active is True

        hub = client.get("/api/v1/smash-or-pass/rosters")
        assert "test-admin-roster" in [r["slug"] for r in hub.get_json()["data"]]

    def test_every_entity_gets_a_zeroed_stat_row(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        client.post("/api/v1/smash-or-pass/rosters", json=self._payload(), headers=admin_headers)

        roster = db_session.scalar(select(Roster).where(Roster.slug == "test-admin-roster"))
        entities = db_session.scalars(select(Entity).where(Entity.roster_id == roster.id)).all()
        assert len(entities) == 2
        for entity in entities:
            stat = db_session.scalar(select(EntityStat).where(EntityStat.entity_id == entity.id))
            assert stat is not None
            assert stat.smash_count == 0 and stat.pass_count == 0 and stat.super_smash_count == 0
            assert stat.total_votes == 0
            assert stat.chaos_rating == 50.0

    def test_deduplicates_slug_collisions_rather_than_overwriting(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        first = client.post("/api/v1/smash-or-pass/rosters", json=self._payload(), headers=admin_headers)
        assert first.status_code == 201

        second = client.post("/api/v1/smash-or-pass/rosters", json=self._payload(), headers=admin_headers)
        assert second.status_code == 201
        assert second.get_json()["data"]["slug"] == "test-admin-roster-2"

    def test_deduplicates_entity_slugs_within_the_same_roster(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json=self._payload(entities=[
                {"name": "Twin"}, {"name": "Twin"}, {"name": "Twin!"},
            ]),
            headers=admin_headers,
        )
        assert res.status_code == 201
        roster = db_session.scalar(select(Roster).where(Roster.slug == "test-admin-roster"))
        slugs = sorted(e.slug for e in db_session.scalars(select(Entity).where(Entity.roster_id == roster.id)).all())
        assert slugs == ["twin", "twin-2", "twin-3"]

    def test_writes_exactly_one_new_seed_file_without_touching_others(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        pre_existing = self.rosters_dir / "canon.json"
        pre_existing.write_text('{"rosters": []}', encoding="utf-8")

        res = client.post("/api/v1/smash-or-pass/rosters", json=self._payload(), headers=admin_headers)
        assert res.status_code == 201

        new_file = self.rosters_dir / "test-admin-roster.json"
        assert new_file.exists()
        written = json.loads(new_file.read_text(encoding="utf-8"))
        roster_data = written["rosters"][0]
        assert roster_data["slug"] == "test-admin-roster"
        assert len(roster_data["entities"]) == 2

        # The pre-existing file is untouched.
        assert json.loads(pre_existing.read_text(encoding="utf-8")) == {"rosters": []}

    def test_rejects_no_entities(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters", json=self._payload(entities=[]), headers=admin_headers
        )
        assert res.status_code == 400

    def test_rejects_missing_name(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters", json=self._payload(name=""), headers=admin_headers
        )
        assert res.status_code == 400

    def test_rejects_out_of_range_chaos_score(self, client: FlaskClient, admin_headers: dict[str, str]) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json=self._payload(entities=[{"name": "X", "chaos_score": 150}]),
            headers=admin_headers,
        )
        assert res.status_code == 400

    def test_drops_an_unsafe_media_url_instead_of_failing_the_whole_request(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json=self._payload(entities=[{"name": "X", "media_url": "javascript:alert(1)"}]),
            headers=admin_headers,
        )
        assert res.status_code == 201
        assert res.get_json()["data"]["entities"][0]["media_url"] is None

    def test_translations_round_trip_for_roster_and_entities(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json=self._payload(
                translations={"de": {"name": "Test Roster DE", "description": "Beschreibung"}},
                entities=[
                    {
                        "name": "Alpha Entity",
                        "tagline": "Hello",
                        "translations": {"de": {"tagline": "Hallo"}, "es": {"tagline": "Hola"}},
                    },
                ],
            ),
            headers=admin_headers,
        )
        assert res.status_code == 201
        slug = res.get_json()["data"]["slug"]

        default = client.get(f"/api/v1/smash-or-pass/rosters?lang=en").get_json()["data"]
        row_en = next(r for r in default if r["slug"] == slug)
        assert row_en["name"] == "Test Admin Roster"

        localized = client.get("/api/v1/smash-or-pass/rosters?lang=de").get_json()["data"]
        row_de = next(r for r in localized if r["slug"] == slug)
        assert row_de["name"] == "Test Roster DE"
        assert row_de["description"] == "Beschreibung"

        feed = client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed?session_id=s1&lang=de").get_json()["data"]
        entity = feed["entities"][0]
        assert entity["metadata"]["tagline"] == "Hallo"

        feed_es = client.get(f"/api/v1/smash-or-pass/rosters/{slug}/feed?session_id=s2&lang=es").get_json()["data"]
        assert feed_es["entities"][0]["metadata"]["tagline"] == "Hola"

    def test_unknown_locale_and_unknown_translation_field_are_dropped(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json=self._payload(
                entities=[
                    {
                        "name": "Alpha Entity",
                        "translations": {
                            "fr": {"tagline": "Bonjour"},
                            "de": {"tagline": "Hallo", "not_a_real_field": "nope"},
                        },
                    },
                ],
            ),
            headers=admin_headers,
        )
        assert res.status_code == 201
        entity = res.get_json()["data"]["entities"][0]
        assert "fr" not in entity["metadata"]["translations"]
        assert entity["metadata"]["translations"]["de"] == {"tagline": "Hallo"}
