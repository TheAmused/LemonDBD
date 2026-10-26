# backend/tests/unit/users/test_avatar_upload.py
"""Avatar uploads: a failed one keeps the old avatar, huge images are refused, errors stay generic."""
import os
from io import BytesIO

import pytest
from PIL import Image
from werkzeug.datastructures import FileStorage

from app.core.extensions import db
from app.core.security import hash_password
from app.models import User
from app.services.user.avatar import AVATAR_PROCESSING_FAILED, get_avatar_storage_directory, process_and_save_avatar


def _png(size=(64, 64)) -> BytesIO:
    buffer = BytesIO()
    Image.new("RGB", size, (10, 120, 200)).save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


@pytest.fixture
def user(db_session) -> User:
    account = User(login="face", username="face", email="face@example.com", password_hash=hash_password("password123"))
    db.session.add(account)
    db.session.commit()
    return account


def _cleanup(*urls: str | None) -> None:
    for url in urls:
        if url and url.startswith("/api/v1/auth/avatar/file/"):
            path = os.path.join(get_avatar_storage_directory(), url.rsplit("/", 1)[-1])
            if os.path.exists(path):
                os.remove(path)


@pytest.mark.unit
def test_a_failed_upload_keeps_the_previous_avatar(user: User) -> None:
    first, err = process_and_save_avatar(user.id, FileStorage(stream=_png(), filename="a.png"))
    assert err is None
    old_url = first.avatar_url
    old_path = os.path.join(get_avatar_storage_directory(), old_url.rsplit("/", 1)[-1])
    try:
        _, err = process_and_save_avatar(user.id, FileStorage(stream=BytesIO(b"not an image"), filename="b.png"))
        assert err == AVATAR_PROCESSING_FAILED
        db.session.expire_all()
        assert db.session.get(User, user.id).avatar_url == old_url
        assert os.path.exists(old_path)
    finally:
        _cleanup(old_url)


@pytest.mark.unit
def test_a_successful_upload_replaces_the_previous_file(user: User) -> None:
    first, _ = process_and_save_avatar(user.id, FileStorage(stream=_png(), filename="a.png"))
    first_url = first.avatar_url
    second, err = process_and_save_avatar(user.id, FileStorage(stream=_png((80, 40)), filename="b.png"))
    try:
        assert err is None and second.avatar_url != first_url
        assert not os.path.exists(os.path.join(get_avatar_storage_directory(), first_url.rsplit("/", 1)[-1]))
    finally:
        _cleanup(first_url, second.avatar_url)


@pytest.mark.unit
def test_an_image_declaring_too_many_pixels_is_refused_before_decoding(user: User, monkeypatch) -> None:
    import app.services.user.avatar as avatar

    monkeypatch.setattr(avatar, "MAX_AVATAR_PIXELS", 1000)
    _, err = process_and_save_avatar(user.id, FileStorage(stream=_png((64, 64)), filename="big.png"))
    assert err is not None and "megapixels" in err
    assert db.session.get(User, user.id).avatar_url == "default_avatar"
