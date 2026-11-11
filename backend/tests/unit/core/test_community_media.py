# backend/tests/unit/core/test_community_media.py
"""Tests for community media data-URL ingestion and admin route integration."""
from __future__ import annotations

import base64
import hashlib
from io import BytesIO
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.smash_or_pass import Entity, Roster
from app.models.tier_list import TierList
from app.models.user import User
from app.services import community_media


def _encode_data_url(raw: bytes, mime: str = "image/png") -> str:
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _make_png_bytes(size: tuple[int, int] = (40, 20), mode: str = "RGB", color=(200, 40, 40)) -> bytes:
    buf = BytesIO()
    Image.new(mode, size, color).save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes(size: tuple[int, int] = (100, 50), exif_orientation: int | None = None) -> bytes:
    buf = BytesIO()
    img = Image.new("RGB", size, (30, 120, 220))
    if exif_orientation is not None:
        exif = img.getexif()
        exif[274] = exif_orientation
        img.save(buf, format="JPEG", exif=exif)
    else:
        img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.unit
class TestIngestCommunityImage:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (None, None),
            ("", None),
            ("   \t\n  ", None),
            ("https://cdn.example.com/cover.png", "https://cdn.example.com/cover.png"),
            ("  http://example.com/img.jpg  ", "http://example.com/img.jpg"),
            ("/static/uploads/community/abc123.webp", "/static/uploads/community/abc123.webp"),
        ],
    )
    def test_non_data_values_pass_through_without_creating_files(
        self, tmp_path: Path, value: str | None, expected: str | None
    ) -> None:
        static_root = tmp_path / "static"

        result = community_media.ingest_community_image(value, static_root=static_root)

        assert result == expected
        assert not static_root.exists()

    def test_valid_png_is_converted_resized_and_saved_atomically_as_webp(self, tmp_path: Path) -> None:
        static_root = tmp_path / "static"
        raw = _make_png_bytes(size=(1600, 800))
        digest = hashlib.sha256(raw).hexdigest()[:16]
        data_url = _encode_data_url(raw, "image/png")

        result = community_media.ingest_community_image(data_url, max_side=800, static_root=static_root)

        expected_url = f"/static/uploads/community/{digest}.webp"
        expected_file = static_root / "uploads" / "community" / f"{digest}.webp"
        assert result == expected_url
        assert expected_file.is_file()
        # No leftover .tmp files
        assert [p.name for p in expected_file.parent.iterdir()] == [f"{digest}.webp"]

        with Image.open(expected_file) as saved:
            assert saved.format == "WEBP"
            assert saved.mode == "RGB"
            assert saved.size == (800, 400)

    def test_rgba_transparency_is_preserved_in_webp(self, tmp_path: Path) -> None:
        static_root = tmp_path / "static"
        img = Image.new("RGBA", (60, 60), (0, 0, 0, 0))
        for x in range(20, 40):
            for y in range(20, 40):
                img.putpixel((x, y), (255, 0, 0, 255))
        buf = BytesIO()
        img.save(buf, format="PNG")
        raw = buf.getvalue()
        digest = hashlib.sha256(raw).hexdigest()[:16]

        result = community_media.ingest_community_image(
            _encode_data_url(raw, "image/png"), max_side=512, static_root=static_root
        )

        assert result == f"/static/uploads/community/{digest}.webp"
        saved_path = static_root / "uploads" / "community" / f"{digest}.webp"
        with Image.open(saved_path) as saved:
            assert saved.format == "WEBP"
            assert saved.mode == "RGBA"
            assert saved.getpixel((0, 0))[3] == 0
            assert saved.getpixel((30, 30))[3] == 255

    def test_jpeg_exif_orientation_is_transposed(self, tmp_path: Path) -> None:
        static_root = tmp_path / "static"
        raw = _make_jpeg_bytes(size=(200, 100), exif_orientation=6)  # 90 deg CW -> portrait 100x200
        digest = hashlib.sha256(raw).hexdigest()[:16]

        result = community_media.ingest_community_image(
            _encode_data_url(raw, "image/jpeg"), max_side=800, static_root=static_root
        )

        assert result == f"/static/uploads/community/{digest}.webp"
        with Image.open(static_root / "uploads" / "community" / f"{digest}.webp") as saved:
            assert saved.size == (100, 200)

    def test_repeated_calls_with_identical_bytes_are_idempotent(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        static_root = tmp_path / "static"
        raw = _make_png_bytes(size=(120, 90))
        data_url = _encode_data_url(raw, "image/png")
        digest = hashlib.sha256(raw).hexdigest()[:16]

        first = community_media.ingest_community_image(data_url, static_root=static_root)
        target = static_root / "uploads" / "community" / f"{digest}.webp"
        first_mtime = target.stat().st_mtime_ns

        monkeypatch.setattr("app.services.community_media.os.replace", lambda *_: pytest.fail("overwrote existing file"))
        second = community_media.ingest_community_image(data_url, static_root=static_root)

        assert first == second == f"/static/uploads/community/{digest}.webp"
        assert target.stat().st_mtime_ns == first_mtime

    @pytest.mark.parametrize(
        "bad_value",
        [
            _encode_data_url(b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", "image/svg+xml"),
            _encode_data_url(b"hello world", "text/plain"),
            "data:image/png;base64,not-valid-base64!!!",
            "data:image/png;base64,",
            "data:image/png;charset=utf-8,abc",
            _encode_data_url(b"not actually image bytes", "image/png"),
        ],
    )
    def test_invalid_or_non_raster_data_urls_return_none(self, tmp_path: Path, bad_value: str) -> None:
        static_root = tmp_path / "static"

        result = community_media.ingest_community_image(bad_value, static_root=static_root)

        assert result is None
        assert not (static_root / "uploads" / "community").exists()

    def test_uppercase_data_prefix_is_handled_case_insensitively(self, tmp_path: Path) -> None:
        static_root = tmp_path / "static"
        raw = _make_png_bytes(size=(40, 40))
        digest = hashlib.sha256(raw).hexdigest()[:16]
        b64 = base64.b64encode(raw).decode("ascii")

        ok_result = community_media.ingest_community_image(
            f"DATA:image/png;base64,{b64}", static_root=static_root
        )
        assert ok_result == f"/static/uploads/community/{digest}.webp"
        assert (static_root / "uploads" / "community" / f"{digest}.webp").is_file()

        svg_b64 = base64.b64encode(b"<svg xmlns='http://www.w3.org/2000/svg'></svg>").decode("ascii")
        bad_result = community_media.ingest_community_image(
            f"DATA:image/svg+xml;base64,{svg_b64}", static_root=static_root
        )
        assert bad_result is None

        # Shared helpers recognize uppercase DATA: URIs as ingested community assets too
        cover_url, cover_invalid, cover_ingested = community_media.ingest_cover_image(
            f"DATA:image/png;base64,{b64}", static_root=static_root
        )
        assert cover_url == f"/static/uploads/community/{digest}.webp"
        assert cover_invalid is False
        assert cover_ingested is True

        items = [{"id": "1", "image_url": f"DATA:image/png;base64,{b64}"}]
        assert community_media.ingest_dict_media_urls(items, "image_url", static_root=static_root) is True
        assert items[0]["image_url"] == f"/static/uploads/community/{digest}.webp"

    def test_uses_current_app_static_folder_when_static_root_omitted(self, tmp_path: Path) -> None:
        app = Flask(__name__, static_folder=str(tmp_path / "app_static"))
        raw = _make_png_bytes(size=(30, 30))
        digest = hashlib.sha256(raw).hexdigest()[:16]

        with app.app_context():
            result = community_media.ingest_community_image(_encode_data_url(raw))

        assert result == f"/static/uploads/community/{digest}.webp"
        assert (tmp_path / "app_static" / "uploads" / "community" / f"{digest}.webp").is_file()


@pytest.mark.unit
class TestCommunityMediaRouteIngest:
    @pytest.fixture
    def admin_headers(self, app: Flask, db_session: Session) -> dict[str, str]:
        user = User(
            login="cm_admin",
            username="cm_admin",
            email="cm_admin@example.com",
            password_hash="hashed",
            role="admin",
        )
        db_session.add(user)
        db_session.commit()
        with app.app_context():
            token = generate_token(user.id, role="admin")
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture(autouse=True)
    def _sandbox_dirs(self, app: Flask, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        (tmp_path / "seeds" / "content").mkdir(parents=True, exist_ok=True)
        (tmp_path / "rosters").mkdir(parents=True, exist_ok=True)
        self.static_dir = tmp_path / "static"
        self.static_dir.mkdir(parents=True, exist_ok=True)

        monkeypatch.setattr(app, "static_folder", str(self.static_dir))
        monkeypatch.setattr("app.seeds.static_db_seeder.SEEDS_DATA_DIR", tmp_path / "seeds")
        monkeypatch.setattr("app.services.smash_or_pass_service.ROSTERS_DIR", tmp_path / "rosters")
        monkeypatch.setattr("app.seeds.smash_roster_seeder.ROSTERS_DIR", tmp_path / "rosters")

        self.warm_calls: list[Path | None] = []
        monkeypatch.setattr(
            "app.services.community_media.warm_all_thumbs_async",
            lambda static_root=None: self.warm_calls.append(static_root) or True,
        )

    def test_post_tier_list_ingests_cover_and_item_data_urls_and_warms_thumbs(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        cover_raw = _make_png_bytes(size=(1000, 500), color=(255, 0, 0))
        item_raw = _make_png_bytes(size=(700, 700), color=(0, 255, 0))
        cover_hash = hashlib.sha256(cover_raw).hexdigest()[:16]
        item_hash = hashlib.sha256(item_raw).hexdigest()[:16]

        res = client.post(
            "/api/v1/tier-lists",
            json={
                "title": "Ingest List",
                "cover_image_url": _encode_data_url(cover_raw),
                "tiers": [{"id": "s", "label": "S", "color": "s"}],
                "items": [{"id": "i1", "name": "Item 1", "image_url": _encode_data_url(item_raw)}],
            },
            headers=admin_headers,
        )

        assert res.status_code == 201
        data = res.get_json()["data"]
        expected_cover = f"/static/uploads/community/{cover_hash}.webp"
        expected_item = f"/static/uploads/community/{item_hash}.webp"
        assert data["cover_image_url"] == expected_cover
        assert data["custom_items"][0]["image_url"] == expected_item

        row = db_session.scalar(select(TierList).where(TierList.slug == data["slug"]))
        assert row is not None
        assert row.cover_image_url == expected_cover
        assert row.custom_items[0]["image_url"] == expected_item

        cover_file = self.static_dir / "uploads" / "community" / f"{cover_hash}.webp"
        item_file = self.static_dir / "uploads" / "community" / f"{item_hash}.webp"
        assert cover_file.is_file()
        assert item_file.is_file()
        with Image.open(cover_file) as im:
            assert im.size == (800, 400)
        with Image.open(item_file) as im:
            assert im.size == (512, 512)

        assert len(self.warm_calls) == 1
        assert self.warm_calls[0] == self.static_dir

    def test_patch_tier_list_ingests_updated_cover_and_items_and_rejects_corrupt_cover(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        create_res = client.post(
            "/api/v1/tier-lists",
            json={
                "title": "Patch Ingest List",
                "cover_image_url": "https://cdn.example.com/orig.png",
                "tiers": [{"id": "s", "label": "S", "color": "s"}],
                "items": [{"id": "i1", "name": "Item 1", "image_url": "https://cdn.example.com/i1.png"}],
            },
            headers=admin_headers,
        )
        assert create_res.status_code == 201
        assert self.warm_calls == []
        slug = create_res.get_json()["data"]["slug"]

        # Corrupt raster data URL on cover returns 400 without overwriting existing cover
        corrupt_b64 = base64.b64encode(b"not-a-real-png").decode("ascii")
        bad_res = client.patch(
            f"/api/v1/tier-lists/{slug}",
            json={"cover_image_url": f"data:image/png;base64,{corrupt_b64}"},
            headers=admin_headers,
        )
        assert bad_res.status_code == 400
        assert self.warm_calls == []

        new_cover = _make_png_bytes(size=(900, 450), color=(10, 20, 30))
        new_item = _make_png_bytes(size=(600, 300), color=(40, 50, 60))
        cover_hash = hashlib.sha256(new_cover).hexdigest()[:16]
        item_hash = hashlib.sha256(new_item).hexdigest()[:16]

        patch_res = client.patch(
            f"/api/v1/tier-lists/{slug}",
            json={
                "cover_image_url": _encode_data_url(new_cover),
                "items": [{"id": "i1", "name": "Item 1", "image_url": _encode_data_url(new_item)}],
            },
            headers=admin_headers,
        )

        assert patch_res.status_code == 200
        patched = patch_res.get_json()["data"]
        expected_cover = f"/static/uploads/community/{cover_hash}.webp"
        expected_item = f"/static/uploads/community/{item_hash}.webp"
        assert patched["cover_image_url"] == expected_cover
        assert patched["custom_items"][0]["image_url"] == expected_item

        db_session.expire_all()
        row = db_session.scalar(select(TierList).where(TierList.slug == slug))
        assert row is not None
        assert row.cover_image_url == expected_cover
        assert row.custom_items[0]["image_url"] == expected_item
        assert (self.static_dir / "uploads" / "community" / f"{cover_hash}.webp").is_file()
        assert (self.static_dir / "uploads" / "community" / f"{item_hash}.webp").is_file()
        assert len(self.warm_calls) == 1

    def test_post_smash_roster_ingests_cover_and_entity_media_and_warms_thumbs(
        self, client: FlaskClient, db_session: Session, admin_headers: dict[str, str]
    ) -> None:
        cover_raw = _make_png_bytes(size=(1200, 600), color=(90, 10, 200))
        entity_raw = _make_png_bytes(size=(640, 320), color=(20, 200, 90))
        cover_hash = hashlib.sha256(cover_raw).hexdigest()[:16]
        entity_hash = hashlib.sha256(entity_raw).hexdigest()[:16]

        res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json={
                "name": "Ingest Smash Roster",
                "cover_image_url": _encode_data_url(cover_raw),
                "entities": [
                    {"name": "Alpha", "role": "Survivor", "gender": "female", "media_url": _encode_data_url(entity_raw)},
                ],
            },
            headers=admin_headers,
        )

        assert res.status_code == 201
        data = res.get_json()["data"]
        expected_cover = f"/static/uploads/community/{cover_hash}.webp"
        expected_entity = f"/static/uploads/community/{entity_hash}.webp"
        assert data["cover_image_url"] == expected_cover
        assert data["entities"][0]["media_url"] == expected_entity

        roster = db_session.scalar(select(Roster).where(Roster.slug == data["slug"]))
        assert roster is not None
        assert roster.cover_image_url == expected_cover
        entity = db_session.scalar(select(Entity).where(Entity.roster_id == roster.id))
        assert entity is not None
        assert entity.media_url == expected_entity

        assert (self.static_dir / "uploads" / "community" / f"{cover_hash}.webp").is_file()
        with Image.open(self.static_dir / "uploads" / "community" / f"{entity_hash}.webp") as im:
            assert im.size == (512, 256)
        assert len(self.warm_calls) == 1
        assert self.warm_calls[0] == self.static_dir

    def test_corrupt_cover_returns_400_and_corrupt_item_or_entity_media_is_dropped(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        corrupt_data_url = f"data:image/png;base64,{base64.b64encode(b'corrupt-bytes').decode('ascii')}"

        bad_tl = client.post(
            "/api/v1/tier-lists",
            json={
                "title": "Bad Cover TL",
                "cover_image_url": corrupt_data_url,
                "tiers": [{"id": "s", "label": "S", "color": "s"}],
                "items": [{"id": "i1", "name": "Item 1"}],
            },
            headers=admin_headers,
        )
        assert bad_tl.status_code == 400
        assert bad_tl.get_json()["error"] == "Invalid cover image URL"

        bad_roster = client.post(
            "/api/v1/smash-or-pass/rosters",
            json={
                "name": "Bad Cover Roster",
                "cover_image_url": corrupt_data_url,
                "entities": [{"name": "Alpha"}],
            },
            headers=admin_headers,
        )
        assert bad_roster.status_code == 400
        assert bad_roster.get_json()["error"] == "Invalid cover image URL"

        ok_tl = client.post(
            "/api/v1/tier-lists",
            json={
                "title": "Corrupt Item TL",
                "tiers": [{"id": "s", "label": "S", "color": "s"}],
                "items": [{"id": "i1", "name": "Item 1", "image_url": corrupt_data_url}],
            },
            headers=admin_headers,
        )
        assert ok_tl.status_code == 201
        assert ok_tl.get_json()["data"]["custom_items"][0]["image_url"] == ""

        ok_roster = client.post(
            "/api/v1/smash-or-pass/rosters",
            json={
                "name": "Corrupt Entity Roster",
                "entities": [{"name": "Alpha", "media_url": corrupt_data_url}],
            },
            headers=admin_headers,
        )
        assert ok_roster.status_code == 201
        assert ok_roster.get_json()["data"]["entities"][0]["media_url"] is None
        assert self.warm_calls == []

    def test_warm_error_does_not_fail_routes(
        self, client: FlaskClient, admin_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def _boom(_static_root=None):
            raise RuntimeError("warmer failed")

        monkeypatch.setattr("app.services.community_media.warm_all_thumbs_async", _boom)

        tl_res = client.post(
            "/api/v1/tier-lists",
            json={
                "title": "Warmer Fail TL",
                "cover_image_url": _encode_data_url(_make_png_bytes()),
                "tiers": [{"id": "s", "label": "S", "color": "s"}],
                "items": [{"id": "i1", "name": "Item 1"}],
            },
            headers=admin_headers,
        )
        assert tl_res.status_code == 201

        roster_res = client.post(
            "/api/v1/smash-or-pass/rosters",
            json={
                "name": "Warmer Fail Roster",
                "cover_image_url": _encode_data_url(_make_png_bytes()),
                "entities": [{"name": "Alpha"}],
            },
            headers=admin_headers,
        )
        assert roster_res.status_code == 201

    def test_uppercase_data_uri_and_tier_background_ingest_through_routes(
        self, client: FlaskClient, admin_headers: dict[str, str]
    ) -> None:
        bg_data_url = _encode_data_url(_make_png_bytes((1200, 600), color=(140, 40, 200)))
        uppercase_bg = "DATA:" + bg_data_url[5:]

        create_res = client.post(
            "/api/v1/tier-lists",
            json={
                "title": "Tier BG Ingest",
                "tiers": [{"id": "s", "label": "S", "color": "s", "backgroundImage": uppercase_bg}],
                "items": [{"id": "i1", "name": "Item 1"}],
            },
            headers=admin_headers,
        )
        assert create_res.status_code == 201
        created = create_res.get_json()["data"]
        tier_bg = created["tiers"][0]["backgroundImage"]
        assert tier_bg.startswith("/static/uploads/community/")
        assert (self.static_dir / tier_bg.removeprefix("/static/")).is_file()
        assert len(self.warm_calls) == 1

        patch_bg = _encode_data_url(_make_png_bytes((1000, 500), color=(230, 120, 20)))
        patch_res = client.patch(
            f"/api/v1/tier-lists/{created['slug']}",
            json={"tiers": [{"id": "s", "label": "S", "color": "s", "backgroundImage": patch_bg}]},
            headers=admin_headers,
        )
        assert patch_res.status_code == 200
        updated_bg = patch_res.get_json()["data"]["tiers"][0]["backgroundImage"]
        assert updated_bg.startswith("/static/uploads/community/")
        assert updated_bg != tier_bg
        assert len(self.warm_calls) == 2
