# backend/tests/unit/api/test_admin_tools_and_switches.py
"""Admin Tools (system status, run-now maintenance, delivery tests), the on/off site switches,
the admin's edit of an account and the audit-log filter."""
from unittest.mock import patch

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.security import generate_token
from app.models import AdminAuditLog, BugReport, User
from app.services import site_settings
from app.utils.site_settings_spec import validate_setting


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


@pytest.fixture
def admin(db_session) -> User:
    user = User(login="tools_admin", username="tools_admin", email="tools_admin@example.com", password_hash="h", role="admin")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def player(db_session) -> User:
    user = User(login="tools_player", username="tools_player", email="tools_player@example.com", password_hash="h")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.mark.unit
class TestBoolSettings:
    def test_validate_bool(self) -> None:
        for raw in (True, "true", "1", 1, "on", " YES "):
            assert validate_setting("registration_open", raw) is True
        for raw in (False, "false", "0", 0, "off", "no"):
            assert validate_setting("registration_open", raw) is False
        for bad in ("maybe", None, 2.5, ""):
            with pytest.raises(ValueError):
                validate_setting("registration_open", bad)

    def test_round_trip_through_the_api(self, client: FlaskClient, admin: User) -> None:
        res = client.put("/api/v1/admin/settings", headers=_headers(admin), json={"settings": {"registration_open": False}})
        assert res.status_code == 200
        row = next(r for r in res.get_json()["settings"] if r["key"] == "registration_open")
        assert row == {**row, "kind": "bool", "group": "access", "value": False, "default": True, "overridden": True}
        assert site_settings.registration_open() is False

        client.put("/api/v1/admin/settings", headers=_headers(admin), json={"settings": {"registration_open": None}})
        assert site_settings.registration_open() is True


@pytest.mark.unit
class TestRegistrationSwitch:
    def test_closed_registration_refuses_sign_up_but_not_admin_creation(self, client: FlaskClient, admin: User) -> None:
        site_settings.update_settings({"registration_open": False})
        body = {"login": "newbie", "username": "newbie", "email": "newbie@example.com", "password": "secret123"}

        res = client.post("/api/v1/auth/register", json=body, headers={"Accept-Language": "pl"})
        assert res.status_code == 403
        assert res.get_json()["error_code"] == "registration_closed"

        res = client.post("/api/v1/users", json=body, headers=_headers(admin))
        assert res.status_code == 201


@pytest.mark.unit
class TestBugReportSwitches:
    def test_guests_refused_when_switched_off(self, client: FlaskClient, player: User) -> None:
        site_settings.update_settings({"guest_bug_reports": False})
        body = {"title": "Broken", "message": "It broke", "reporter_email": "g@example.com"}
        res = client.post("/api/v1/bug-reports", json=body)
        assert res.status_code == 403
        assert res.get_json()["error_code"] == "guest_bug_reports_closed"

        with patch("app.routes.bug_reports.discord_webhook.announce_bug_report") as announce:
            res = client.post("/api/v1/bug-reports", json=body, headers=_headers(player))
        assert res.status_code == 201
        announce.assert_called_once()

    def test_discord_announcement_follows_the_switch(self, client: FlaskClient, player: User) -> None:
        site_settings.update_settings({"bug_report_discord": False})
        with patch("app.routes.bug_reports.discord_webhook.announce_bug_report") as announce:
            res = client.post("/api/v1/bug-reports", json={"title": "A", "message": "B"}, headers=_headers(player))
        assert res.status_code == 201
        announce.assert_not_called()


@pytest.mark.unit
class TestAdminEditUser:
    def test_rename_and_verify(self, client: FlaskClient, admin: User, player: User, db_session) -> None:
        player.is_verified = False
        player.verification_code = "123456"
        db_session.commit()

        res = client.put(f"/api/v1/users/{player.id}", headers=_headers(admin), json={"username": "  Renamed  ", "is_verified": True})
        assert res.status_code == 200
        db_session.refresh(player)
        assert player.username == "Renamed"
        assert player.is_verified is True and player.verification_code is None

        log = db_session.query(AdminAuditLog).filter_by(action="user_updated").one()
        assert '"username"' in log.details and '"is_verified"' in log.details

    def test_cannot_demote_yourself(self, client: FlaskClient, admin: User) -> None:
        res = client.put(f"/api/v1/users/{admin.id}", headers=_headers(admin), json={"role": "user"})
        assert res.status_code == 400

    def test_ignores_fields_it_does_not_manage(self, client: FlaskClient, admin: User, player: User) -> None:
        res = client.put(f"/api/v1/users/{player.id}", headers=_headers(admin), json={"email": "x@example.com"})
        assert res.status_code == 200
        assert res.get_json()["user"]["email"] == "tools_player@example.com"


@pytest.mark.unit
class TestMaintenance:
    def test_lists_jobs(self, client: FlaskClient, admin: User) -> None:
        keys = [j["key"] for j in client.get("/api/v1/admin/maintenance", headers=_headers(admin)).get_json()["jobs"]]
        assert keys == ["streak_inactivity", "content_evidence", "sanction_emails", "ban_list", "catalog_cache"]

    def test_runs_a_job_and_audits_it(self, client: FlaskClient, admin: User, db_session) -> None:
        res = client.post("/api/v1/admin/maintenance/catalog_cache", headers=_headers(admin))
        assert res.status_code == 200
        data = res.get_json()
        assert data["key"] == "catalog_cache" and data["affected"] == 0
        assert data["last_run"]["last_trigger"] == "admin"
        log = db_session.query(AdminAuditLog).filter_by(action="maintenance_run").one()
        assert log.target_type == "maintenance" and log.target_id == "catalog_cache"

    def test_unknown_job(self, client: FlaskClient, admin: User) -> None:
        assert client.post("/api/v1/admin/maintenance/nope", headers=_headers(admin)).status_code == 404

    def test_admin_only(self, client: FlaskClient, player: User) -> None:
        for method, url in (
            ("get", "/api/v1/admin/system"),
            ("get", "/api/v1/admin/maintenance"),
            ("post", "/api/v1/admin/maintenance/catalog_cache"),
            ("post", "/api/v1/admin/diagnostics/email"),
            ("post", "/api/v1/admin/diagnostics/discord"),
        ):
            assert getattr(client, method)(url, headers=_headers(player)).status_code == 403
            assert getattr(client, method)(url).status_code == 401


@pytest.mark.unit
class TestSystemAndDiagnostics:
    def test_system_status_reports_every_check(self, client: FlaskClient, admin: User) -> None:
        checks = client.get("/api/v1/admin/system", headers=_headers(admin)).get_json()["checks"]
        by_key = {c["key"]: c for c in checks}
        assert list(by_key) == ["database", "cache", "mail", "discord", "ocr", "scheduler", "email_verification", "altcha", "ban_list"]
        assert by_key["database"]["state"] == "ok" and by_key["database"]["latency_ms"] >= 0
        assert by_key["scheduler"]["state"] == "off"  # nothing has run on a schedule yet
        assert all(c["state"] in {"ok", "warn", "off", "error"} for c in checks)

    def test_test_email_goes_to_the_admin(self, client: FlaskClient, admin: User) -> None:
        with patch("app.routes.admin_tools.send_test_email") as send:
            res = client.post("/api/v1/admin/diagnostics/email", headers=_headers(admin))
        assert res.status_code == 200 and res.get_json() == {"sent_to": "tools_admin@example.com"}
        assert send.call_args.args[0].id == admin.id

    def test_test_email_failure_is_reported(self, client: FlaskClient, admin: User) -> None:
        with patch("app.routes.admin_tools.send_test_email", side_effect=OSError("SMTP down")):
            res = client.post("/api/v1/admin/diagnostics/email", headers=_headers(admin))
        assert res.status_code == 502

    def test_discord_without_webhook(self, client: FlaskClient, admin: User) -> None:
        with patch("app.routes.admin_tools.discord_webhook.webhook_url", return_value=None):
            assert client.post("/api/v1/admin/diagnostics/discord", headers=_headers(admin)).status_code == 409

    def test_discord_posts_a_test_embed(self, client: FlaskClient, admin: User) -> None:
        with patch("app.routes.admin_tools.discord_webhook.webhook_url", return_value="https://discord.test/hook"), patch(
            "app.routes.admin_tools.discord_webhook.post_embed", return_value=204
        ) as post:
            res = client.post("/api/v1/admin/diagnostics/discord", headers=_headers(admin))
        assert res.status_code == 200
        assert "tools_admin" in post.call_args.args[0]["description"]


@pytest.mark.unit
class TestSchedulerHeartbeat:
    def test_scheduled_runs_are_recorded_and_make_the_scheduler_look_alive(self, client: FlaskClient, admin: User) -> None:
        from app.services.maintenance_jobs import run_scheduled

        run_scheduled("ban_list")
        jobs = {j["key"]: j for j in client.get("/api/v1/admin/maintenance", headers=_headers(admin)).get_json()["jobs"]}
        assert jobs["ban_list"]["last_run"]["last_trigger"] == "schedule"
        assert jobs["streak_inactivity"]["last_run"] is None

        checks = {c["key"]: c for c in client.get("/api/v1/admin/system", headers=_headers(admin)).get_json()["checks"]}
        assert checks["scheduler"]["state"] == "ok" and checks["scheduler"]["last_run_at"]

    def test_an_old_heartbeat_is_a_warning(self, client: FlaskClient, admin: User, db_session) -> None:
        from datetime import datetime, timedelta, timezone

        from app.models import MaintenanceJobRun

        db_session.add(MaintenanceJobRun(key="sanction_emails", last_trigger="schedule", last_run_at=datetime.now(timezone.utc) - timedelta(hours=5)))
        db_session.commit()
        checks = {c["key"]: c for c in client.get("/api/v1/admin/system", headers=_headers(admin)).get_json()["checks"]}
        assert checks["scheduler"]["state"] == "warn"


@pytest.mark.unit
class TestAuditFilter:
    def test_filters_by_target_type(self, client: FlaskClient, admin: User, db_session) -> None:
        db_session.add_all([
            AdminAuditLog(admin_user_id=admin.id, action="user_deleted", target_type="user", target_id="5"),
            AdminAuditLog(admin_user_id=admin.id, action="perk_disabled", target_type="perk", target_id="9"),
            AdminAuditLog(admin_user_id=admin.id, action="character_enabled", target_type="character", target_id="2"),
        ])
        db_session.commit()

        data = client.get("/api/v1/admin/audit-logs?target_type=perk,character", headers=_headers(admin)).get_json()
        assert data["total"] == 2
        assert {log["action"] for log in data["logs"]} == {"perk_disabled", "character_enabled"}
        assert client.get("/api/v1/admin/audit-logs", headers=_headers(admin)).get_json()["total"] == 3


@pytest.mark.unit
class TestAvailabilityLists:
    def test_perk_list_answers_with_each_perks_role(self, client: FlaskClient, admin: User, db_session) -> None:
        from app.models import Perk

        db_session.add(Perk(name="Kindred", role="Survivor"))
        db_session.commit()
        res = client.get("/api/v1/admin/perks?category=Survivor", headers=_headers(admin))
        assert res.status_code == 200
        row = next(p for p in res.get_json()["data"] if p["name"] == "Kindred")
        assert row["category"] == "Survivor" and row["is_disabled"] is False

    def test_challenge_modes_are_created_once_even_if_rows_appear_meanwhile(self, client: FlaskClient, admin: User) -> None:
        first = client.get("/api/v1/admin/challenge-modes", headers=_headers(admin)).get_json()["modes"]
        second = client.get("/api/v1/admin/challenge-modes", headers=_headers(admin)).get_json()["modes"]
        assert [m["mode"] for m in first] == [m["mode"] for m in second] == ["gauntlet", "chaos", "history", "page_streak"]


@pytest.mark.unit
class TestBugQueueUntouched:
    def test_bug_list_still_counts_statuses(self, client: FlaskClient, admin: User, db_session) -> None:
        db_session.add(BugReport(reporter_name="x", title="t", message="m", status="in_progress"))
        db_session.commit()
        stats = client.get("/api/v1/admin/bug-reports", headers=_headers(admin)).get_json()["stats"]
        assert stats["in_progress"] == 1 and stats["total"] == 1
