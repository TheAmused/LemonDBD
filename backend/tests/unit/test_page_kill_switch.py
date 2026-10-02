# backend/tests/unit/test_page_kill_switch.py
"""Per-page kill switch: admin endpoints, public status, and the API guard."""
import pytest

from app.core.extensions import db
from app.core.page_guard import page_for_blueprint, register_page_blueprint
from app.core.security import generate_token
from app.models.user import User
from app.utils.site_settings_spec import is_page_id, parse_pages, validate_setting

pytestmark = pytest.mark.unit


@pytest.fixture
def tokens(app, test_db):
    admin = User(username="pg_admin", email="pg_admin@example.com", password_hash="x", role="admin", is_verified=True)
    user = User(username="pg_user", email="pg_user@example.com", password_hash="x", role="user", is_verified=True)
    db.session.add_all([admin, user])
    db.session.commit()
    return {"admin": generate_token(admin.id, role="admin"), "user": generate_token(user.id, role="user")}


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class TestSpec:
    def test_parse_pages_normalises(self) -> None:
        assert parse_pages("maps, perks,maps") == ["maps", "perks"]
        assert parse_pages(None) == [] and parse_pages("") == []

    def test_any_slug_is_a_page_but_garbage_is_not(self) -> None:
        assert is_page_id("brand-new-page") and is_page_id("a1")
        for bad in ("", "-x", "Perks", "a b", "../x", "x" * 60, 3, None):
            assert not is_page_id(bad)
        with pytest.raises(ValueError):
            parse_pages("perks,Not A Slug")
        with pytest.raises(ValueError):
            validate_setting("disabled_pages", "no spaces")

    def test_every_page_blueprint_is_attached(self, app) -> None:
        attached = {
            "tier_lists": "tier-lists",
            "minigames": "minigames",
            "smash_or_pass": "smash-or-pass",
            "smash_alias": "smash-or-pass",
            "page_streak": "streaks",
            "gauntlet_streak": "streaks",
            "chaos_streak": "streaks",
            "history_streak": "streaks",
            "challenge_completions": "streaks",
        }
        for name, page in attached.items():
            assert page_for_blueprint(app, name) == page, name
        assert page_for_blueprint(app, "perks") is None
        assert page_for_blueprint(app, None) is None

    def test_register_rejects_a_bad_page(self, app) -> None:
        from flask import Blueprint

        with pytest.raises(ValueError):
            register_page_blueprint(app, Blueprint("x", __name__), page="Bad Page")


class TestEndpoints:
    def test_status_is_public_and_uncached(self, client) -> None:
        res = client.get("/api/v1/site/pages")
        assert res.status_code == 200
        body = res.get_json()
        assert body["disabled"] == [] and body["viewer_is_admin"] is False
        assert res.headers["Cache-Control"] == "no-store"

    def test_only_admins_can_switch(self, client, tokens) -> None:
        assert client.put("/api/v1/admin/pages/maps", json={"disabled": True}).status_code == 401
        res = client.put("/api/v1/admin/pages/maps", json={"disabled": True}, headers=_auth(tokens["user"]))
        assert res.status_code == 403

    def test_switch_roundtrip_and_validation(self, client, tokens) -> None:
        admin = _auth(tokens["admin"])
        assert client.put("/api/v1/admin/pages/Not%20Valid", json={"disabled": True}, headers=admin).status_code == 400
        assert client.put("/api/v1/admin/pages/maps", json={"disabled": "yes"}, headers=admin).status_code == 400

        res = client.put("/api/v1/admin/pages/maps", json={"disabled": True}, headers=admin)
        assert res.status_code == 200
        assert res.get_json()["disabled"] == ["maps"]
        assert client.put("/api/v1/admin/pages/a-future-page", json={"disabled": True}, headers=admin).status_code == 200
        assert client.get("/api/v1/site/pages").get_json()["disabled"] == ["a-future-page", "maps"]
        client.put("/api/v1/admin/pages/a-future-page", json={"disabled": False}, headers=admin)
        assert client.get("/api/v1/site/pages").get_json()["disabled"] == ["maps"]

        client.put("/api/v1/admin/pages/maps", json={"disabled": False}, headers=admin)
        assert client.get("/api/v1/site/pages").get_json()["disabled"] == []

    def test_status_reports_admin_viewer(self, client, tokens) -> None:
        res = client.get("/api/v1/site/pages", headers=_auth(tokens["admin"]))
        assert res.get_json()["viewer_is_admin"] is True


class TestMasterSwitch:
    def test_env_flag_turns_the_whole_system_off(self, app, client, tokens) -> None:
        admin = _auth(tokens["admin"])
        client.put("/api/v1/admin/pages/tier-lists", json={"disabled": True}, headers=admin)
        assert client.get("/api/v1/tier-lists/official").status_code == 403

        app.config["PAGE_KILL_SWITCHES_ENABLED"] = False
        try:
            status = client.get("/api/v1/site/pages").get_json()
            assert status["enabled"] is False and status["disabled"] == []
            assert client.get("/api/v1/tier-lists/official").status_code != 403
            stored = client.get("/api/v1/admin/pages", headers=admin).get_json()
            assert stored["enabled"] is False
            assert stored["disabled"] == ["tier-lists"]
        finally:
            app.config["PAGE_KILL_SWITCHES_ENABLED"] = True


class TestApiGuard:
    def test_blocks_guests_and_users_but_not_admins(self, client, tokens) -> None:
        admin = _auth(tokens["admin"])
        assert client.get("/api/v1/tier-lists/official").status_code != 403

        client.put("/api/v1/admin/pages/tier-lists", json={"disabled": True}, headers=admin)

        guest = client.get("/api/v1/tier-lists/official")
        assert guest.status_code == 403
        assert guest.get_json()["code"] == "page_disabled" and guest.get_json()["page"] == "tier-lists"
        assert client.get("/api/v1/tier-lists/official", headers=_auth(tokens["user"])).status_code == 403
        assert client.get("/api/v1/tier-lists/official", headers=admin).status_code != 403

    def test_unrelated_endpoints_stay_reachable(self, client, tokens) -> None:
        admin = _auth(tokens["admin"])
        client.put("/api/v1/admin/pages/tier-lists", json={"disabled": True}, headers=admin)
        assert client.get("/api/v1/site/pages").status_code == 200
        assert client.get("/api/v1/changelog").status_code != 403
