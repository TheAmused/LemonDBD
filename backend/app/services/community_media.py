# backend/app/services/community_media.py
"""Ingests admin-submitted ``data:image/*`` URLs into disk-cached WebP assets."""
from __future__ import annotations

import base64
import binascii
import hashlib
import logging
import os
import re
import threading
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from app.utils.thumbnails import _lock_for, _normalize_for_webp, _resolve_static_root

logger = logging.getLogger(__name__)

MAX_DECODED_BYTES = 10 * 1024 * 1024
_DATA_IMAGE_RE = re.compile(
    r"^data:image/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=]+)$",
    re.IGNORECASE,
)


def ingest_community_image(
    value: str | None,
    max_side: int = 800,
    static_root: Path | None = None,
) -> str | None:
    """Convert a raster ``data:image/*;base64,...`` payload to a cached WebP file.

    Non-``data:`` strings are returned stripped; ``None`` or blank inputs return
    ``None``; invalid, non-raster, or corrupt ``data:`` payloads return ``None``.
    """
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    if not stripped:
        return None
    if not stripped.startswith("data:"):
        return stripped

    match = _DATA_IMAGE_RE.match(stripped)
    if not match:
        return None

    b64_payload = match.group(2)
    if len(b64_payload) > (MAX_DECODED_BYTES * 4 // 3) + 4:
        logger.warning("Rejected oversized community media data URL (%d chars)", len(b64_payload))
        return None

    try:
        raw_bytes = base64.b64decode(b64_payload, validate=True)
    except (binascii.Error, ValueError):
        logger.debug("Invalid base64 payload in community media data URL")
        return None

    if not raw_bytes or len(raw_bytes) > MAX_DECODED_BYTES:
        return None

    digest = hashlib.sha256(raw_bytes).hexdigest()[:16]
    resolved_root = _resolve_static_root(static_root)
    community_dir = resolved_root / "uploads" / "community"
    target_path = community_dir / f"{digest}.webp"
    public_url = f"/static/uploads/community/{digest}.webp"

    if target_path.is_file():
        return public_url

    side_limit = max(1, int(max_side))
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            prepared = _normalize_for_webp(img)
            prepared.thumbnail((side_limit, side_limit), Image.Resampling.LANCZOS)
            with _lock_for(target_path):
                if target_path.is_file():
                    return public_url
                community_dir.mkdir(parents=True, exist_ok=True)
                partial = target_path.with_name(
                    f"{target_path.name}.{os.getpid()}.{threading.get_ident()}.tmp"
                )
                try:
                    prepared.save(partial, "WEBP", quality=85, method=4)
                    os.replace(partial, target_path)
                finally:
                    partial.unlink(missing_ok=True)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        logger.warning("Failed to decode community image data URL: %s", exc)
        return None

    return public_url
