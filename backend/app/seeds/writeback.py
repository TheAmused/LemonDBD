# backend/app/seeds/writeback.py
"""Writing admin edits back into the seed files, safely and only where it helps.

Admin-authored tier lists and rosters are folded back into `seeds/data/...`
so a reseed does not forget them. That only makes sense where the seed folder
is a working copy someone commits (a developer's checkout): inside a
production container the folder is part of the image, every worker would race
on it, and the next deploy throws the writes away. So:

* it is ON for FLASK_ENV=development and the test suite, OFF otherwise;
  `SEED_WRITEBACK=true|false` overrides either way. In production the database
  is the record -- use the admin database export to capture it;
* every write is atomic (temp file + rename) under an exclusive file lock, so
  two workers never interleave a half-written JSON file.
"""
from __future__ import annotations

import contextlib
import logging
import os
import tempfile
from pathlib import Path

try:  # POSIX only; the containers are Linux. A native Windows run skips the lock.
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


def seed_writeback_enabled() -> bool:
    flag = os.getenv("SEED_WRITEBACK")
    if flag is not None and flag.strip():
        return flag.strip().lower() in ("1", "true", "yes", "on")
    if _testing_app():
        return True
    return os.getenv("FLASK_ENV", "production").strip().lower() == "development"


def _testing_app() -> bool:
    try:
        from flask import current_app

        return bool(current_app and current_app.config.get("TESTING"))
    except RuntimeError:  # no app context
        return False


@contextlib.contextmanager
def _locked(path: Path):
    lock_path = path.with_name(f".{path.name}.lock")
    if fcntl is None:
        yield
        return
    with open(lock_path, "a+") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def write_seed_text(path: Path, text: str) -> bool:
    """Atomically replaces `path` with `text`. False (logged) if skipped or failed."""
    if not seed_writeback_enabled():
        return False
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with _locked(path):
            fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
            try:
                with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as out:
                    out.write(text)
                os.replace(tmp, path)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)
        return True
    except OSError as err:
        logger.error("[seed writeback] Failed to write %s: %s", path, err)
        return False


def remove_seed_file(path: Path) -> bool:
    """Deletes `path` under the same lock. False (logged) if skipped or failed."""
    if not seed_writeback_enabled() or not path.exists():
        return False
    try:
        with _locked(path):
            path.unlink(missing_ok=True)
        return True
    except OSError as err:
        logger.warning("[seed writeback] Could not delete %s: %s", path, err)
        return False
