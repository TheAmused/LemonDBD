# backend/tests/unit/services/test_asset_bundling.py
import base64
from pathlib import Path
import pytest
from app.services.db.asset_bundling import get_static_dir, read_asset_base64, write_asset_base64


def test_get_static_dir_points_at_app_static() -> None:
    static_dir = get_static_dir()
    assert static_dir.name == "static"
    assert static_dir.parent.name == "app"


def test_read_asset_base64_returns_none_for_missing_path(tmp_path: Path) -> None:
    assert read_asset_base64(tmp_path, None) is None
    assert read_asset_base64(tmp_path, "") is None
    assert read_asset_base64(tmp_path, "icons/perks/does_not_exist.webp") is None


def test_read_asset_base64_reads_existing_file(tmp_path: Path) -> None:
    icon_dir = tmp_path / "icons" / "perks"
    icon_dir.mkdir(parents=True)
    raw = b"\x89PNGfake-bytes-for-test"
    (icon_dir / "example.webp").write_bytes(raw)

    encoded = read_asset_base64(tmp_path, "icons/perks/example.webp")

    assert encoded == base64.b64encode(raw).decode("ascii")


def test_write_asset_base64_noop_for_missing_data(tmp_path: Path) -> None:
    write_asset_base64(tmp_path, "icons/perks/example.webp", None)
    write_asset_base64(tmp_path, None, "not-empty")
    assert not (tmp_path / "icons").exists()


def test_write_asset_base64_creates_parent_dirs_and_file(tmp_path: Path) -> None:
    raw = b"restored-bytes"
    encoded = base64.b64encode(raw).decode("ascii")

    write_asset_base64(tmp_path, "icons/powers/hillbilly.webp", encoded)

    written = tmp_path / "icons" / "powers" / "hillbilly.webp"
    assert written.read_bytes() == raw


def test_write_asset_base64_rejects_path_escaping_static_dir(tmp_path: Path) -> None:
    encoded = base64.b64encode(b"x").decode("ascii")
    with pytest.raises(ValueError, match="escapes static dir"):
        write_asset_base64(tmp_path, "../../etc/passwd", encoded)
