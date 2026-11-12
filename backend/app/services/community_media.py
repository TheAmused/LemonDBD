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
from typing import Any

from PIL import Image, UnidentifiedImageError

from app.utils.thumbnails import _lock_for, _normalize_for_webp, _resolve_static_root, warm_all_thumbs_async

logger = logging.getLogger(__name__)

MAX_DECODED_BYTES = 10 * 1024 * 1024
_DATA_IMAGE_RE = re.compile(
    r"^data:image/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=]+)$",
    re.IGNORECASE,
)


def _is_data_uri(value: str) -> bool:
    return value.strip().lower().startswith("data:")


def _is_ingested_community_url(original: str, normalized: str) -> bool:
    return _is_data_uri(original) and normalized.startswith("/static/uploads/community/")


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
    if not _is_data_uri(stripped):
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


def ingest_cover_image(
    value: str | None,
    max_side: int = 800,
    static_root: Path | None = None,
) -> tuple[str | None, bool, bool]:
    """Normalize a cover image URL; return ``(normalized_url, invalid_non_empty, ingested)``."""
    if not isinstance(value, str) or not value.strip():
        return value, False, False
    normalized = ingest_community_image(value, max_side=max_side, static_root=static_root)
    if normalized is None:
        return None, True, False
    return normalized, False, _is_ingested_community_url(value, normalized)


def ingest_dict_media_urls(
    items: list[dict[str, Any]],
    key: str,
    max_side: int = 512,
    static_root: Path | None = None,
) -> bool:
    """Normalize ``item[key]`` in place across item/entity dicts; return True if any was ingested."""
    ingested = False
    for item in items:
        orig_url = item.get(key)
        if isinstance(orig_url, str) and orig_url.strip():
            normalized = ingest_community_image(orig_url, max_side=max_side, static_root=static_root)
            if normalized is None:
                item.pop(key, None)
            else:
                item[key] = normalized
                if _is_ingested_community_url(orig_url, normalized):
                    ingested = True
    return ingested


def warm_community_thumbs_async(static_folder: str | Path | None) -> None:
    """Best-effort trigger for background thumbnail warming after community media ingest."""
    try:
        static_root = Path(static_folder) if static_folder else None
        warm_all_thumbs_async(static_root)
    except Exception:
        logger.warning("Failed to trigger thumbnail warming after community media ingest", exc_info=True)
