# backend/tests/unit/test_avatar_url_hardening.py
"""The avatar is only ever set by an upload, and only the uploader's own file is ever deleted."""
import os

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User
from app.services.user.avatar import owned_avatar_filename, remove_stale_avatar_file


@pytest.mark.unit
def test_profile_update_cannot_set_an_avatar_url(client: FlaskClient, db_session) -> None:
    user = User(login="pix", username="pix", email="pix@example.com", password_hash=hash_password("password123"))
    db.session.add(user)
    db.session.commit()
    headers = {"Authorization": f"Bearer {generate_token(user.id, role='user')}"}

    res = client.put("/api/v1/auth/profile", json={"avatar_url": "https://evil.example/pixel.gif"}, headers=headers)
    assert res.status_code == 200
    db.session.expire_all()
    assert db.session.get(User, user.id).avatar_url == "default_avatar"


@pytest.mark.unit
@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("/api/v1/auth/avatar/file/avatar_u7_1700000000_abc123.webp", "avatar_u7_1700000000_abc123.webp"),
        ("/api/v1/auth/avatar/file/avatar_u8_1700000000_abc123.webp", None),
        ("/api/v1/auth/avatar/file/avatar_u70_1700000000_abc123.webp", None),
        ("/api/v1/auth/avatar/file/../avatar_u7_x.webp", None),
        ("https://evil.example/avatar_u7_x.webp", None),
        ("default_avatar", None),
        (None, None),
    ],
)
def test_owned_avatar_filename(url: str | None, expected: str | None) -> None:
    assert owned_avatar_filename(url, 7) == expected


@pytest.mark.unit
def test_someone_elses_file_is_never_deleted(tmp_path) -> None:
    theirs = tmp_path / "avatar_u8_1700000000_abc123.webp"
    theirs.write_bytes(b"x")
    remove_stale_avatar_file("/api/v1/auth/avatar/file/avatar_u8_1700000000_abc123.webp", str(tmp_path), 7)
    assert theirs.exists()

    mine = tmp_path / "avatar_u7_1700000000_abc123.webp"
    mine.write_bytes(b"x")
    remove_stale_avatar_file("/api/v1/auth/avatar/file/avatar_u7_1700000000_abc123.webp", str(tmp_path), 7)
    assert not os.path.exists(mine)
