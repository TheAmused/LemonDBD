# backend/tests/unit/core/test_warm_thumbnails_cli.py
"""Unit tests for scripts/warm_thumbnails.py CLI and thumbnail auto-warm hooks."""
from __future__ import annotations

import builtins
import sys
import types
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from PIL import Image
from sqlalchemy.orm import Session

import scripts.warm_thumbnails as warm_cli
from app.core.security import generate_token, hash_password
from app.models.user import User
from app.routes import admin_database
from app.seeds import smash_roster_seeder


def _png(path: Path, color: str = "red", size: tuple[int, int] = (400, 400)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color).save(path, "PNG")


def test_cli_warms_and_prunes_with_tmp_static_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    static_root = tmp_path / "app" / "static"
    _png(static_root / "chapters" / "c1.png", "red", (900, 900))
    orphan = static_root / "chapters" / "_thumbs" / "480" / "stale.webp"
    orphan.parent.mkdir(parents=True, exist_ok=True)
    orphan.write_bytes(b"stale")

    monkeypatch.setattr(warm_cli, "BACKEND_ROOT", tmp_path)
    monkeypatch.setattr(warm_cli, "_acquire_lock", lambda _p: None)
    monkeypatch.setattr(sys, "argv", ["warm_thumbnails.py", "--prune", "--workers", "2"])

    assert warm_cli.main() == 0
    out = capsys.readouterr().out.strip()
    assert out == "[warm_thumbnails] generated=1 skipped=0 pruned=1 failed=0"
    assert (static_root / "chapters" / "_thumbs" / "480" / "c1.png.webp").is_file()
    assert not orphan.exists()


def test_cli_quiet_suppresses_output_and_clamps_workers(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    seen: dict[str, object] = {}

    class _DummyLock:
        def __init__(self) -> None:
            self.closed = False

        def close(self) -> None:
            self.closed = True

    dummy_lock = _DummyLock()

    def fake_warm(static_root: Path, prune_orphans: bool = False, workers: int = 4) -> dict[str, int]:
        seen["static_root"] = static_root
        seen["prune_orphans"] = prune_orphans
        seen["workers"] = workers
        return {"generated": 2, "skipped": 1, "pruned": 0, "failed": 0}

    monkeypatch.setattr(warm_cli, "BACKEND_ROOT", tmp_path)
    monkeypatch.setattr(warm_cli, "_acquire_lock", lambda _p: dummy_lock)
    monkeypatch.setattr(warm_cli, "warm_all_thumbs", fake_warm)
    monkeypatch.setattr(sys, "argv", ["warm_thumbnails.py", "--quiet", "--workers", "0"])

    assert warm_cli.main() == 0
    assert capsys.readouterr().out == ""
    assert seen == {
        "static_root": tmp_path / "app" / "static",
        "prune_orphans": False,
        "workers": 1,
    }
    assert dummy_lock.closed is True


def test_cli_exits_zero_without_warming_when_lock_held(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(warm_cli, "_acquire_lock", lambda _p: False)
    monkeypatch.setattr(
        warm_cli,
        "warm_all_thumbs",
        lambda **_kwargs: pytest.fail("warm_all_thumbs should not run when lock is held"),
    )
    monkeypatch.setattr(sys, "argv", ["warm_thumbnails.py"])

    assert warm_cli.main() == 0
    assert capsys.readouterr().out == ""


def test_acquire_lock_nt_and_posix_branches(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock_file = tmp_path / "warm.lock"

    monkeypatch.setattr(warm_cli.os, "name", "nt")
    assert warm_cli._acquire_lock(lock_file) is None

    fake_fcntl = types.SimpleNamespace(LOCK_EX=2, LOCK_NB=4, flock=lambda _fd, _flags: None)
    real_import = builtins.__import__

    def fake_import(name: str, *args, **kwargs):
        if name == "fcntl":
            return fake_fcntl
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(warm_cli.os, "name", "posix")
    monkeypatch.setattr(builtins, "__import__", fake_import)

    handle = warm_cli._acquire_lock(lock_file)
    assert handle is not None and handle is not False
    handle.close()

    def raise_oserror(_fd: int, _flags: int) -> None:
        raise BlockingIOError("already locked")

    fake_fcntl.flock = raise_oserror
    assert warm_cli._acquire_lock(lock_file) is False


def test_admin_import_triggers_async_warm_and_ignores_warm_errors(
    app: Flask, client: FlaskClient, db_session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    called: list[Path | None] = []

    admin = User(
        login="warm_admin",
        username="warm_admin",
        email="warm_admin@example.com",
        password_hash=hash_password("pw"),
        role="admin",
    )
    db_session.add(admin)
    db_session.commit()
    token = generate_token(admin.id)

    monkeypatch.setattr(admin_database, "reauth_error", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        admin_database.DatabaseExportImportService,
        "import_database",
        staticmethod(lambda **_kwargs: {"status": "success", "summary": {"killers": {"created": 1}}}),
    )
    monkeypatch.setattr(admin_database, "log_admin_action", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        admin_database,
        "warm_all_thumbs_async",
        lambda static_root=None: called.append(static_root) or True,
    )

    static_dir = tmp_path / "static"
    monkeypatch.setattr(app, "static_folder", str(static_dir))
    res = client.post(
        "/api/v1/admin/database/import",
        headers={"Authorization": f"Bearer {token}"},
        json={"mode": "merge", "data": {"killers": []}},
    )
    assert res.status_code == 200
    assert res.get_json()["status"] == "success"
    assert called == [static_dir]

    # Failure in warm_all_thumbs_async must not break the import response.
    def boom(_static_root=None):
        raise RuntimeError("warm failed")

    monkeypatch.setattr(admin_database, "warm_all_thumbs_async", boom)
    res2 = client.post(
        "/api/v1/admin/database/import",
        headers={"Authorization": f"Bearer {token}"},
        json={"mode": "merge", "data": {"killers": []}},
    )
    assert res2.status_code == 200


def test_smash_roster_seeder_triggers_async_warm_after_commit(
    app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    events: list[str] = []

    monkeypatch.setattr(smash_roster_seeder, "ensure_roster_assets", lambda: None)
    monkeypatch.setattr(smash_roster_seeder, "load_rosters_from_json_files", lambda: ([], {}))
    monkeypatch.setattr(smash_roster_seeder.db.session, "commit", lambda: events.append("commit"))
    monkeypatch.setattr(smash_roster_seeder, "bump_catalog_version", lambda: events.append("bump"))
    monkeypatch.setattr(smash_roster_seeder, "warm_all_thumbs_async", lambda: events.append("warm") or True)

    with app.app_context():
        smash_roster_seeder._seed_smash_rosters_impl()

    assert events == ["commit", "bump", "warm"]
