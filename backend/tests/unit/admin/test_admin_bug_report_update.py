# backend/tests/unit/admin/test_admin_bug_report_update.py
"""The admin bug-report update checks its fields before using them (a number used to be a 500)."""
import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import BugReport, User


@pytest.fixture
def setup(db_session):
    boss = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password("password123"), role="admin", is_verified=True)
    report = BugReport(title="t", message="m", reporter_name="x")
    db.session.add_all([boss, report])
    db.session.commit()
    return report, {"Authorization": f"Bearer {generate_token(boss.id, role='admin')}"}


@pytest.mark.unit
@pytest.mark.parametrize("body", [{"status": 5}, {"status": ["resolved"]}, {"admin_notes": ["x"]}, {"admin_notes": 7}, {"admin_notes": "x" * 5001}])
def test_bad_fields_are_a_400(client: FlaskClient, setup, body) -> None:
    report, headers = setup
    assert client.put(f"/api/v1/admin/bug-reports/{report.id}", json=body, headers=headers).status_code == 400


@pytest.mark.unit
def test_a_good_update_still_works(client: FlaskClient, setup) -> None:
    report, headers = setup
    res = client.put(f"/api/v1/admin/bug-reports/{report.id}", json={"status": "resolved", "admin_notes": "Fixed, thanks!"}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["report"]["status"] == "resolved"
