# backend/tests/unit/perks/test_chase_music_cache.py
"""The on-disk chase-music cache: URL-keyed files, failure backoff, catalog generation."""
from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from app.core import redis_cache
from app.services.minigames import chase_music
from app.services.minigames.chase_music import ChaseMusicUnavailable, ensure_track, track_filename
from tests.unit.conftest import make_chapter


def _killer(url: str = "https://wiki.example/a.mp3", killer_id: int = 3):
    return SimpleNamespace(id=killer_id, name="The Trapper", chase_music_url=url)


@pytest.fixture(autouse=True)
def isolated(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(chase_music, "_failed_until", {})
    monkeypatch.setattr(chase_music, "update_killer_chase_music", lambda *_: None)


def test_a_changed_source_url_is_a_different_file() -> None:
    assert track_filename(_killer("https://wiki.example/a.mp3")) != track_filename(_killer("https://wiki.example/b.mp3"))
    assert track_filename(_killer()).startswith("killer_3_the_trapper_")


def test_a_cached_track_is_served_without_downloading(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    killer = _killer()
    (tmp_path / track_filename(killer)).write_bytes(b"mp3")
    monkeypatch.setattr(chase_music, "_download", lambda *_: pytest.fail("must not download"))

    assert ensure_track(killer, str(tmp_path)) == track_filename(killer)


def test_the_previous_urls_file_is_removed_once_the_new_one_is_stored(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    old = _killer("https://wiki.example/old.mp3")
    (tmp_path / track_filename(old)).write_bytes(b"old")
    new = _killer("https://wiki.example/new.mp3")
    monkeypatch.setattr(chase_music, "_download", lambda url, dest: Path(dest).write_bytes(b"new"))

    name = ensure_track(new, str(tmp_path))

    assert sorted(p.name for p in tmp_path.iterdir()) == [name]


def test_a_failed_download_is_not_retried_until_the_backoff_ends(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    attempts: list[str] = []

    def failing(url: str, dest: str) -> None:
        attempts.append(url)
        raise OSError("wiki is down")

    monkeypatch.setattr(chase_music, "_download", failing)
    killer = _killer()

    for _ in range(3):
        with pytest.raises(ChaseMusicUnavailable):
            ensure_track(killer, str(tmp_path))

    assert len(attempts) == 1


def test_a_successful_download_moves_the_catalog_generation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, app, db_session
) -> None:
    """The local path is part of the character JSON the cached endpoints serve."""
    from app.models import Killer
    from app.services.minigames.daily import update_killer_chase_music

    monkeypatch.setattr(redis_cache, "get_client", lambda: None)
    killer = Killer(id=1, name="The Trapper", chapter_id=make_chapter(db_session).id, power_name="Bear Trap")
    db_session.add(killer)
    db_session.commit()
    before = redis_cache.catalog_version()

    update_killer_chase_music(1, "audio/cache/x.mp3")

    assert redis_cache.catalog_version() > before
