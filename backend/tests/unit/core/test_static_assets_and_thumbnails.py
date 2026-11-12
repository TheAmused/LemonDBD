# backend/tests/unit/core/test_static_assets_and_thumbnails.py
"""Cache headers for /static and the on-disk thumbnail cache."""
from __future__ import annotations

import os
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from PIL import Image

from app.core.static_files import STATIC_MAX_AGE, USER_CONTENT_MAX_AGE, static_max_age
from app.utils import thumbnails
from app.utils.thumbnails import serve_thumb


def _png(path: Path, color: str, size: tuple[int, int] = (400, 400)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color).save(path, "PNG")


@pytest.fixture
def static_app(tmp_path: Path) -> Flask:
    app = Flask(__name__, static_folder=str(tmp_path / "static"))
    app.get_send_file_max_age = static_max_age  # type: ignore[method-assign]

    @app.route("/thumb/<path:rel>")
    def thumb(rel: str):
        return serve_thumb("avatars", rel, 64)

    return app


@pytest.fixture
def static_client(static_app: Flask) -> FlaskClient:
    return static_app.test_client()


def test_static_files_get_one_cache_control_and_a_validator(static_app: Flask, static_client: FlaskClient) -> None:
    _png(Path(static_app.static_folder) / "avatars" / "a.png", "red")

    response = static_client.get("/static/avatars/a.png")

    assert response.headers.get_all("Cache-Control") == [f"public, max-age={STATIC_MAX_AGE}"]
    assert response.headers["ETag"]
    revalidated = static_client.get("/static/avatars/a.png", headers={"If-None-Match": response.headers["ETag"]})
    assert revalidated.status_code == 304


def test_user_uploads_are_kept_for_a_shorter_time_than_game_art(static_app: Flask, static_client: FlaskClient) -> None:
    _png(Path(static_app.static_folder) / "uploads" / "avatars" / "u.png", "blue")

    response = static_client.get("/static/uploads/avatars/u.png")

    assert response.headers["Cache-Control"] == f"public, max-age={USER_CONTENT_MAX_AGE}"
    assert USER_CONTENT_MAX_AGE < STATIC_MAX_AGE


def test_thumbnails_of_the_same_stem_do_not_share_a_file(static_app: Flask, static_client: FlaskClient) -> None:
    """x.png and x.webp used to map onto one thumbnail; whichever came first won."""
    root = Path(static_app.static_folder) / "avatars"
    _png(root / "x.png", "red", (200, 200))
    Image.new("RGB", (200, 200), "blue").save(root / "x.webp", "WEBP")

    from_png = static_client.get("/thumb/x.png")
    from_webp = static_client.get("/thumb/x.webp")

    def pixel(response) -> tuple[int, int, int]:
        from io import BytesIO

        return Image.open(BytesIO(response.data)).convert("RGB").getpixel((5, 5))

    assert pixel(from_png)[0] > 200 > pixel(from_png)[2]
    assert pixel(from_webp)[2] > 200 > pixel(from_webp)[0]
    assert from_png.headers["Cache-Control"] == f"public, max-age={thumbnails.THUMB_MAX_AGE}"


def test_an_unchanged_source_is_not_decoded_again(
    static_app: Flask, static_client: FlaskClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _png(Path(static_app.static_folder) / "avatars" / "x.png", "red", (200, 200))
    static_client.get("/thumb/x.png")
    monkeypatch.setattr(thumbnails, "_write_thumb", lambda *_: pytest.fail("regenerated an up-to-date thumbnail"))

    assert static_client.get("/thumb/x.png").status_code == 200


def test_a_source_restored_with_an_older_mtime_regenerates_its_thumbnail(
    static_app: Flask, static_client: FlaskClient
) -> None:
    source = Path(static_app.static_folder) / "avatars" / "x.png"
    _png(source, "red", (200, 200))
    assert static_client.get("/thumb/x.png").status_code == 200

    _png(source, "blue", (200, 200))
    os.utime(source, (1_000_000_000, 1_000_000_000))  # restored with an old mtime
    response = static_client.get("/thumb/x.png")

    from io import BytesIO

    red, _, blue = Image.open(BytesIO(response.data)).convert("RGB").getpixel((5, 5))
    assert blue > 200 > red


def test_a_failed_thumbnail_leaves_no_partial_file(static_app: Flask, static_client: FlaskClient) -> None:
    source = Path(static_app.static_folder) / "avatars" / "broken.png"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_bytes(b"not an image")

    with static_app.test_request_context("/thumb/broken.png"), pytest.raises(Exception):
        serve_thumb("avatars", "broken.png", 64)

    leftovers = list((Path(static_app.static_folder) / "avatars" / thumbnails.THUMB_ROOT).rglob("*"))
    assert [p for p in leftovers if p.is_file()] == []


def test_category_thumb_rejects_unknown_category_or_disallowed_width(tmp_path: Path) -> None:
    from app import create_app
    from app.core.config import TestingConfig

    app = create_app(TestingConfig)
    app.static_folder = str(tmp_path / "static")
    _png(Path(app.static_folder) / "chapters" / "dlc.png", "green", (1200, 675))
    client = app.test_client()

    assert client.get("/api/v1/thumbs/unknown/480/dlc.png").status_code == 404
    assert client.get("/api/v1/thumbs/chapters/9999/dlc.png").status_code == 404
    ok = client.get("/api/v1/thumbs/chapters/480/dlc.png")
    assert ok.status_code == 200
    assert ok.mimetype == "image/webp"


def test_palette_png_with_transparency_preserves_alpha_in_webp(static_app: Flask, static_client: FlaskClient) -> None:
    from io import BytesIO

    src = Path(static_app.static_folder) / "avatars" / "pal.png"
    src.parent.mkdir(parents=True, exist_ok=True)
    rgba = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    for x in range(50, 150):
        for y in range(50, 150):
            rgba.putpixel((x, y), (255, 0, 0, 255))
    rgba.convert("P", palette=Image.Palette.ADAPTIVE).save(src, "PNG")

    res = static_client.get("/thumb/pal.png")
    assert res.status_code == 200
    out = Image.open(BytesIO(res.data))
    assert out.mode in ("RGBA", "LA")
    assert out.convert("RGBA").getpixel((0, 0))[3] == 0


def test_warm_all_thumbs_creates_missing_and_prunes_orphans(tmp_path: Path) -> None:
    static_root = tmp_path / "static"
    _png(static_root / "chapters" / "c1.png", "red", (1920, 1080))
    orphan = static_root / "chapters" / thumbnails.THUMB_ROOT / "480" / "deleted.webp"
    orphan.parent.mkdir(parents=True, exist_ok=True)
    orphan.write_bytes(b"stale")

    stats = thumbnails.warm_all_thumbs(static_root=static_root, prune_orphans=True, workers=2)
    assert stats["generated"] >= 1
    assert stats["pruned"] == 1
    assert (static_root / "chapters" / thumbnails.THUMB_ROOT / "480" / "c1.png.webp").is_file()
    assert not orphan.exists()


def test_avatar_map_aliases_and_community_thumbs(tmp_path: Path) -> None:
    from io import BytesIO
    from app import create_app
    from app.core.config import TestingConfig

    app = create_app(TestingConfig)
    app.static_folder = str(tmp_path / "static")
    _png(Path(app.static_folder) / "avatars" / "dwight.png", "blue", (600, 600))
    _png(Path(app.static_folder) / "maps" / "macmillan" / "coal.png", "green", (800, 800))
    _png(Path(app.static_folder) / "uploads" / "community" / "card.png", "yellow", (600, 600))
    client = app.test_client()

    av = client.get("/api/v1/avatars/thumb/dwight.png")
    assert av.status_code == 200
    assert av.mimetype == "image/webp"
    assert Image.open(BytesIO(av.data)).size == (256, 256)

    mp = client.get("/api/v1/maps/thumb/macmillan/coal.png")
    assert mp.status_code == 200
    assert Image.open(BytesIO(mp.data)).size == (320, 320)

    cm = client.get("/api/v1/thumbs/community/128/card.png")
    assert cm.status_code == 200
    assert Image.open(BytesIO(cm.data)).size == (128, 128)

    assert client.get("/api/v1/thumbs/avatars/128/../maps/macmillan/coal.png").status_code == 404


def test_opaque_palette_and_exif_orientation_are_handled(static_app: Flask, static_client: FlaskClient) -> None:
    from io import BytesIO

    opaque = Path(static_app.static_folder) / "avatars" / "opaque_pal.png"
    opaque.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (200, 200), (10, 20, 30)).convert("P", palette=Image.Palette.ADAPTIVE).save(opaque, "PNG")

    res_pal = static_client.get("/thumb/opaque_pal.png")
    assert res_pal.status_code == 200
    assert Image.open(BytesIO(res_pal.data)).mode == "RGB"

    exif_jpg = Path(static_app.static_folder) / "avatars" / "rotated.jpg"
    img = Image.new("RGB", (200, 100), "purple")
    exif = img.getexif()
    exif[274] = 6  # 90 deg CW rotation metadata -> portrait 100x200
    img.save(exif_jpg, "JPEG", exif=exif)

    res_jpg = static_client.get("/thumb/rotated.jpg")
    assert res_jpg.status_code == 200
    w, h = Image.open(BytesIO(res_jpg.data)).size
    assert h > w


def test_warm_all_thumbs_skips_current_ignores_non_images_and_counts_failures(tmp_path: Path) -> None:
    static_root = tmp_path / "static"
    _png(static_root / "chapters" / "c1.png", "red", (600, 600))
    (static_root / "chapters" / "readme.txt").write_text("ignore", encoding="utf-8")
    broken = static_root / "chapters" / "broken.png"
    broken.write_bytes(b"corrupt")
    orphan = static_root / "chapters" / thumbnails.THUMB_ROOT / "999" / "stale.webp"
    orphan.parent.mkdir(parents=True, exist_ok=True)
    orphan.write_bytes(b"stale")

    first = thumbnails.warm_all_thumbs(static_root=static_root, prune_orphans=False, workers=2)
    assert first["generated"] == 1
    assert first["failed"] == 1
    assert first["pruned"] == 0
    assert orphan.exists()

    second = thumbnails.warm_all_thumbs(static_root=static_root, prune_orphans=True, workers=2)
    assert second["generated"] == 0
    assert second["skipped"] == 1
    assert second["failed"] == 1
    assert second["pruned"] == 1
    assert not orphan.exists()
    assert not orphan.parent.exists()


def test_warm_all_thumbs_async_guards_overlap_and_resets_after_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import threading

    entered = threading.Event()
    release = threading.Event()

    def fake_warm(static_root=None, prune_orphans=False, workers=4):
        entered.set()
        release.wait(timeout=5)
        raise RuntimeError("boom")

    monkeypatch.setattr(thumbnails, "warm_all_thumbs", fake_warm)

    assert thumbnails.warm_all_thumbs_async(static_root=tmp_path) is True
    assert entered.wait(timeout=2)
    assert thumbnails.warm_all_thumbs_async(static_root=tmp_path) is False
    release.set()

    # Wait briefly for worker finally block to clear _warm_running.
    deadline = threading.Event()
    for _ in range(50):
        with thumbnails._warm_lock:
            if not thumbnails._warm_running:
                break
        deadline.wait(0.02)

    entered.clear()
    assert thumbnails.warm_all_thumbs_async(static_root=tmp_path) is True
    assert entered.wait(timeout=2)
    for _ in range(50):
        with thumbnails._warm_lock:
            if not thumbnails._warm_running:
                break
        deadline.wait(0.02)
    assert thumbnails._warm_running is False
