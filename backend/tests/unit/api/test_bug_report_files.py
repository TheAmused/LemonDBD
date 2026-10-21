# backend/tests/unit/api/test_bug_report_files.py
"""Bug report screenshots are private files: they go with their report, with the reporter's account,
the nightly sweep removes any that no report refers to, and only an admin or the reporter can fetch them."""
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


@pytest.fixture
def legacy(tmp_path, monkeypatch):
    folder = tmp_path / "legacy-public"
    folder.mkdir()
    monkeypatch.setattr(bug_report_files, "legacy_dir", lambda: folder)
    return folder


def _bearer(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, role=user.role)}"}


def _player(name: str) -> User:
    user = User(login=name, username=name, email=f"{name}@example.com", password_hash=hash_password(PASSWORD), is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


@pytest.mark.unit
def test_attachments_are_served_only_to_an_admin_or_the_reporter(client: FlaskClient, db_session, uploads, legacy) -> None:
    reporter, stranger, boss = _player("reporter"), _player("stranger"), _admin()
    name = "bug_eeeeeeeeeeee.webp"
    (uploads / name).write_bytes(b"RIFF....WEBP")
    report = BugReport(title="t", message="m", reporter_name="reporter", user_id=reporter.id)
    report.images = [bug_report_files.attachment_path(name)]
    db.session.add(report)
    db.session.commit()
    url = f"/api/v1/bug-reports/attachments/{name}"

    assert client.get(url).status_code == 401
    assert client.get(url, headers=_bearer(stranger)).status_code == 404
    for viewer in (reporter, boss):
        res = client.get(url, headers=_bearer(viewer))
        assert res.status_code == 200 and res.data == b"RIFF....WEBP"
        assert res.mimetype == "image/webp" and "private" in res.headers["Cache-Control"]
    # A name no report refers to, and anything that is not a plain file name, are 404 for everyone.
    assert client.get("/api/v1/bug-reports/attachments/bug_ffffffffffff.webp", headers=_bearer(boss)).status_code == 404
    assert client.get("/api/v1/bug-reports/attachments/..%2F..%2Fapp.py", headers=_bearer(boss)).status_code == 404


@pytest.mark.unit
def test_a_legacy_public_file_moves_to_the_private_folder(client: FlaskClient, db_session, uploads, legacy) -> None:
    boss = _admin()
    name = "bug_111111111111.webp"
    (legacy / name).write_bytes(b"old")
    report = BugReport(title="t", message="m", reporter_name="x")
    report.images = [f"/static/uploads/bug_reports/{name}"]  # the path older reports carry
    db.session.add(report)
    db.session.commit()

    res = client.get(f"/api/v1/bug-reports/attachments/{name}", headers=_bearer(boss))
    assert res.status_code == 200 and res.data == b"old"
    assert (uploads / name).exists() and not (legacy / name).exists()


@pytest.mark.unit
def test_the_sweep_moves_every_legacy_file_first(db_session, uploads, legacy) -> None:
    report = BugReport(title="t", message="m", reporter_name="x")
    report.images = ["/static/uploads/bug_reports/bug_222222222222.webp"]
    db.session.add(report)
    db.session.commit()
    (legacy / "bug_222222222222.webp").write_bytes(b"x")
    assert bug_report_files.sweep_orphans() == 0
    assert [p.name for p in uploads.iterdir() if p.is_file()] == ["bug_222222222222.webp"]
    assert not any(legacy.iterdir())
