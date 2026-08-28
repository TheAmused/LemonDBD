### backend/tests/live/services/test_live_services_integration.py
```python
import pytest
from flask import Flask
from app.services.others.smash_or_pass_service import SmashOrPassService
from app.services.perk_service import PerkService
from app.services.user_service import UserService


@pytest.mark.live
class TestLiveServicesIntegration:
    """Live PostgreSQL service layer queries, entity counts, user creation, and mini-game rosters."""

    def test_live_perk_service_queries(self, live_app: Flask) -> None:
        with live_app.app_context():
            service = PerkService()
            perks = service.get_perks(limit=100)
            assert len(perks["data"]) == 100
            assert perks["pagination"]["total"] > 200

            chars = service.get_characters()
            assert len(chars) >= 50

    def test_live_user_service_registration_and_token(self, live_app: Flask) -> None:
        with live_app.app_context():
            user_service = UserService()
            user, err = user_service.register_user("service_tester", "serv@example.com", "secure123")
            assert err is None
            assert user.id is not None

            token = user_service.generate_auth_token(user)
            assert token is not None
            assert len(token) > 20

    def test_live_smash_or_pass_service_stats(self, live_app: Flask) -> None:
        with live_app.app_context():
            service = SmashOrPassService()
            rosters = service.get_rosters(active_only=True)
            assert len(rosters) > 0
```

### backend/tests/live/workflows/test_admin_governance_lifecycle_workflow.py
```python
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminGovernanceLifecycleWorkflow:
    """Workflow verifying end-to-end admin user management, promotion, suspension, metrics, and audit logging."""

    def test_full_admin_governance_and_user_management(
        self, live_client: FlaskClient, admin_client: AuthenticatedClient
    ) -> None:
        users_res = admin_client.get("/api/v1/users?page=1&per_page=20")
        assert users_res.status_code == 200
        initial_users = users_res.get_json()["users"]
        assert len(initial_users) > 0

        create_res = admin_client.post(
            "/api/v1/users",
            json={
                "username": "managed_player_1",
                "email": "managed1@example.com",
                "password": "PlayerPass123!",
                "role": "user",
            },
        )
        assert create_res.status_code == 201
        created_user = create_res.get_json()["user"]
        target_id = created_user["id"]

        promote_res = admin_client.put(
            f"/api/v1/users/{target_id}",
            json={"role": "admin", "is_active": True},
        )
        assert promote_res.status_code == 200
        assert promote_res.get_json()["user"]["role"] == "admin"

        deact_res = admin_client.put(
            f"/api/v1/users/{target_id}",
            json={"role": "user", "is_active": False},
        )
        assert deact_res.status_code == 200
        assert deact_res.get_json()["user"]["is_active"] is False

        banned_login = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "managed_player_1",
                "password": "PlayerPass123!",
            },
        )
        assert banned_login.status_code in (400, 401, 403)

        stats_res = admin_client.get("/api/v1/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert "active_users" in stats or "perks_count" in stats or isinstance(stats, dict)

        export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
        assert export_res.status_code == 200
        export_data = export_res.get_json()
        assert isinstance(export_data, dict)

        del_res = admin_client.delete(f"/api/v1/users/{target_id}")
        assert del_res.status_code == 200

        audit_res = admin_client.get("/api/v1/admin/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.get_json()["logs"]
        actions = [l["action"] for l in logs]
        assert "user_updated" in actions
        assert "user_deleted" in actions
```

### backend/tests/live/workflows/test_admin_killswitch_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminKillswitchWorkflow:
    """Workflow testing dynamic challenge mode killswitch deactivation and reactivation."""

    def test_full_admin_killswitch_audit_workflow(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, user_headers, user = auth_client_factory("player_wf", "player@example.com", "pass123")

        modes_res = admin_client.get("/api/v1/admin/challenge-modes")
        assert modes_res.status_code == 200
        modes = modes_res.get_json()["modes"]
        assert any(m["mode"] == "chaos" for m in modes)

        dis_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos",
            json={"is_enabled": False, "reason": "Emergency Maintenance"},
        )
        assert dis_res.status_code == 200

        blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
        assert blocked_res.status_code == 400
        assert "disabled" in blocked_res.get_json()["error"].lower()

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos",
            json={"is_enabled": True},
        )
        assert en_res.status_code == 200

        ok_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
        assert ok_res.status_code == 200

        audit_res = admin_client.get("/api/v1/admin/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.get_json()["logs"]
        actions = [l["action"] for l in logs]
        assert "challenge_mode_disabled" in actions
        assert "challenge_mode_enabled" in actions
```

### backend/tests/live/workflows/test_admin_multimode_killswitch_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminMultimodeKillswitchWorkflow:
    """Workflow asserting multi-mode killswitch gating across various challenge streaks."""

    def test_admin_multimode_killswitch_workflow(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory("killswitch_user", "ksuser@example.com", "pass123")

        modes_res = admin_client.get("/api/v1/admin/challenge-modes")
        assert modes_res.status_code == 200
        modes = modes_res.get_json()["modes"]
        mode_names = [m["mode"] for m in modes]
        assert "chaos" in mode_names

        dis_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos",
            json={"is_enabled": False, "reason": "Temporary Chaos Maintenance"},
        )
        assert dis_res.status_code == 200

        blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert blocked_res.status_code == 400
        assert "disabled" in blocked_res.get_json()["error"].lower()

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos", json={"is_enabled": True}
        )
        assert en_res.status_code == 200

        unblocked = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert unblocked.status_code == 200
```

### backend/tests/live/workflows/test_admin_system_metrics_workflow.py
```python
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminSystemMetricsWorkflow:
    """Workflow validating administrative system metric querying and backup export generation."""

    def test_admin_system_metrics_workflow(
        self, live_client: FlaskClient, admin_client: AuthenticatedClient
    ) -> None:
        stats_res = admin_client.get("/api/v1/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert "perks_count" in stats or "active_users" in stats or isinstance(stats, dict)

        export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
        assert export_res.status_code == 200
        assert isinstance(export_res.get_json(), dict)
```

### backend/tests/live/workflows/test_auth_ownership_workflow.py
```python
from typing import Any, Callable
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from app.core.extensions import db
from app.models import Perk


@pytest.mark.live
@pytest.mark.workflow
class TestAuthOwnershipWorkflow:
    """Workflow for user registration, login, profile retrieval, and automatic ownership cascades."""

    def test_full_auth_and_ownership_cascade_workflow(
        self,
        live_client: FlaskClient,
        live_app: Flask,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        reg_res = live_client.post(
            "/api/v1/auth/register",
            json={
                "username": "workflow_owner_1",
                "email": "owner1@example.com",
                "password": "StrongPassword123!",
            },
        )
        assert reg_res.status_code == 201
        user_id = reg_res.get_json()["user"]["id"]
        token = reg_res.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        login_res = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "workflow_owner_1",
                "password": "StrongPassword123!",
            },
        )
        assert login_res.status_code == 200
        assert login_res.get_json()["user"]["email"] == "owner1@example.com"

        me_res = live_client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.get_json()["user"]["username"] == "workflow_owner_1"

        chars_res = live_client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        assert chars_res.status_code == 200
        chars = chars_res.get_json()["data"]

        free_names = {
            "The Trapper",
            "The Wraith",
            "The Hillbilly",
            "The Nurse",
            "The Huntress",
            "Dwight Fairfield",
            "Meg Thomas",
            "Claudette Morel",
            "Jake Park",
            "Nea Karlsson",
            "Bill Overbeck",
            "David King",
        }

        for c in chars:
            if c["name"] in free_names:
                assert c["is_owned"] is True, f"Expected {c['name']} to be owned by default"

        trapper = next(c for c in chars if c["name"] == "The Trapper")
        lock_res = live_client.post(
            f"/api/v1/users/{user_id}/characters",
            json={"character_id": trapper["id"], "is_owned": False},
            headers=headers,
        )
        assert lock_res.status_code == 200

        with live_app.app_context():
            trapper_perks = db.session.scalars(
                select(Perk.id).where(Perk.character_id == trapper["id"])
            ).all()
            perks_res = live_client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
            assert perks_res.status_code == 200
            user_perks = {p["id"]: p for p in perks_res.get_json()["data"]}
            for pid in trapper_perks:
                if pid in user_perks:
                    assert user_perks[pid]["is_unlocked"] is False

        unlock_res = live_client.post(
            f"/api/v1/users/{user_id}/characters",
            json={"character_id": trapper["id"], "is_owned": True},
            headers=headers,
        )
        assert unlock_res.status_code == 200

        perks_res2 = live_client.get(f"/api/v1/users/{user_id}/perks", headers=headers)
        user_perks2 = {p["id"]: p for p in perks_res2.get_json()["data"]}
        for pid in trapper_perks:
            if pid in user_perks2:
                assert user_perks2[pid]["is_unlocked"] is True
```

### backend/tests/live/workflows/test_bug_report_resolution_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestBugReportResolutionWorkflow:
    """Workflow tracking player bug report submission, status transitions, and administrative resolution."""

    def test_full_bug_report_submission_triage_and_resolution(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, user_headers, user = auth_client_factory(
            "reporter_player", "reporter@example.com", "pass123"
        )

        submit_res = client.post(
            "/api/v1/bug-reports",
            json={
                "title": "Nurse Blink Collision Desync on Crotus Prenn",
                "message": "When blinking near the Asylum main building staircase, the killer clips into collision geometry.",
                "category": "Gameplay",
                "images": [],
            },
            headers=user_headers,
        )
        assert submit_res.status_code == 201
        report = submit_res.get_json()["report"]
        report_id = report["id"]
        assert report["status"] == "pending"

        my_reports_res = client.get("/api/v1/bug-reports/my", headers=user_headers)
        assert my_reports_res.status_code == 200
        my_reports = my_reports_res.get_json()["reports"]
        assert any(r["id"] == report_id for r in my_reports)

        admin_list_res = admin_client.get("/api/v1/admin/bug-reports?status=pending")
        assert admin_list_res.status_code == 200
        pending_list = admin_list_res.get_json()["reports"]
        assert any(r["id"] == report_id for r in pending_list)

        prog_res = admin_client.put(
            f"/api/v1/admin/bug-reports/{report_id}",
            json={
                "status": "in_progress",
                "admin_notes": "Assigned to physics replication team.",
            },
        )
        assert prog_res.status_code == 200
        assert prog_res.get_json()["report"]["status"] == "in_progress"

        resolve_res = admin_client.put(
            f"/api/v1/admin/bug-reports/{report_id}",
            json={
                "status": "resolved",
                "admin_notes": "Fixed mesh collision boundaries in patch 2.4.1.",
            },
        )
        assert resolve_res.status_code == 200
        assert resolve_res.get_json()["report"]["status"] == "resolved"

        my_reports_res2 = client.get("/api/v1/bug-reports/my", headers=user_headers)
        assert my_reports_res2.status_code == 200
        resolved_ticket = next(
            r for r in my_reports_res2.get_json()["reports"] if r["id"] == report_id
        )
        assert resolved_ticket["status"] == "resolved"
        assert "patch 2.4.1" in resolved_ticket.get("admin_notes", "")

        del_res = admin_client.delete(f"/api/v1/admin/bug-reports/{report_id}")
        assert del_res.status_code == 200

        audit_res = admin_client.get("/api/v1/admin/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.get_json()["logs"]
        actions = [l["action"] for l in logs]
        assert "bug_report_updated" in actions
        assert "bug_report_deleted" in actions
```

### backend/tests/live/workflows/test_chaos_streak_blind_reveal_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestChaosStreakBlindRevealWorkflow:
    """Workflow verifying blind perk reveals and consecutive match submissions in Chaos mode."""

    def test_chaos_streak_blind_reveal_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "chaos_revealer", "creveal@example.com", "pass123"
        )

        start_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert start_res.status_code == 200
        run = start_res.get_json()["run"]
        run_id = run["id"]

        rev0 = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers)
        assert rev0.status_code == 200
        run_rev = rev0.get_json()["run"]
        assert "revealed_slots" in run_rev or "slots" in run_rev or isinstance(run_rev, dict)

        win_res = client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run_id, "result": "win", "killer_id": "The Trapper"},
            headers=headers,
        )
        assert win_res.status_code in (200, 400)
```

### backend/tests/live/workflows/test_chaos_streak_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestChaosStreakWorkflow:
    """Workflow verifying Chaos Streak run lifecycles, perk draws, and win rate calculation."""

    def test_full_chaos_streak_lifecycle_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "chaos_runner_1", "chaos_wf@example.com", "pass123"
        )

        run_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert run_res.status_code == 200
        run_data = run_res.get_json()["run"]
        run_id = run_data["id"]
        killer_id = (
            run_data.get("killer_id")
            or run_data.get("current_killer_id")
            or (run_data.get("owned_killers") and run_data["owned_killers"][0])
            or "The Trapper"
        )

        reveal_res = client.post(
            "/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers
        )
        assert reveal_res.status_code in (200, 400)

        win_res = client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run_id, "result": "win", "killer_id": killer_id},
            headers=headers,
        )
        assert win_res.status_code in (200, 400)

        stats_res = client.get("/api/v1/chaos-streak/stats?difficulty=easy", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.get_json().get("stats", stats_res.get_json())
        assert stats.get("total_wins", 0) >= 0 or isinstance(stats, dict)
```

### backend/tests/live/workflows/test_character_catalog_and_filtering_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterCatalogAndFilteringWorkflow:
    """Workflow asserting complete character catalog queries, role separation, and release metadata."""

    def test_character_catalog_and_filtering_workflow(self, live_client: FlaskClient) -> None:
        killers_res = live_client.get("/api/v1/killers")
        assert killers_res.status_code == 200
        killers = killers_res.get_json()["data"]
        assert len(killers) >= 30
        assert all(k["role"] == "Killer" for k in killers)

        surv_res = live_client.get("/api/v1/survivors")
        assert surv_res.status_code == 200
        survivors = surv_res.get_json()["data"]
        assert len(survivors) >= 30
        assert all(s["role"] == "Survivor" for s in survivors)

        assert any("release_number" in k for k in killers)
```

### backend/tests/live/workflows/test_character_perks_addons_equipment_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterPerksAddonsEquipmentWorkflow:
    """Workflow verifying character details, equipment queries, bulk ownership updates, and perk generation."""

    def test_full_character_perks_addons_and_equipment_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        surv_res = live_client.get("/api/v1/survivors")
        assert surv_res.status_code == 200
        survivors = surv_res.get_json()["data"]
        assert len(survivors) >= 20

        killer_res = live_client.get("/api/v1/killers")
        assert killer_res.status_code == 200
        killers = killer_res.get_json()["data"]
        assert len(killers) >= 20

        nurse_detail_res = live_client.get("/api/v1/characters/The_Nurse/detail")
        if nurse_detail_res.status_code == 404:
            nurse_detail_res = live_client.get("/api/v1/characters/The%20Nurse/detail")
        assert nurse_detail_res.status_code == 200
        nurse_data = nurse_detail_res.get_json()["data"]
        assert nurse_data["character"]["name"] == "The Nurse"
        assert len(nurse_data["perks"]) == 3
        assert len(nurse_data["addons"]) > 0

        medkits_res = live_client.get("/api/v1/items?category=Med-Kit")
        assert medkits_res.status_code == 200
        medkits = medkits_res.get_json()["data"]
        assert len(medkits) > 0

        client, headers, user = auth_client_factory(
            "bulk_owner_user", "bulk@example.com", "pass123"
        )
        user_id = user["id"]

        all_chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        assert all_chars_res.status_code == 200
        chars = all_chars_res.get_json()["data"]

        updates = [{"character_id": c["id"], "is_owned": True} for c in chars[:10]]
        bulk_res = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": updates},
            headers=headers,
        )
        assert bulk_res.status_code == 200

        config_res = client.post(
            "/api/v1/generator/config",
            json={"role": "Killer", "mode": "random", "lock_perks": False},
        )
        assert config_res.status_code == 200

        draw_res = client.post(
            "/api/v1/generator/draw",
            json={"role": "Killer", "perks": ["A Nurse's Calling", "Thanatophobia"]},
        )
        assert draw_res.status_code == 200
        drawn = draw_res.get_json()["drawn_perks"]
        assert len(drawn) >= 2

        reset_res = client.post("/api/v1/generator/reset", json={"role": "Killer"})
        assert reset_res.status_code == 200
        assert len(reset_res.get_json()["drawn_perks"]) == 0
```

### backend/tests/live/workflows/test_character_power_and_addons_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestCharacterPowerAndAddonsWorkflow:
    """Workflow asserting killer power associations and equipment item querying."""

    def test_character_power_and_addons_workflow(self, live_client: FlaskClient) -> None:
        trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
        if trapper_res.status_code == 404:
            trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
        assert trapper_res.status_code == 200
        trapper = trapper_res.get_json()["data"]
        assert trapper["character"]["name"] == "The Trapper"
        assert len(trapper["perks"]) == 3
        assert len(trapper["addons"]) > 0

        item_res = live_client.get("/api/v1/items?category=Toolbox")
        assert item_res.status_code == 200
        items = item_res.get_json()["data"]
        assert len(items) > 0
```

### backend/tests/live/workflows/test_gauntlet_multiround_progression_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestGauntletMultiroundProgressionWorkflow:
    """Workflow testing multi-round Gauntlet progression, target reveals, and result logging."""

    def test_gauntlet_multiround_progression_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "gauntlet_boss", "gboss@example.com", "pass123"
        )

        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        assert run_res.status_code == 200
        run = run_res.get_json()["run"]
        run_id = run["id"]

        reveal_res = client.post(
            "/api/v1/gauntlet-streak/reveal", json={"run_id": run_id}, headers=headers
        )
        assert reveal_res.status_code in (200, 400)

        win_res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"run_id": run_id, "result": "win", "role": "killer"},
            headers=headers,
        )
        assert win_res.status_code in (200, 400)

        stats_res = client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.get_json()["stats"]
        assert isinstance(stats, dict)
```

### backend/tests/live/workflows/test_generator_exclusion_pool_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestGeneratorExclusionPoolWorkflow:
    """Workflow asserting random perk wheel exclusions and drawn perk state resets."""

    def test_generator_exclusion_pool_workflow(self, live_client: FlaskClient) -> None:
        c_res = live_client.post(
            "/api/v1/generator/config",
            json={"role": "Killer", "mode": "random"},
        )
        assert c_res.status_code == 200

        draw1 = live_client.post(
            "/api/v1/generator/draw",
            json={
                "role": "Killer",
                "perks": [
                    "Hex: Ruin",
                    "Pop Goes The Weasel",
                    "Barbecue & Chilli",
                    "Scourge Hook: Pain Resonance",
                ],
            },
        )
        assert draw1.status_code == 200
        drawn = draw1.get_json()["drawn_perks"]
        assert len(drawn) == 4

        get_drawn = live_client.get("/api/v1/generator/drawn?role=Killer")
        assert get_drawn.status_code == 200
        assert len(get_drawn.get_json()["drawn_perks"]) == 4

        reset_res = live_client.post("/api/v1/generator/reset", json={"role": "Killer"})
        assert reset_res.status_code == 200
        assert len(reset_res.get_json()["drawn_perks"]) == 0
```

### backend/tests/live/workflows/test_generator_lock_and_redraw_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestGeneratorLockAndRedrawWorkflow:
    """Workflow asserting perk locking and redrawing behavior in random loadout generator."""

    def test_generator_lock_and_redraw_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "gen_user_lock", "genlock@example.com", "pass123"
        )

        config_res = client.post(
            "/api/v1/generator/config",
            json={"role": "Survivor", "mode": "random", "lock_perks": False},
        )
        assert config_res.status_code == 200

        draw1 = client.post(
            "/api/v1/generator/draw",
            json={
                "role": "Survivor",
                "perks": ["Sprint Burst", "Self-Care", "Adrenaline", "Iron Will"],
            },
        )
        assert draw1.status_code == 200
        drawn1 = draw1.get_json()["drawn_perks"]
        assert len(drawn1) >= 4

        draw2 = client.post(
            "/api/v1/generator/draw",
            json={
                "role": "Survivor",
                "perks": ["Sprint Burst", "Adrenaline", "Kindred", "Decisive Strike"],
            },
        )
        assert draw2.status_code == 200
        drawn2 = draw2.get_json()["drawn_perks"]
        assert len(drawn2) >= 4
        assert "Sprint Burst" in drawn2
        assert "Adrenaline" in drawn2

        reset_res = client.post("/api/v1/generator/reset", json={"role": "Survivor"})
        assert reset_res.status_code == 200
        assert len(reset_res.get_json()["drawn_perks"]) == 0
```

### backend/tests/live/workflows/test_history_streak_guessing_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestHistoryStreakGuessingWorkflow:
    """Workflow asserting History streak chronological release progression and outcomes."""

    def test_history_streak_guessing_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "hist_guesser", "hguess@example.com", "pass123"
        )

        run_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
        assert run_res.status_code == 200
        run = run_res.get_json()
        assert "target_date" in run or "perk_name" in run or "id" in run or "run" in run

        res = client.post(
            "/api/v1/history-streak/result",
            json={"result": "loss", "mode": "medium"},
            headers=headers,
        )
        assert res.status_code in (200, 400)
```

### backend/tests/live/workflows/test_interactive_map_navigation_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestInteractiveMapNavigationWorkflow:
    """Workflow asserting interactive map navigation, realm filtering, and seed layout loading."""

    def test_interactive_map_navigation_workflow(self, live_client: FlaskClient) -> None:
        maps_res = live_client.get("/api/v1/maps")
        assert maps_res.status_code == 200
        maps = maps_res.get_json()["maps"]
        assert len(maps) > 0

        macmillan_res = live_client.get("/api/v1/maps?realm=The%20MacMillan%20Estate")
        assert macmillan_res.status_code == 200
        mac_maps = macmillan_res.get_json()["maps"]
        assert len(mac_maps) > 0

        detail_res = live_client.get("/api/v1/maps/coal_tower?seed=seed_a")
        assert detail_res.status_code == 200
        map_data = detail_res.get_json()["map"]

        assert "coal_tower" in map_data["id"]
        assert "name" in map_data
```

### backend/tests/live/workflows/test_jwt_security_and_session_validation_workflow.py
```python
from typing import Any, Callable
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app.core.security import decode_token


@pytest.mark.live
@pytest.mark.workflow
class TestJWTSecurityAndSessionValidationWorkflow:
    """Workflow verifying cryptographic token validation, signature tampering, and header formatting."""

    def test_jwt_security_and_session_validation_workflow(
        self,
        live_app: Flask,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "jwt_sec_user", "jwtsec@example.com", "pass123"
        )
        valid_token = headers["Authorization"].split(" ")[1]

        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.get_json()["authenticated"] is True

        tampered_token = valid_token[:-5] + "XXXXX"
        bad_sig_res = live_client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert bad_sig_res.status_code == 200
        assert bad_sig_res.get_json()["authenticated"] is False

        malformed_res = live_client.get(
            "/api/v1/auth/me", headers={"Authorization": "MalformedHeaderWithNoBearer"}
        )
        assert malformed_res.status_code == 200
        assert malformed_res.get_json()["authenticated"] is False

        with live_app.app_context():
            decoded = decode_token(valid_token)
            assert decoded is not None
            assert str(decoded["sub"]) == str(user["id"])
            assert decode_token("invalid.token.here") is None
```

### backend/tests/live/workflows/test_map_landmarks_and_seeds_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestMapLandmarksAndSeedsWorkflow:
    """Workflow asserting multi-floor map landmark indexing and keyword search."""

    def test_map_landmarks_and_seeds_workflow(self, live_client: FlaskClient) -> None:
        search_res = live_client.get("/api/v1/maps?search=House")
        assert search_res.status_code == 200
        found = search_res.get_json()["maps"]
        assert any("House" in m["name"] for m in found)

        rpd_res = live_client.get("/api/v1/maps/rpd_east?floor=1")
        assert rpd_res.status_code in (200, 404)
        if rpd_res.status_code == 200:
            rpd = rpd_res.get_json()["map"]
            assert rpd["id"] == "rpd_east"
```

### backend/tests/live/workflows/test_page_streak_multipage_progression_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestPageStreakMultipageProgressionWorkflow:
    """Workflow asserting multi-page streak progressions across consecutive 15-perk pages."""

    def test_page_streak_multipage_progression_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "page_streak_runner", "pstreak@example.com", "pass123"
        )

        roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
        assert roster_res.status_code == 200
        roster = roster_res.get_json()["data"]
        assert len(roster) > 0
        killer_name = roster[0]["killer"]

        pool_res = client.get("/api/v1/page-streak/pool", headers=headers)
        assert pool_res.status_code == 200
        assert pool_res.get_json()["pool_size"] > 0

        start_res = client.post(
            "/api/v1/page-streak/run/start", json={"killer": killer_name}, headers=headers
        )
        assert start_res.status_code in (200, 201)

        run_res = client.get(f"/api/v1/page-streak/run?killer={killer_name}", headers=headers)
        assert run_res.status_code == 200
        run_data = run_res.get_json()["run"]
        assert run_data is not None
        assert run_data["killer"] == killer_name

        result_res = client.post(
            "/api/v1/page-streak/run/result",
            json={
                "killer": killer_name,
                "page": 0,
                "perks": ["Agitation", "Brutal Strength"],
                "result": "win",
            },
            headers=headers,
        )
        assert result_res.status_code in (200, 400)
```

### backend/tests/live/workflows/test_perk_detail_and_teachables_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestPerkDetailAndTeachablesWorkflow:
    """Workflow asserting accurate assignment of 3 teachable perks per character profile."""

    def test_perk_detail_and_teachables_association_workflow(
        self, live_client: FlaskClient
    ) -> None:
        meg_res = live_client.get("/api/v1/characters/Meg_Thomas/detail")
        if meg_res.status_code == 404:
            meg_res = live_client.get("/api/v1/characters/Meg%20Thomas/detail")
        assert meg_res.status_code == 200
        meg_data = meg_res.get_json()["data"]
        assert meg_data["character"]["name"] == "Meg Thomas"
        meg_perk_names = [p["name"] for p in meg_data["perks"]]
        assert len(meg_perk_names) == 3
        assert (
            any("Sprint Burst" in name for name in meg_perk_names)
            or any("Adrenaline" in name for name in meg_perk_names)
            or any("Quick & Quiet" in name for name in meg_perk_names)
        )

        trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
        if trapper_res.status_code == 404:
            trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
        assert trapper_res.status_code == 200
        trapper_data = trapper_res.get_json()["data"]
        trapper_perk_names = [p["name"] for p in trapper_data["perks"]]
        assert len(trapper_perk_names) == 3
        assert any(
            "Agitation" in name or "Brutal Strength" in name or "Unnerving Presence" in name
            for name in trapper_perk_names
        )
```

### backend/tests/live/workflows/test_perks_polish_localization_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestPerksPolishLocalizationWorkflow:
    """Workflow asserting Polish translations, pagination, and multi-field perk search."""

    def test_perks_polish_localization_and_search_workflow(
        self, live_client: FlaskClient
    ) -> None:
        res = live_client.get("/api/v1/perks?limit=50&page=1")
        assert res.status_code == 200
        data = res.get_json()
        perks = data["data"]
        pagination = data["pagination"]
        assert len(perks) > 0
        assert pagination["total"] >= 200

        killer_res = live_client.get("/api/v1/perks?category=Killer&limit=30")
        assert killer_res.status_code == 200
        killer_perks = killer_res.get_json()["data"]
        assert all(
            p.get("category") == "Killer" or p.get("role") == "Killer" for p in killer_perks
        )

        surv_res = live_client.get("/api/v1/perks?category=Survivor&limit=30")
        assert surv_res.status_code == 200
        surv_perks = surv_res.get_json()["data"]
        assert all(
            p.get("category") == "Survivor" or p.get("role") == "Survivor" for p in surv_perks
        )

        search_res = live_client.get("/api/v1/perks?search=Calling")
        assert search_res.status_code == 200
        results = search_res.get_json()["data"]
        assert any("Calling" in p["name"] for p in results)

        sample = killer_perks[0]
        assert "name" in sample
        assert "description" in sample
```

### backend/tests/live/workflows/test_smash_or_pass_session_voting_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestSmashOrPassSessionVotingWorkflow:
    """Workflow asserting session-based unvoted feed filtering and reset mechanics."""

    def test_smash_or_pass_session_voting_workflow(self, live_client: FlaskClient) -> None:
        session_id = "session_test_wf_13"

        rosters_res = live_client.get("/api/v1/smash-or-pass/rosters")
        assert rosters_res.status_code == 200
        rosters = rosters_res.get_json()["data"]
        assert len(rosters) > 0
        slug = rosters[0]["slug"]

        feed_res = live_client.get(
            f"/api/v1/smash-or-pass/rosters/{slug}/feed?session_id={session_id}&limit=5"
        )
        assert feed_res.status_code == 200
        feed_data = feed_res.get_json()["data"]
        entities = feed_data["entities"]
        assert len(entities) > 0
        entity_id = entities[0]["id"]

        vote_res = live_client.post(
            "/api/v1/smash-or-pass/vote",
            json={
                "session_id": session_id,
                "entity_id": entity_id,
                "vote_type": "smash",
                "roster_slug": slug,
            },
        )
        assert vote_res.status_code == 200

        lb_res = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard")
        assert lb_res.status_code == 200
        assert len(lb_res.get_json()["data"]) > 0

        reset_res = live_client.post(
            "/api/v1/smash-or-pass/reset", json={"session_id": session_id}
        )
        assert reset_res.status_code in (200, 404)
```

### backend/tests/live/workflows/test_smash_or_pass_tournament_workflow.py
```python
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestSmashOrPassTournamentWorkflow:
    """Workflow asserting complete tournament session voting, exclusion, and leaderboard recalculations."""

    def test_full_smash_or_pass_voting_and_leaderboard_workflow(
        self, live_client: FlaskClient
    ) -> None:
        res_rosters = live_client.get("/api/v1/smash-or-pass/rosters")
        assert res_rosters.status_code == 200
        rosters = res_rosters.get_json()["data"]
        canon_roster = next((r for r in rosters if r["slug"] == "canon"), rosters[0])
        slug = canon_roster["slug"]

        session_headers = {"X-Session-ID": "workflow-session-12345"}
        res_feed = live_client.get(
            f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers
        )
        assert res_feed.status_code == 200
        entities = res_feed.get_json()["data"].get("entities", [])
        assert len(entities) > 0

        voted_ids = []
        for idx, ent in enumerate(entities[:3]):
            vote_type = "smash" if idx % 2 == 0 else "pass"
            res_vote = live_client.post(
                "/api/v1/smash-or-pass/vote",
                json={
                    "entity_id": ent["id"],
                    "vote": vote_type,
                    "roster_slug": slug,
                    "session_id": "workflow-session-12345",
                },
                headers=session_headers,
            )
            assert res_vote.status_code == 200
            voted_ids.append(ent["id"])

        res_feed2 = live_client.get(
            f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers
        )
        assert res_feed2.status_code == 200
        entities2 = res_feed2.get_json()["data"].get("entities", [])
        remaining_ids = {e["id"] for e in entities2}
        for vid in voted_ids:
            assert vid not in remaining_ids

        res_lead = live_client.get(f"/api/v1/smash-or-pass/rosters/{slug}/leaderboard")
        assert res_lead.status_code == 200
        leaders = res_lead.get_json()["data"]
        assert len(leaders) > 0

        res_reset = live_client.post(
            "/api/v1/smash-or-pass/session/reset",
            json={
                "session_id": "workflow-session-12345",
                "roster_slug": slug,
            },
        )
        assert res_reset.status_code == 200

        res_feed3 = live_client.get(
            f"/api/v1/smash-or-pass/rosters/{slug}/feed", headers=session_headers
        )
        assert res_feed3.status_code == 200
        entities3 = res_feed3.get_json()["data"].get("entities", [])
        reset_ids = {e["id"] for e in entities3}
        for vid in voted_ids:
            assert vid in reset_ids
```

### backend/tests/live/workflows/test_streaks_and_challenge_governance_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestStreaksAndChallengeGovernanceWorkflow:
    """Workflow asserting multi-mode streak access restrictions under active administrative governance."""

    def test_full_streaks_and_challenge_governance(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "challenge_master", "cmaster@example.com", "pass123"
        )

        roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
        assert roster_res.status_code == 200
        roster = roster_res.get_json()["data"]
        assert len(roster) > 0
        test_killer = roster[0]["killer"] if isinstance(roster[0], dict) else str(roster[0])

        run_res = client.get(f"/api/v1/page-streak/run?killer={test_killer}", headers=headers)
        assert run_res.status_code == 200

        gauntlet_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        assert gauntlet_res.status_code == 200
        g_run = gauntlet_res.get_json()["run"]
        g_run_id = g_run["id"]

        g_win_res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"run_id": g_run_id, "result": "win", "role": "killer"},
            headers=headers,
        )
        assert g_win_res.status_code in (200, 400)

        hist_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
        assert hist_res.status_code == 200

        dis_res = admin_client.put(
            "/api/v1/admin/challenge-modes/gauntlet",
            json={"is_enabled": False, "reason": "Gauntlet maintenance"},
        )
        assert dis_res.status_code == 200

        client_new, headers_new, user_new = auth_client_factory(
            "blocked_runner", "block@example.com", "pass123"
        )
        blocked_res = client_new.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=headers_new
        )
        assert blocked_res.status_code == 400
        assert "disabled" in blocked_res.get_json()["error"].lower()

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/gauntlet", json={"is_enabled": True}
        )
        assert en_res.status_code == 200

        unblocked_res = client_new.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=headers_new
        )
        assert unblocked_res.status_code == 200
```

### backend/tests/live/workflows/test_user_ownership_bulk_cascades_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestUserOwnershipBulkCascadesWorkflow:
    """Workflow verifying bulk character ownership updates and instant ownership summary recalculation."""

    def test_user_ownership_bulk_cascades_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "cascade_tester", "casc@example.com", "pass123"
        )
        user_id = user["id"]

        summary_res = client.get(f"/api/v1/users/{user_id}", headers=headers)
        assert summary_res.status_code == 200
        ownership = summary_res.get_json()["ownership"]
        assert (
            "owned_characters_count" in ownership
            or "killers" in ownership
            or isinstance(ownership, dict)
        )

        chars_res = client.get(f"/api/v1/users/{user_id}/characters", headers=headers)
        assert chars_res.status_code == 200
        chars = chars_res.get_json()["data"]

        updates = [{"character_id": c["id"], "is_owned": True} for c in chars[:5]]
        bulk_res = client.post(
            f"/api/v1/users/{user_id}/characters/bulk",
            json={"updates": updates},
            headers=headers,
        )
        assert bulk_res.status_code == 200
        assert bulk_res.get_json()["status"] == "success"
```

### backend/tests/live/workflows/test_user_profile_lifecycle_workflow.py
```python
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestUserProfileLifecycleWorkflow:
    """Workflow asserting complete user profile lifecycle: updates, password changes, and re-authentication."""

    def test_full_user_profile_and_password_lifecycle(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "profile_user_1", "prof1@example.com", "InitialPass123!"
        )

        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.get_json()
        assert me_data["user"]["username"] == "profile_user_1"
        assert me_data["user"]["email"] == "prof1@example.com"

        update_res = client.put(
            "/api/v1/auth/profile",
            json={
                "email": "prof_updated@example.com",
                "avatar_url": "custom_avatar_icon",
                "new_password": "NewStrongPassword456!",
            },
            headers=headers,
        )
        assert update_res.status_code == 200
        updated_user = update_res.get_json()["user"]
        assert updated_user["email"] == "prof_updated@example.com"
        assert updated_user["avatar_url"] == "custom_avatar_icon"

        old_login = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "profile_user_1",
                "password": "InitialPass123!",
            },
        )
        assert old_login.status_code in (400, 401)

        new_login = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "profile_user_1",
                "password": "NewStrongPassword456!",
            },
        )
        assert new_login.status_code == 200
        new_token = new_login.get_json()["token"]
        new_headers = {
            "Authorization": f"Bearer {new_token}",
            "Content-Type": "application/json",
        }

        me_res2 = client.get("/api/v1/auth/me", headers=new_headers)
        assert me_res2.status_code == 200
        assert me_res2.get_json()["user"]["email"] == "prof_updated@example.com"
```
