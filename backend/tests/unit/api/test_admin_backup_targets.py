# backend/tests/unit/api/test_admin_backup_targets.py
"""The admin panel's backup tools and the backend agree on what can be exported, imported and purged.

The picker used to send names the backend did not know ("characters", "addons", ...). They were
dropped without a word: a "full" backup had no survivors, killers, add-ons or tier lists, and purge
answered "success" for tables it never touched.
"""
import io
import json
import re
from pathlib import Path

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import BugReport, Chapter, User
from app.services.db.export_registry import NOT_PURGEABLE, PURGE_REQUIRES, SUPPORTED_EXPORT_TARGETS, TARGET_GROUPS
from tests.unit.conftest import make_killer, make_survivor

PASSWORD = "password123"
TARGETS_TS = Path(__file__).resolve().parents[4] / "frontend" / "src" / "components" / "scraper-config" / "scraperTargets.ts"


def _ui_targets() -> list[tuple[str, str]]:
    """(id, category) of every entry in the frontend's ALL_TARGETS."""
    return re.findall(r"\{ id: '([a-z_]+)',.*?category: '([a-z]+)' \}", TARGETS_TS.read_text(encoding="utf-8"))


@pytest.fixture
def admin(db_session) -> dict[str, str]:
    boss = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password(PASSWORD), role="admin", is_verified=True)
    db.session.add(boss)
    db.session.commit()
    return {"Authorization": f"Bearer {generate_token(boss.id, role='admin')}"}


@pytest.mark.unit
def test_the_frontend_picker_offers_exactly_the_backend_targets_in_the_same_groups() -> None:
    ui = _ui_targets()
    assert [target for target, _ in ui] == SUPPORTED_EXPORT_TARGETS
    assert {target: group for target, group in ui} == {t: g for g, targets in TARGET_GROUPS.items() for t in targets}


@pytest.mark.unit
def test_the_frontend_purge_rules_match_the_backend() -> None:
    text = TARGETS_TS.read_text(encoding="utf-8")
    not_purgeable = re.search(r"NOT_PURGEABLE: readonly string\[\] = \[([^\]]*)\]", text).group(1)
    assert set(re.findall(r"'([a-z_]+)'", not_purgeable)) == set(NOT_PURGEABLE)
    requires_block = re.search(r"PURGE_REQUIRES[^=]*= \{(.*?)\};", text, re.S).group(1)
    ui_requires = {key: tuple(re.findall(r"'([a-z_]+)'", deps)) for key, deps in re.findall(r"([a-z_]+): \[([^\]]*)\]", requires_block)}
    assert ui_requires == PURGE_REQUIRES


@pytest.mark.unit
def test_a_full_export_with_the_pickers_ids_contains_characters_and_tier_lists(client: FlaskClient, admin) -> None:
    make_survivor(db.session, "Dwight Fairfield", id=1)
    make_killer(db.session, "The Trapper", id=1)
    db.session.commit()
    res = client.post("/api/v1/admin/database/export", json={"targets": [t for t, _ in _ui_targets()], "include_assets": False}, headers=admin)
    assert res.status_code == 200
    content = res.get_json()["groups"]["content"]
    assert len(content["survivors"]) == 1 and len(content["killers"]) == 1
    assert "tier_lists" in content


@pytest.mark.unit
def test_the_targets_route_lists_groups_and_purge_rules(client: FlaskClient, admin) -> None:
    body = client.get("/api/v1/admin/database/targets", headers=admin).get_json()
    assert body["groups"] == TARGET_GROUPS
    assert "users" not in body["purgeable"] and "bug_reports" in body["purgeable"]
    assert body["purge_requires"]["chapters"] == ["survivors", "killers"]


@pytest.mark.unit
@pytest.mark.parametrize("target", ["users", "admin_audit_logs", "banned_email_hashes", "characters"])
def test_purge_refuses_what_it_cannot_purge(client: FlaskClient, admin, target: str) -> None:
    res = client.post("/api/v1/admin/database/purge", json={"targets": [target], "current_password": PASSWORD}, headers=admin)
    assert res.status_code == 400
    assert target in res.get_json()["error"]


@pytest.mark.unit
def test_purge_empties_the_tables_it_names(client: FlaskClient, admin) -> None:
    db.session.add(BugReport(title="t", message="m", reporter_name="x"))
    db.session.commit()
    res = client.post("/api/v1/admin/database/purge", json={"targets": ["bug_reports"], "current_password": PASSWORD}, headers=admin)
    assert res.status_code == 200
    assert res.get_json()["purged_tables"] == ["bug_reports"]
    assert db.session.query(BugReport).count() == 0


@pytest.mark.unit
def test_purging_a_parent_table_needs_the_tables_that_point_at_it(client: FlaskClient, admin) -> None:
    make_survivor(db.session, "Meg Thomas", id=2)
    db.session.commit()
    alone = client.post("/api/v1/admin/database/purge", json={"targets": ["chapters"], "current_password": PASSWORD}, headers=admin)
    assert alone.status_code == 400
    assert "survivors" in alone.get_json()["error"]
    together = client.post(
        "/api/v1/admin/database/purge", json={"targets": ["chapters", "survivors", "killers"], "current_password": PASSWORD}, headers=admin
    )
    assert together.status_code == 200, together.get_json()
    assert db.session.query(Chapter).count() == 0


@pytest.mark.unit
def test_import_refuses_an_unknown_mode_or_target(client: FlaskClient, admin) -> None:
    body = {"current_password": PASSWORD, "data": {"challenge_mode_settings": []}}
    assert client.post("/api/v1/admin/database/import", json={**body, "mode": "wipe"}, headers=admin).status_code == 400
    assert client.post("/api/v1/admin/database/import", json={**body, "mode": "merge", "targets": ["characters"]}, headers=admin).status_code == 400


@pytest.mark.unit
def test_import_accepts_a_backup_larger_than_the_site_wide_upload_cap(client: FlaskClient, admin, app) -> None:
    assert app.config["MAX_CONTENT_LENGTH"] <= 20 * 1024 * 1024
    backup = json.dumps({"groups": {"settings": {"challenge_mode_settings": []}}, "padding": "x" * (21 * 1024 * 1024)}).encode()
    res = client.post(
        "/api/v1/admin/database/import",
        data={"file": (io.BytesIO(backup), "backup.json"), "mode": "merge", "current_password": PASSWORD},
        content_type="multipart/form-data",
        headers=admin,
    )
    assert res.status_code == 200, res.get_json()
