# backend/app/utils/thumbnails.py
"""On-demand, disk-cached WebP thumbnails for files under ``static/<subdir>``."""
import os
import threading
from pathlib import Path

from flask import abort, current_app, send_file
from PIL import Image

THUMB_ROOT = "_thumbs"
_ALLOWED = {".webp", ".png", ".jpg", ".jpeg"}

#: Game art is overwritten in place by a re-scrape, so a thumbnail is revalidated
#: daily instead of being trusted for a month.
THUMB_MAX_AGE = 60 * 60 * 24

_locks_guard = threading.Lock()
_locks: dict[str, threading.Lock] = {}


def _lock_for(path: Path) -> threading.Lock:
    """One lock per thumbnail, so concurrent cold requests decode the source once."""
    with _locks_guard:
        return _locks.setdefault(str(path), threading.Lock())


def _thumb_path(root: Path, width: int, rel: str) -> Path:
    # The full source name plus ".webp" ("x.png.webp"): `with_suffix` mapped
    # x.png, x.jpg and x.webp onto one file, and whichever was generated first
    # was then served for all of them.
    return root / THUMB_ROOT / str(width) / f"{rel}.webp"


def _is_current(thumb: Path, source: Path) -> bool:
    """True when the thumbnail was made from this exact version of the source.

    The thumbnail's mtime is set to the source's when it is written, so a source
    restored or copied with an old mtime (`cp -p`, unzip, git checkout) differs
    from it as well as a newer one does.
    """
    return thumb.is_file() and thumb.stat().st_mtime_ns == source.stat().st_mtime_ns


def _write_thumb(source: Path, thumb: Path, width: int, aspect: float) -> None:
    thumb.parent.mkdir(parents=True, exist_ok=True)
    partial = thumb.with_name(f"{thumb.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    try:
        with Image.open(source) as img:
            img.thumbnail((width, int(width * aspect)))
            img.save(partial, "WEBP", quality=82, method=4)
        stat = source.stat()
        os.utime(partial, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        os.replace(partial, thumb)
    finally:
        partial.unlink(missing_ok=True)


def serve_thumb(subdir: str, rel: str, width: int, aspect: float = 2.0):
    """Return a cached ``width``-px WebP copy of ``static/<subdir>/<rel>`` (404 if missing)."""
    static_root = Path(current_app.static_folder or "").resolve()
    root = (static_root / subdir).resolve()
    source = (root / rel).resolve()
    if root not in source.parents or THUMB_ROOT in source.relative_to(root).parts:
        abort(404)
    if source.suffix.lower() not in _ALLOWED or not source.is_file():
        abort(404)

    thumb = _thumb_path(root, width, source.relative_to(root).as_posix())
    if not _is_current(thumb, source):
        with _lock_for(thumb):
            if not _is_current(thumb, source):
                _write_thumb(source, thumb, width, aspect)

    return send_file(thumb, mimetype="image/webp", max_age=THUMB_MAX_AGE)
