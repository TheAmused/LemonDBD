# backend/tests/unit/api/test_bug_report_ownership.py
"""A bug report belongs to the account that filed it; an email address alone never grants access."""
from datetime import datetime, timedelta, timezone

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import BugReport, User

PASSWORD = "password123"


def _user(login: str, email: str, *, role: str = "user", verified: bool = True) -> tuple[User, dict[str, str]]:
    user = User(
        login=login, username=login, email=email,
        password_hash=hash_password(PASSWORD), role=role, is_verified=verified,
    )
    db.session.add(user)
    db.session.commit()
    return user, {"Authorization": f"Bearer {generate_token(user.id, role=role)}"}


def _guest_report(email: str, title: str = "Guest bug") -> BugReport:
    report = BugReport(reporter_name="Guest", reporter_email=email, title=title, message="private details")
    db.session.add(report)
    db.session.commit()
    return report


@pytest.mark.unit
class TestBugReportOwnership:
    def test_matching_email_does_not_expose_a_guest_report(self, client: FlaskClient, db_session) -> None:
        report = _guest_report("victim@guest.com")
        _, headers = _user("claimer", "victim@guest.com", verified=False)

        res = client.get("/api/v1/bug-reports/my", headers=headers)
        assert res.status_code == 200
        assert res.get_json()["reports"] == []
        assert client.post(f"/api/v1/bug-reports/{report.id}/seen", headers=headers).status_code == 404

    def test_verifying_the_address_claims_the_guest_reports(self, client: FlaskClient, db_session) -> None:
        _guest_report("owner@guest.com", title="Filed before signing up")
        _guest_report("someone-else@guest.com", title="Not theirs")
        user, headers = _user("owner", "owner@guest.com", verified=False)
        user.verification_code = "123456"
        user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.session.commit()

        res = client.post("/api/v1/auth/verify-email", json={"email": "owner@guest.com", "code": "123456"})
        assert res.status_code == 200

        titles = [r["title"] for r in client.get("/api/v1/bug-reports/my", headers=headers).get_json()["reports"]]
        assert titles == ["Filed before signing up"]

    def test_admin_deletion_anonymises_the_reports(self, client: FlaskClient, db_session) -> None:
        _, admin_headers = _user("boss", "boss@example.com", role="admin")
        leaver, _ = _user("leaver", "leaver@example.com")
        db.session.add(BugReport(user_id=leaver.id, reporter_name="leaver", reporter_email="leaver@example.com", title="t", message="m"))
        db.session.commit()

        assert client.delete(f"/api/v1/users/{leaver.id}", headers=admin_headers).status_code == 200
        db.session.expire_all()
        report = db.session.query(BugReport).one()
        assert report.reporter_name == "Deleted user"
        assert report.reporter_email is None
