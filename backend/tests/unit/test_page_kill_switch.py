# backend/tests/unit/test_page_kill_switch.py
"""Per-page kill switch: admin endpoints, public status, and the API guard."""
import pytest

from app.core.extensions import db
from app.core.page_guard import PAGE_API_PREFIXES, page_for_path
from app.core.security import generate_token
from app.models.user import User
from app.utils.site_settings_spec import PAGE_IDS, parse_pages, validate_setting

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
        assert parse_pages("maps, perks,maps") == ["perks", "maps"]
        assert parse_pages(None) == [] and parse_pages("") == []

    def test_unknown_page_rejected(self) -> None:
        with pytest.raises(ValueError):
            parse_pages("perks,nope")
        with pytest.raises(ValueError):
            validate_setting("disabled_pages", "nope")

    def test_every_guarded_prefix_maps_to_a_known_page(self) -> None:
        assert {page for _, page in PAGE_API_PREFIXES} <= set(PAGE_IDS)

    def test_prefix_match_is_exact_on_segments(self) -> None:
        assert page_for_path("/api/v1/tier-lists/3") == "tier-lists"
        assert page_for_path("/api/v1/smash") == "smash-or-pass"
        assert page_for_path("/api/v1/smash-or-pass/roster") == "smash-or-pass"
        assert page_for_path("/api/v1/tier-listsx") is None
        assert page_for_path("/api/v1/perks") is None


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
        assert client.put("/api/v1/admin/pages/nope", json={"disabled": True}, headers=admin).status_code == 400
        assert client.put("/api/v1/admin/pages/maps", json={"disabled": "yes"}, headers=admin).status_code == 400

        res = client.put("/api/v1/admin/pages/maps", json={"disabled": True}, headers=admin)
        assert res.status_code == 200
        assert {p["id"]: p["disabled"] for p in res.get_json()["pages"]}["maps"] is True
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
            assert {p["id"]: p["disabled"] for p in stored["pages"]}["tier-lists"] is True
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
