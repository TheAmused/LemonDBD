# backend/app/utils/safe_fetch.py
"""Fetching a third-party image on a visitor's behalf without becoming an
SSRF pivot or an XSS host.

* The host is resolved ONCE, every address checked, and the connection made
  to that checked address (TLS still verifies the real hostname via SNI), so
  a DNS-rebinding name cannot pass the check and then point at `db`/`redis`.
* No redirects, a byte cap enforced while streaming, a hard timeout.
* The result is only accepted if its first bytes are a raster image we can
  name (PNG/JPEG/GIF/WebP/AVIF); the upstream Content-Type is ignored. SVG and
  HTML are therefore refused however they are labelled.
"""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlsplit

import certifi
import urllib3

from app.utils.network import resolve_public_addresses

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class FetchRefused(Exception):
    """The URL or the response was not acceptable. `status` is the HTTP status to answer with."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


@dataclass
class FetchedImage:
    body: bytes
    mimetype: str


def sniff_raster_mimetype(head: bytes) -> str | None:
    """The image type the leading bytes prove, or None. Never trusts a label."""
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if len(head) >= 12 and head[4:8] == b"ftyp" and head[8:12] in (b"avif", b"avis"):
        return "image/avif"
    return None


def fetch_public_image(url: str, *, max_bytes: int, timeout: float = 10.0) -> FetchedImage:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise FetchRefused("Only http and https protocols supported", 400)
    hostname = parts.hostname
    if not hostname or parts.username or parts.password:
        raise FetchRefused("Invalid URL", 400)
    try:
        port = parts.port or (443 if parts.scheme == "https" else 80)
    except ValueError:
        raise FetchRefused("Invalid URL", 400)

    addresses = resolve_public_addresses(hostname)
    if not addresses:
        raise FetchRefused("Host not allowed", 403)
    address = addresses[0]

    path = parts.path or "/"
    if parts.query:
        path = f"{path}?{parts.query}"
    host_header = hostname if parts.port is None else f"{hostname}:{port}"
    headers = {
        "Host": host_header,
        "User-Agent": _USER_AGENT,
        "Accept": "image/avif,image/webp,image/apng,image/*;q=0.8",
        "Referer": f"{parts.scheme}://{host_header}/",
    }
    url_timeout = urllib3.Timeout(connect=timeout, read=timeout)
    if parts.scheme == "https":
        pool = urllib3.HTTPSConnectionPool(
            address,
            port=port,
            server_hostname=hostname,
            assert_hostname=hostname,
            cert_reqs="CERT_REQUIRED",
            ca_certs=certifi.where(),
            timeout=url_timeout,
            retries=False,
        )
    else:
        pool = urllib3.HTTPConnectionPool(address, port=port, timeout=url_timeout, retries=False)

    try:
        resp = pool.urlopen("GET", path, headers=headers, redirect=False, preload_content=False)
    except urllib3.exceptions.HTTPError:
        raise FetchRefused("Could not fetch the image", 502)

    try:
        if 300 <= resp.status < 400:
            raise FetchRefused("Redirects are not allowed", 403)
        if resp.status >= 400:
            raise FetchRefused(f"Upstream returned status {resp.status}", 502)
        declared = resp.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > max_bytes:
            raise FetchRefused("Image exceeds maximum allowed size", 413)
        body = bytearray()
        for chunk in resp.stream(65536):
            body.extend(chunk)
            if len(body) > max_bytes:
                raise FetchRefused("Image exceeds maximum allowed size", 413)
    except urllib3.exceptions.HTTPError:
        raise FetchRefused("Could not fetch the image", 502)
    finally:
        resp.release_conn()
        pool.close()

    mimetype = sniff_raster_mimetype(bytes(body[:16]))
    if mimetype is None:
        raise FetchRefused("Not a supported raster image", 415)
    return FetchedImage(bytes(body), mimetype)
