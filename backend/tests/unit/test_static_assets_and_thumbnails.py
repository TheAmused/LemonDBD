# backend/tests/unit/test_static_assets_and_thumbnails.py
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
