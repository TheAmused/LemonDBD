# backend/app/utils/thumbnails.py
"""On-demand, disk-cached WebP thumbnails for files under ``static/<subdir>``."""
from pathlib import Path

from flask import abort, current_app, send_file
from PIL import Image

THUMB_ROOT = "_thumbs"
_ALLOWED = {".webp", ".png", ".jpg", ".jpeg"}


def serve_thumb(subdir: str, rel: str, width: int, aspect: float = 2.0):
    """Return a cached ``width``-px WebP copy of ``static/<subdir>/<rel>`` (404 if missing)."""
    static_root = Path(current_app.static_folder or "").resolve()
    root = (static_root / subdir).resolve()
    source = (root / rel).resolve()
    if root not in source.parents or THUMB_ROOT in source.relative_to(root).parts:
        abort(404)
    if source.suffix.lower() not in _ALLOWED or not source.is_file():
        abort(404)

    thumb = (root / THUMB_ROOT / str(width) / rel).with_suffix(".webp")
    if not thumb.is_file() or thumb.stat().st_mtime < source.stat().st_mtime:
        thumb.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as img:
            img.thumbnail((width, int(width * aspect)))
            img.save(thumb, "WEBP", quality=82, method=4)

    response = send_file(thumb, mimetype="image/webp", max_age=60 * 60 * 24 * 30)
    response.headers["Cache-Control"] = "public, max-age=2592000"
    return response
