# backend/tests/unit/bug_reports/test_bug_report_attachments.py
"""Bug report screenshots: only real images are kept, re-encoded; remote URLs are dropped."""
import base64
import os
from io import BytesIO
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from PIL import Image

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User
from app.services import site_settings


def _png_data_url(size=(32, 24)) -> str:
    buffer = BytesIO()
    Image.new("RGB", size, (200, 30, 30)).save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


@pytest.fixture
def headers(db_session) -> dict[str, str]:
    user = User(login="reporter", username="reporter", email="reporter@example.com", password_hash=hash_password("password123"))
    db.session.add(user)
    db.session.commit()
    return {"Authorization": f"Bearer {generate_token(user.id, role='user')}"}


def _submit(client: FlaskClient, headers: dict[str, str], images: list) -> list[str]:
    res = client.post("/api/v1/bug-reports", json={"title": "t", "message": "m", "images": images}, headers=headers)
    assert res.status_code == 201
    return res.get_json()["report"]["images"]


@pytest.mark.unit
def test_a_real_screenshot_is_stored_as_webp(app: Flask, client: FlaskClient, headers) -> None:
    [path] = _submit(client, headers, [_png_data_url()])
    # Stored privately and served by the attachment route, never under the public static folder.
    assert path.startswith("/api/v1/bug-reports/attachments/") and path.endswith(".webp")
    from app.services import bug_report_files

    stored = bug_report_files.upload_dir() / path.rsplit("/", 1)[1]
    assert Path(app.root_path) / "static" not in stored.parents
    try:
        with Image.open(stored) as img:
            assert img.format == "WEBP"
    finally:
        stored.unlink(missing_ok=True)


@pytest.mark.unit
def test_non_images_and_remote_urls_are_dropped(client: FlaskClient, headers) -> None:
    html = "data:image/png;base64," + base64.b64encode(b"<html><script>alert(1)</script></html>").decode()
    assert _submit(client, headers, [html, "https://evil.example/pixel.gif", "/static/anything.png", 42]) == []


@pytest.mark.unit
def test_at_most_three_screenshots_are_kept(app: Flask, client: FlaskClient, headers) -> None:
    paths = _submit(client, headers, [_png_data_url() for _ in range(5)])
    try:
        assert len(paths) == 3
    finally:
        for path in paths:
            (Path(app.root_path) / path.lstrip("/")).unlink(missing_ok=True)


@pytest.mark.unit
def test_the_screenshot_count_follows_the_admin_setting(app: Flask, client: FlaskClient, headers) -> None:
    site_settings.update_settings({"bug_report_max_images": 1})
    paths = _submit(client, headers, [_png_data_url() for _ in range(3)])
    try:
        assert len(paths) == 1
    finally:
        for path in paths:
            (Path(app.root_path) / path.lstrip("/")).unlink(missing_ok=True)


@pytest.mark.unit
def test_the_screenshot_size_follows_the_admin_setting(app: Flask, client: FlaskClient, headers) -> None:
    buffer = BytesIO()
    Image.frombytes("RGB", (700, 700), os.urandom(700 * 700 * 3)).save(buffer, format="PNG")  # about 1.4 MB
    shot = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
    paths = _submit(client, headers, [shot])  # under the 2 MB default
    try:
        assert len(paths) == 1
    finally:
        for path in paths:
            (Path(app.root_path) / path.lstrip("/")).unlink(missing_ok=True)
    site_settings.update_settings({"bug_report_image_max_mb": 1})
    assert _submit(client, headers, [shot]) == []


@pytest.mark.unit
def test_a_screenshot_can_be_made_mandatory(app: Flask, client: FlaskClient, headers) -> None:
    site_settings.update_settings({"bug_report_require_image": True})
    res = client.post("/api/v1/bug-reports", json={"title": "t", "message": "m", "images": []}, headers=headers)
    assert res.status_code == 400
    paths = _submit(client, headers, [_png_data_url()])
    try:
        assert len(paths) == 1
    finally:
        for path in paths:
            (Path(app.root_path) / path.lstrip("/")).unlink(missing_ok=True)


@pytest.mark.unit
def test_an_oversized_decoded_image_is_refused(client: FlaskClient, headers) -> None:
    big = "data:image/png;base64," + base64.b64encode(b"\x89PNG" + b"0" * (3 * 1024 * 1024)).decode()
    assert _submit(client, headers, [big]) == []
