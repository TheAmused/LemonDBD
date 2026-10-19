# backend/app/services/minigames/chase_music.py
"""Local copies of the wiki's killer chase-music tracks."""
import hashlib
import logging
import os
import re
import threading
import time
import urllib.request

from app.models.character import Killer
from app.services.minigames.daily import update_killer_chase_music

logger = logging.getLogger(__name__)

#: After a failed download the wiki is left alone for this long, so a wiki outage
#: costs one 12 s attempt per killer per window instead of one per request.
FAILURE_BACKOFF_SECONDS = 300
DOWNLOAD_TIMEOUT_SECONDS = 12

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
_REFERER = "https://deadbydaylight.wiki.gg/wiki/Terror_Radius"

_guard = threading.Lock()
_locks: dict[int, threading.Lock] = {}
_failed_until: dict[int, float] = {}


class ChaseMusicUnavailable(Exception):
    """The track is not cached and could not be fetched."""


def track_filename(killer: Killer) -> str:
    """`killer_<id>_<name>_<url hash>.mp3`: a changed source URL is a new file.

    Without the hash, repointing `chase_music_url` kept serving the old audio
    from the file the previous URL had produced.
    """
    slug = re.sub(r"[^a-z0-9]+", "_", killer.name.lower()).strip("_")
    digest = hashlib.sha1((killer.chase_music_url or "").encode("utf-8")).hexdigest()[:8]
    return f"killer_{killer.id}_{slug}_{digest}.mp3"


def _lock_for(killer_id: int) -> threading.Lock:
    with _guard:
        return _locks.setdefault(killer_id, threading.Lock())


def _download(url: str, destination: str) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT, "Referer": _REFERER})
    partial = f"{destination}.{os.getpid()}.{threading.get_ident()}.tmp"
    try:
        with urllib.request.urlopen(request, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
            data = response.read()
        if not data:
            raise ChaseMusicUnavailable("the wiki returned an empty file")
        with open(partial, "wb") as handle:
            handle.write(data)
        os.replace(partial, destination)
    finally:
        if os.path.exists(partial):
            os.remove(partial)


def _remove_superseded(cache_dir: str, killer_id: int, keep: str) -> None:
    prefix = f"killer_{killer_id}_"
    for name in os.listdir(cache_dir):
        if name.startswith(prefix) and name.endswith(".mp3") and name != keep:
            os.remove(os.path.join(cache_dir, name))


def ensure_track(killer: Killer, cache_dir: str) -> str:
    """The cached file name for `killer`'s track, downloading it when missing.

    Raises `ChaseMusicUnavailable` when it cannot be fetched.
    """
    filename = track_filename(killer)
    path = os.path.join(cache_dir, filename)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return filename

    with _lock_for(killer.id):
        # Another request may have finished the download while this one waited.
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return filename
        if _failed_until.get(killer.id, 0.0) > time.monotonic():
            raise ChaseMusicUnavailable("the wiki was unreachable a moment ago; try again shortly")
        try:
            _download(killer.chase_music_url or "", path)
        except Exception as exc:
            _failed_until[killer.id] = time.monotonic() + FAILURE_BACKOFF_SECONDS
            logger.error("Failed to fetch audio for %s from wiki: %s", killer.name, exc)
            raise ChaseMusicUnavailable(str(exc)) from exc
        _failed_until.pop(killer.id, None)
        _remove_superseded(cache_dir, killer.id, keep=filename)
        update_killer_chase_music(killer.id, f"audio/cache/{filename}")
    return filename
