# backend/tests/unit/test_image_proxy_safety.py
"""The smash-or-pass image proxy must only ever serve verified raster images
from public hosts (2026-10-19 review, H2)."""
import pytest
from flask import Flask

from app.routes import smash_or_pass as sop
from app.utils import network
from app.utils.safe_fetch import FetchedImage, FetchRefused, fetch_public_image, sniff_raster_mimetype

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


@pytest.mark.unit
class TestSniff:
    @pytest.mark.parametrize(
        "head,expected",
        [
            (PNG, "image/png"),
            (b"\xff\xd8\xff\xe0" + b"\x00" * 12, "image/jpeg"),
            (b"GIF89a" + b"\x00" * 10, "image/gif"),
            (b"RIFF\x00\x00\x00\x00WEBPVP8 ", "image/webp"),
            (b"\x00\x00\x00\x1cftypavif\x00\x00", "image/avif"),
            (SVG, None),
            (b"<!doctype html><script>", None),
        ],
    )
    def test_only_raster_magic_is_accepted(self, head: bytes, expected: str | None) -> None:
        assert sniff_raster_mimetype(head[:16]) == expected


@pytest.mark.unit
class TestHostChecks:
    @pytest.mark.parametrize(
        "host", ["localhost", "redis", "127.0.0.1", "10.1.2.3", "169.254.169.254", "::1", "::ffff:127.0.0.1", "x.internal"]
    )
    def test_internal_hosts_are_refused(self, host: str) -> None:
        assert network.resolve_public_addresses(host) == []
        assert network.is_private_host(host)

    def test_a_name_resolving_to_any_private_address_is_refused(self, monkeypatch) -> None:
        monkeypatch.setattr(
            network.socket,
            "getaddrinfo",
            lambda *_a, **_k: [(2, 1, 6, "", ("93.184.216.34", 0)), (2, 1, 6, "", ("10.0.0.5", 0))],
        )
        assert network.resolve_public_addresses("rebind.example") == []

    def test_fetch_refuses_internal_hosts_before_connecting(self) -> None:
        with pytest.raises(FetchRefused) as err:
            fetch_public_image("https://127.0.0.1/x.png", max_bytes=1024)
        assert err.value.status == 403

    def test_fetch_refuses_other_schemes(self) -> None:
        with pytest.raises(FetchRefused):
            fetch_public_image("file:///etc/passwd", max_bytes=1024)


@pytest.mark.unit
class TestProxyRoute:
    def test_svg_is_refused(self, app: Flask, monkeypatch) -> None:
        sop.proxy_rate_limiter.reset()

        def fake_fetch(url, max_bytes):
            raise FetchRefused("Not a supported raster image", 415)

        monkeypatch.setattr(sop, "fetch_public_image", fake_fetch)
        res = app.test_client().get("/api/v1/smash-or-pass/proxy-image?url=https://evil.example/x.svg")
        assert res.status_code == 415
        assert res.mimetype == "application/json"

    def test_raster_is_served_with_lockdown_headers(self, app: Flask, monkeypatch) -> None:
        sop.proxy_rate_limiter.reset()
        monkeypatch.setattr(sop, "fetch_public_image", lambda url, max_bytes: FetchedImage(PNG, "image/png"))
        res = app.test_client().get("/api/v1/smash-or-pass/proxy-image?url=https://cdn.example/x.png")
        assert res.status_code == 200
        assert res.mimetype == "image/png"
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert "sandbox" in res.headers["Content-Security-Policy"]
        assert res.headers.get("Access-Control-Allow-Origin") != "*"

    def test_every_api_response_is_nosniff(self, app: Flask) -> None:
        res = app.test_client().get("/api/v1/smash-or-pass/taxonomies")
        assert res.headers["X-Content-Type-Options"] == "nosniff"
