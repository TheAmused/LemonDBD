# backend/app/utils/thumbnails.py
"""On-demand, disk-cached WebP thumbnails for files under ``static/<subdir>``."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import logging
import os
import threading
from pathlib import Path

from flask import abort, current_app, has_app_context, send_file
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

THUMB_ROOT = "_thumbs"
_ALLOWED = {".webp", ".png", ".jpg", ".jpeg"}

#: Game art is overwritten in place by a re-scrape, so revalidate daily.
THUMB_MAX_AGE = 60 * 60 * 24


@dataclass(frozen=True)
class ThumbSpec:
    """Thumbnail generation parameters for a static asset category."""

    subdir: str
    widths: tuple[int, ...]
    aspect: float = 2.0


THUMB_SPECS: dict[str, ThumbSpec] = {
    "avatars": ThumbSpec("avatars", (128, 256), 2.0),
    "maps": ThumbSpec("maps", (320,), 2.0),
    "chapters": ThumbSpec("chapters", (480,), 1.0),
    "realms": ThumbSpec("realms", (320,), 1.5),
    "icons": ThumbSpec("icons", (96, 128, 256), 1.0),
    "smash-or-pass": ThumbSpec("smash-or-pass", (256, 480), 2.0),
    "tier-lists": ThumbSpec("tier-lists", (480,), 1.0),
    "community": ThumbSpec("uploads/community", (128, 256, 480), 2.0),
}

_locks_guard = threading.Lock()
_locks: dict[str, threading.Lock] = {}

_warm_lock = threading.Lock()
_warm_running = False


def _lock_for(path: Path) -> threading.Lock:
    """One lock per thumbnail, so concurrent cold requests decode the source once."""
    with _locks_guard:
        return _locks.setdefault(str(path), threading.Lock())


def _thumb_path(root: Path, width: int, rel: str) -> Path:
    # Full source name plus ".webp": x.png and x.webp must not share a thumbnail.
    return root / THUMB_ROOT / str(width) / f"{rel}.webp"


def _is_current(thumb: Path, source: Path) -> bool:
    """True when the thumbnail was made from this exact version of the source.

    Its mtime is set to the source's on write, so a source restored with an old
    mtime differs just as a newer one does.
    """
    return thumb.is_file() and thumb.stat().st_mtime_ns == source.stat().st_mtime_ns


def _normalize_for_webp(img: Image.Image) -> Image.Image:
    """Convert to RGBA/RGB (preserving tRNS/alpha) and apply EXIF orientation."""
    has_alpha = "A" in img.mode or "transparency" in img.info
    target_mode = "RGBA" if has_alpha else "RGB"
    converted = img if img.mode == target_mode else img.convert(target_mode)
    transposed = ImageOps.exif_transpose(converted)
    return transposed if transposed is not None else converted


def _write_thumb(source: Path, thumb: Path, width: int, aspect: float) -> None:
    thumb.parent.mkdir(parents=True, exist_ok=True)
    partial = thumb.with_name(f"{thumb.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    try:
        with Image.open(source) as img:
            prepared = _normalize_for_webp(img)
            prepared.thumbnail((width, int(width * aspect)), Image.Resampling.LANCZOS)
            prepared.save(partial, "WEBP", quality=82, method=4)
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


def serve_category_thumb(category: str, width: int, rel: str):
    """Serve an allow-listed category/width thumbnail or abort with 404."""
    spec = THUMB_SPECS.get(category)
    if spec is None or width not in spec.widths:
        abort(404)
    return serve_thumb(spec.subdir, rel, width, aspect=spec.aspect)


def _resolve_static_root(static_root: Path | None) -> Path:
    if static_root is not None:
        return Path(static_root).resolve()
    if has_app_context() and current_app.static_folder:
        return Path(current_app.static_folder).resolve()
    return (Path(__file__).resolve().parents[1] / "static").resolve()


def _warm_one(source: Path, thumb: Path, width: int, aspect: float) -> str:
    try:
        with _lock_for(thumb):
            if _is_current(thumb, source):
                return "skipped"
            _write_thumb(source, thumb, width, aspect)
            return "generated"
    except Exception:
        logger.warning("Failed to warm thumbnail for %s -> %s", source, thumb, exc_info=True)
        return "failed"


def _prune_orphan_thumbs(thumb_root: Path, expected: set[Path]) -> int:
    if not thumb_root.is_dir():
        return 0
    pruned = 0
    for entry in sorted(thumb_root.rglob("*"), reverse=True):
        if entry.is_file():
            if entry not in expected:
                entry.unlink(missing_ok=True)
                pruned += 1
        elif entry.is_dir():
            try:
                entry.rmdir()
            except OSError:
                pass
    return pruned


def warm_all_thumbs(
    static_root: Path | None = None,
    prune_orphans: bool = False,
    workers: int = 4,
) -> dict[str, int]:
    """Pre-generate missing/stale thumbnails across all ``THUMB_SPECS`` categories."""
    resolved_static = _resolve_static_root(static_root)
    stats = {"generated": 0, "skipped": 0, "pruned": 0, "failed": 0}

    tasks: list[tuple[Path, Path, int, float]] = []
    expected_by_root: dict[Path, set[Path]] = {}

    for spec in THUMB_SPECS.values():
        root = (resolved_static / spec.subdir).resolve()
        if not root.is_dir():
            continue
        expected = expected_by_root.setdefault(root, set())
        for source in root.rglob("*"):
            if not source.is_file():
                continue
            rel_path = source.relative_to(root)
            if THUMB_ROOT in rel_path.parts or source.suffix.lower() not in _ALLOWED:
                continue
            rel_posix = rel_path.as_posix()
            for width in spec.widths:
                thumb = _thumb_path(root, width, rel_posix)
                expected.add(thumb)
                if _is_current(thumb, source):
                    stats["skipped"] += 1
                else:
                    tasks.append((source, thumb, width, spec.aspect))

    if tasks:
        with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
            futures = [
                executor.submit(_warm_one, source, thumb, width, aspect)
                for source, thumb, width, aspect in tasks
            ]
            for future in as_completed(futures):
                outcome = future.result()
                stats[outcome] += 1

    if prune_orphans:
        for root, expected in expected_by_root.items():
            stats["pruned"] += _prune_orphan_thumbs(root / THUMB_ROOT, expected)

    return stats


def warm_all_thumbs_async(static_root: Path | None = None) -> bool:
    """Spawn a background daemon thread to warm all thumbnails if one isn't running."""
    global _warm_running
    with _warm_lock:
        if _warm_running:
            return False
        _warm_running = True

    resolved_static = _resolve_static_root(static_root)

    def _run() -> None:
        global _warm_running
        try:
            warm_all_thumbs(static_root=resolved_static)
        except Exception:
            logger.exception("Unhandled error in background thumbnail warmer")
        finally:
            with _warm_lock:
                _warm_running = False

    thread = threading.Thread(target=_run, name="thumb-warmer", daemon=True)
    thread.start()
    return True
