# backend/tests/unit/api/test_bug_report_files.py
"""Bug report screenshots are public files: they go with their report, with the reporter's account,
and the nightly sweep removes any that no report refers to."""
import os
import time

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import BugReport, User
from app.services import bug_report_files
from app.services.user.admin import admin_remove_user

PASSWORD = "password123"


@pytest.fixture
def uploads(tmp_path, monkeypatch):
    monkeypatch.setattr(bug_report_files, "upload_dir", lambda: tmp_path)
    return tmp_path


def _shot(folder, name: str, age_seconds: int = 0) -> str:
    path = folder / name
    path.write_bytes(b"RIFF....WEBP")
    if age_seconds:
        past = time.time() - age_seconds
        os.utime(path, (past, past))
    return f"/static/uploads/bug_reports/{name}"


def _admin() -> User:
    boss = User(login="boss", username="boss", email="boss@example.com", password_hash=hash_password(PASSWORD), role="admin", is_verified=True)
    db.session.add(boss)
    db.session.commit()
    return boss


@pytest.mark.unit
def test_deleting_a_report_deletes_its_screenshots(client: FlaskClient, db_session, uploads) -> None:
    boss = _admin()
    report = BugReport(title="t", message="m", reporter_name="x")
    report.images = [_shot(uploads, "bug_0123456789ab.webp")]
    db.session.add(report)
    db.session.commit()
    res = client.delete(f"/api/v1/admin/bug-reports/{report.id}", headers={"Authorization": f"Bearer {generate_token(boss.id, role='admin')}"})
    assert res.status_code == 200
    assert not (uploads / "bug_0123456789ab.webp").exists()


@pytest.mark.unit
def test_deleting_an_account_deletes_the_screenshots_of_its_reports(db_session, uploads) -> None:
    player = User(login="player", username="player", email="player@example.com", password_hash=hash_password(PASSWORD))
    db.session.add(player)
    db.session.commit()
    report = BugReport(title="t", message="m", reporter_name="player", user_id=player.id)
    report.images = [_shot(uploads, "bug_aaaaaaaaaaaa.webp")]
    db.session.add(report)
    db.session.commit()
    assert admin_remove_user(player.id) is True
    db.session.expire_all()
    kept = db.session.get(BugReport, report.id)
    assert kept.images == [] and kept.reporter_name == "Deleted user"
    assert not (uploads / "bug_aaaaaaaaaaaa.webp").exists()


@pytest.mark.unit
def test_the_sweep_removes_only_old_unreferenced_files(db_session, uploads) -> None:
    report = BugReport(title="t", message="m", reporter_name="x")
    report.images = [_shot(uploads, "bug_bbbbbbbbbbbb.webp", age_seconds=7200)]
    db.session.add(report)
    db.session.commit()
    _shot(uploads, "bug_cccccccccccc.webp", age_seconds=7200)  # orphaned
    _shot(uploads, "bug_dddddddddddd.webp")  # orphaned but new: its report may still be on the way
    assert bug_report_files.sweep_orphans() == 1
    assert sorted(p.name for p in uploads.iterdir()) == ["bug_bbbbbbbbbbbb.webp", "bug_dddddddddddd.webp"]


@pytest.mark.unit
def test_only_our_own_attachment_paths_are_ever_deleted(uploads) -> None:
    outside = uploads.parent / "keep.txt"
    outside.write_text("x")
    assert bug_report_files.delete_files(["/static/uploads/bug_reports/../keep.txt", "https://evil.example/a.webp", None]) == 0
    assert outside.exists()
