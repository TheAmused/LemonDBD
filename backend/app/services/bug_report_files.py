# backend/app/services/bug_report_files.py
"""The screenshots attached to bug reports, stored under static/uploads/bug_reports/ and served publicly.

They are deleted with their report (and when the reporter's account is deleted), and a daily job
removes any file no report refers to any more (after a purge, a replace import or a crash). Without
this a screenshot that showed someone's personal data stayed public after both the report and the
account were gone.
"""
import logging
import re
import time
from pathlib import Path
from typing import Iterable

from flask import current_app
from sqlalchemy import select

from app.core.extensions import db

logger = logging.getLogger(__name__)

#: The only shape `routes/bug_reports._save_base64_image` stores (the public path of one file).
_PUBLIC_PATH = re.compile(r"^/static/uploads/bug_reports/(bug_[0-9a-f]{12}\.webp)$")
#: A file younger than this is left alone by the sweep: its report may not be committed yet.
SWEEP_GRACE_SECONDS = 3600


def upload_dir() -> Path:
    return Path(current_app.root_path) / "static" / "uploads" / "bug_reports"


def file_name(public_path: object) -> str | None:
    """The file name behind one of our own attachment paths, else None (never a path outside the folder)."""
    match = _PUBLIC_PATH.match(public_path) if isinstance(public_path, str) else None
    return match.group(1) if match else None


def delete_files(public_paths: Iterable[object]) -> int:
    """Remove the stored files behind these attachment paths; returns how many were deleted. Never raises."""
    deleted = 0
    folder = upload_dir()
    for path in public_paths:
        name = file_name(path)
        if not name:
            continue
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
