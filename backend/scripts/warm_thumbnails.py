#!/usr/bin/env python3
"""Warm on-disk WebP thumbnails for all static assets under app/static."""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.utils.thumbnails import warm_all_thumbs  # noqa: E402


def _acquire_lock(lock_path: Path):
    if os.name == "nt":
        return None
    import fcntl

    fh = lock_path.open("w")
    try:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fh
    except OSError:
        fh.close()
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-generate static WebP thumbnails.")
    parser.add_argument("--prune", action="store_true", help="Remove orphaned files in _thumbs/")
    parser.add_argument("--quiet", action="store_true", help="Suppress summary output")
    parser.add_argument("--workers", type=int, default=4, help="Worker thread count")
    args = parser.parse_args()

    lock = _acquire_lock(Path("/tmp/lemon_warm_thumbs.lock"))
    if lock is False:
        return 0
    try:
        static_root = BACKEND_ROOT / "app" / "static"
        stats = warm_all_thumbs(static_root=static_root, prune_orphans=args.prune, workers=max(1, args.workers))
        if not args.quiet:
            print(
                f"[warm_thumbnails] generated={stats['generated']} "
                f"skipped={stats['skipped']} pruned={stats['pruned']} failed={stats['failed']}"
            )
        return 0
    finally:
        if lock:
            lock.close()


if __name__ == "__main__":
    raise SystemExit(main())
