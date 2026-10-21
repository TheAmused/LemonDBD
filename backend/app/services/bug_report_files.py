# backend/app/services/bug_report_files.py
"""The screenshots attached to bug reports.

A screenshot can show personal data (a profile, an e-mail address), so it is not a public file:
it is stored outside the static folder, in BUG_REPORT_UPLOAD_DIR (by default
backend/data/uploads/bug_reports, the persistent data volume in Docker), and only
GET /api/v1/bug-reports/attachments/<name> serves it, to an admin or to the account that filed
the report. Reports filed before this change point at /static/uploads/bug_reports/<name>; those
files are moved into the private folder the first time they are requested and by the nightly
sweep, and nginx no longer serves that folder.

Files are deleted with their report (and when the reporter's account is deleted), and the daily
job removes any file no report refers to any more (after a purge, a replace import or a crash).
"""
import logging
import re
import shutil
import time
from pathlib import Path
from typing import Iterable

from flask import current_app
from sqlalchemy import select

from app.core.extensions import db

logger = logging.getLogger(__name__)

#: Where new attachments are served from (the stored path of one file is this plus its name).
ATTACHMENT_ROUTE = "/api/v1/bug-reports/attachments/"
#: An attachment file name. New ones are always `bug_<12 hex>.webp`; reports from before the
#: WebP re-encoding may carry other image names, so those are accepted too (never a path).
_NAME = r"[A-Za-z0-9_-]{1,80}\.(?:webp|png|jpe?g|gif)"
NAME_PATTERN = re.compile(rf"^{_NAME}$")
#: A stored attachment path: the current route, or the public path older reports still carry.
_STORED_PATH = re.compile(rf"^(?:/api/v1/bug-reports/attachments/|/static/uploads/bug_reports/)({_NAME})$")
#: A file younger than this is left alone by the sweep: its report may not be committed yet.
SWEEP_GRACE_SECONDS = 3600


def upload_dir() -> Path:
    """The private folder attachments are kept in (never under the static folder)."""
    configured = current_app.config.get("BUG_REPORT_UPLOAD_DIR")
    if configured:
        return Path(configured)
    return Path(current_app.root_path).parent / "data" / "uploads" / "bug_reports"


def legacy_dir() -> Path:
    """The public folder attachments used to be written to."""
    return Path(current_app.root_path) / "static" / "uploads" / "bug_reports"


def attachment_path(name: str) -> str:
    """The path stored on a report for the attachment `name`."""
    return f"{ATTACHMENT_ROUTE}{name}"


def file_name(public_path: object) -> str | None:
    """The file name behind one of our own attachment paths, else None (never a path outside the folder)."""
    match = _STORED_PATH.match(public_path) if isinstance(public_path, str) else None
    return match.group(1) if match else None


def _move_legacy(name: str) -> Path | None:
    legacy, private = legacy_dir() / name, upload_dir() / name
    if not legacy.is_file():
        return None
    try:
        private.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(legacy), str(private))
        return private
    except OSError as err:
        logger.warning("Could not move bug report attachment %s out of the public folder: %s", name, err)
        return legacy


def stored_file(name: str) -> Path | None:
    """The file on disk for the attachment `name` (a legacy public copy is moved first), or None."""
    if not NAME_PATTERN.match(name or ""):
        return None
    private = upload_dir() / name
    if private.is_file():
        return private
    return _move_legacy(name)


def relocate_legacy_files() -> int:
    """Move every attachment still in the old public folder into the private one; returns how many."""
    folder = legacy_dir()
    if not folder.is_dir():
        return 0
    moved = 0
    for entry in folder.iterdir():
        if entry.is_file() and NAME_PATTERN.match(entry.name) and _move_legacy(entry.name) == upload_dir() / entry.name:
            moved += 1
    return moved


def delete_files(public_paths: Iterable[object]) -> int:
    """Remove the stored files behind these attachment paths; returns how many were deleted. Never raises."""
    deleted = 0
    folders = (upload_dir(), legacy_dir())
    for path in public_paths:
        name = file_name(path)
        if not name:
            continue
        for folder in folders:
            try:
                (folder / name).unlink(missing_ok=False)
                deleted += 1
            except FileNotFoundError:
                pass
            except OSError as err:
                logger.warning("Could not delete bug report attachment %s: %s", name, err)
    return deleted


def sweep_orphans(grace_seconds: int = SWEEP_GRACE_SECONDS) -> int:
    """Delete every stored attachment no bug report refers to (older than `grace_seconds`)."""
    from app.models.community import BugReport

    relocate_legacy_files()
    folder = upload_dir()
    if not folder.is_dir():
        return 0
    referenced = {
        name
        for images_json in db.session.scalars(select(BugReport.images_json))
        for name in (file_name(path) for path in BugReport.parse_images(images_json))
        if name
    }
    cutoff = time.time() - grace_seconds
    deleted = 0
    for entry in folder.iterdir():
        if not entry.is_file() or entry.name in referenced or entry.name.startswith("."):
            continue
        try:
            if entry.stat().st_mtime > cutoff:
                continue
            entry.unlink()
            deleted += 1
        except OSError as err:
            logger.warning("Could not delete orphaned bug report attachment %s: %s", entry.name, err)
    return deleted
