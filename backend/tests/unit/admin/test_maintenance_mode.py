# backend/tests/unit/admin/test_maintenance_mode.py
"""Maintenance mode: the switch and its window, who still gets through, and the admin endpoints."""
from datetime import datetime, timedelta, timezone

import pytest
from flask.testing import FlaskClient

from app.core.security import generate_token
from app.models import AdminAuditLog, User
from app.services import maintenance_mode, site_settings

ADMIN_URL = "/api/v1/admin/maintenance-mode"
VISITOR = {"X-Real-IP": "203.0.113.9"}


def _iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).strftime("%Y-%m-%dT%H:%M:%SZ")


def _headers(user: User, extra: dict[str, str] | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}", **(extra or {})}


@pytest.fixture
def admin(db_session) -> User:
    user = User(login="mm_admin", username="mm_admin", email="mm_admin@example.com", password_hash="h", role="admin")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def player(db_session) -> User:
    user = User(login="mm_player", username="mm_player", email="mm_player@example.com", password_hash="h")
    db_session.add(user)
    db_session.commit()
    return user


def _switch(enabled: bool, starts_at: str | None = None, until: str | None = None):
    return maintenance_mode.save_window(enabled=enabled, starts_at=starts_at, until=until)


@pytest.mark.unit
class TestState:
    def test_off_by_default(self, app) -> None:
        state = maintenance_mode.current_state()
        assert (state.status, state.active) == ("off", False)

    def test_switched_on_without_a_window_is_active(self, app) -> None:
        assert _switch(True).status == "active"

    def test_a_future_start_is_scheduled_and_a_past_start_is_active(self, app) -> None:
        assert _switch(True, starts_at=_iso(timedelta(hours=2))).status == "scheduled"
        assert _switch(True, starts_at=_iso(timedelta(hours=-1)), until=_iso(timedelta(hours=1))).status == "active"

    def test_the_window_opens_and_closes_by_the_clock(self, app) -> None:
        _switch(True, starts_at=_iso(timedelta(hours=1)), until=_iso(timedelta(hours=2)))
        now = datetime.now(timezone.utc)
        assert maintenance_mode.current_state(now).status == "scheduled"
        assert maintenance_mode.current_state(now + timedelta(minutes=90)).status == "active"
        assert maintenance_mode.current_state(now + timedelta(hours=3)).status == "ended"

    def test_switching_off_forgets_the_window(self, app) -> None:
        _switch(True, starts_at=_iso(timedelta(hours=1)), until=_iso(timedelta(hours=2)))
        state = _switch(False)
        assert (state.status, state.starts_at, state.until) == ("off", None, None)

    @pytest.mark.parametrize(
        "start_hours, end_hours",
        [(2, 1), (None, -1), ("not a date", None)],
        ids=["end before start", "end in the past", "not a date"],
    )
    def test_an_invalid_window_is_refused(self, app, start_hours: int | str | None, end_hours: int | None) -> None:
        starts_at = _iso(timedelta(hours=start_hours)) if isinstance(start_hours, int) else start_hours
        until = _iso(timedelta(hours=end_hours)) if end_hours is not None else None
        with pytest.raises(ValueError):
            _switch(True, starts_at=starts_at, until=until)
        assert maintenance_mode.current_state().status == "off"


@pytest.mark.unit
class TestGate:
    def test_nothing_changes_while_the_mode_is_off(self, client: FlaskClient) -> None:
        assert client.get("/api/v1/health", headers=VISITOR).status_code == 200
        assert client.get("/api/v1/site-config", headers=VISITOR).status_code == 200

    def test_a_visitor_gets_503_with_when_it_ends(self, client: FlaskClient, app) -> None:
        until = _iso(timedelta(hours=1))
        _switch(True, until=until)
        response = client.get("/api/v1/perks", headers=VISITOR)
        assert response.status_code == 503
        body = response.get_json()
        assert body["maintenance"] is True and body["until"] == until
        assert int(response.headers["Retry-After"]) > 0
        assert response.headers["Cache-Control"] == "no-store"

    def test_a_scheduled_start_does_not_block_yet(self, client: FlaskClient, app) -> None:
        _switch(True, starts_at=_iso(timedelta(hours=1)))
        assert client.get("/api/v1/health", headers=VISITOR).status_code == 200

    def test_sign_in_admin_and_public_config_stay_open(self, client: FlaskClient, app, admin) -> None:
        _switch(True)
        assert client.get("/api/v1/site-config", headers=VISITOR).status_code == 200
        assert client.get("/api/v1/health", headers=VISITOR).status_code == 200
        assert client.get("/api/v1/auth/me", headers=VISITOR).status_code != 503
        assert client.post("/api/v1/auth/login", headers=VISITOR, json={}).status_code != 503
        assert client.get(ADMIN_URL, headers=VISITOR).status_code == 401  # reaches the admin check, not the gate

    def test_registering_stays_closed(self, client: FlaskClient, app) -> None:
        _switch(True)
        assert client.post("/api/v1/auth/register", headers=VISITOR, json={}).status_code == 503

    def test_signing_up_with_google_stays_closed_but_its_config_stays_open(self, client: FlaskClient, app) -> None:
        _switch(True)
        assert client.post("/api/v1/auth/google", headers=VISITOR, json={}).status_code == 503
        assert client.get("/api/v1/auth/google/config", headers=VISITOR).status_code != 503

    def test_a_signed_in_admin_gets_through_from_any_address(self, client: FlaskClient, app, admin) -> None:
        _switch(True)
        assert client.get("/api/v1/perks", headers=_headers(admin, VISITOR)).status_code != 503

    def test_a_signed_in_player_does_not(self, client: FlaskClient, app, player) -> None:
        _switch(True)
        assert client.get("/api/v1/perks", headers=_headers(player, VISITOR)).status_code == 503

    def test_the_frontend_server_without_a_client_address_gets_through(self, client: FlaskClient, app) -> None:
        _switch(True)
        assert client.get("/api/v1/perks").status_code != 503

    def test_the_status_endpoint_says_whether_this_caller_is_blocked(self, client: FlaskClient, app, admin) -> None:
        url = "/api/v1/site-config/maintenance"
        assert client.get(url, headers=VISITOR).get_json()["blocked"] is False
        _switch(True)
        body = client.get(url, headers=VISITOR).get_json()
        assert (body["active"], body["blocked"], body["status"]) == (True, True, "active")
        assert client.get(url, headers=_headers(admin, VISITOR)).get_json()["blocked"] is False


@pytest.mark.unit
class TestAdminEndpoints:
    def test_only_admins_may_use_them(self, client: FlaskClient, player) -> None:
        assert client.get(ADMIN_URL).status_code == 401
        assert client.get(ADMIN_URL, headers=_headers(player)).status_code == 403
        assert client.put(ADMIN_URL, headers=_headers(player), json={"enabled": True}).status_code == 403

    def test_an_admin_reads_the_state(self, client: FlaskClient, admin) -> None:
        body = client.get(ADMIN_URL, headers=_headers(admin)).get_json()
        assert (body["status"], body["enabled"]) == ("off", False)

    def test_start_schedule_and_stop_are_audited(self, client: FlaskClient, admin, db_session) -> None:
        headers = _headers(admin)
        started = client.put(ADMIN_URL, headers=headers, json={"enabled": True}).get_json()
        assert started["status"] == "active"

        until = _iso(timedelta(hours=3))
        scheduled = client.put(ADMIN_URL, headers=headers, json={"enabled": True, "starts_at": _iso(timedelta(hours=1)), "until": until}).get_json()
        assert scheduled["status"] == "scheduled" and scheduled["until"] == until

        stopped = client.put(ADMIN_URL, headers=headers, json={"enabled": False}).get_json()
        assert stopped["status"] == "off"
        actions = db_session.query(AdminAuditLog).filter_by(action="maintenance_mode_updated").count()
        assert actions == 3

    def test_a_bad_window_answers_400(self, client: FlaskClient, admin) -> None:
        headers = _headers(admin)
        assert client.put(ADMIN_URL, headers=headers, json={}).status_code == 400
        bad = client.put(ADMIN_URL, headers=headers, json={"enabled": True, "starts_at": _iso(timedelta(hours=2)), "until": _iso(timedelta(hours=1))})
        assert bad.status_code == 400 and "after the start" in bad.get_json()["error"]

    def test_the_settings_tab_does_not_list_the_maintenance_keys(self, app) -> None:
        assert not {row["key"] for row in site_settings.list_settings()} & {"maintenance_enabled", "maintenance_starts_at", "maintenance_until"}
