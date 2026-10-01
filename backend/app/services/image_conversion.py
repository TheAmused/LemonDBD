"""backend/app/services/image_conversion.py

Single home for all raster image conversion/normalization used by the
scrapers and asset pipeline. Consolidates what used to be split across
app/scrapers/utils.py (convert_bytes_to_webp, save_image_as_webp,
auto_save_webp) and app/services/scraper/assets.py
(normalise_image_bytes, apply_perk_diamond_frame's encoding step).

Storage format policy (unchanged by this refactor):
- Scraped character/perk/power/item/addon/offering/map/roster assets are
  normalized to WebP by the scraper pipeline (see app/services/scraper/assets.py).
- User-uploaded avatars are saved as WebP (see app/services/user/avatar.py).
- The perk diamond frame template itself stays PNG on disk (source art),
  but composited perk icons are exported as WebP.
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)

WEBP_MAGIC_RIFF = b"RIFF"
WEBP_MAGIC_WEBP = b"WEBP"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _flatten_for_encode(img: Image.Image) -> Image.Image:
    """Normalize a Pillow image to RGBA (if it carries transparency) or RGB."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        return img.convert("RGBA")
    return img.convert("RGB")


def to_webp_bytes(image_bytes: bytes, quality: int = 90, method: int = 6) -> bytes:
    """Decode arbitrary raster image bytes and re-encode as WebP bytes."""
    with Image.open(io.BytesIO(image_bytes)) as img:
        flattened = _flatten_for_encode(img)
        out_buf = io.BytesIO()
        flattened.save(out_buf, format="WEBP", quality=quality, method=method)
        return out_buf.getvalue()


def to_png_bytes(image_bytes: bytes) -> bytes:
    """Decode arbitrary raster image bytes and re-encode as PNG bytes."""
    with Image.open(io.BytesIO(image_bytes)) as img:
        out_buf = io.BytesIO()
        img.convert("RGBA").save(out_buf, format="PNG")
        return out_buf.getvalue()


def trim_transparent_padding(image_bytes: bytes, padding: int = 12) -> bytes:
    """Crop out fully-transparent padding around an image's actual content.

    Some source images ship on a much larger canvas than their visible
    content, which makes `object-fit: contain` scale the mostly-empty canvas
    instead of the content. Crops to the alpha channel's bounding box (not a
    whole-image getbbox(), since transparent areas can carry non-zero RGB)
    plus a small margin. A no-op for an opaque image or one with no content.
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        rgba = img.convert("RGBA")
        alpha_bbox = rgba.split()[-1].getbbox()
        if alpha_bbox is None:
            return image_bytes
        left, top, right, bottom = alpha_bbox
        if (left, top, right, bottom) == (0, 0, rgba.width, rgba.height):
            return image_bytes
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(rgba.width, right + padding)
        bottom = min(rgba.height, bottom + padding)
        cropped = rgba.crop((left, top, right, bottom))
        out_buf = io.BytesIO()
        cropped.save(out_buf, format="PNG")
        return out_buf.getvalue()


def is_webp(content: bytes) -> bool:
    return len(content) >= 12 and content[:4] == WEBP_MAGIC_RIFF and content[8:12] == WEBP_MAGIC_WEBP


def is_png(content: bytes) -> bool:
    return content[:8] == PNG_MAGIC


_perk_frame_template_cache: Image.Image | None = None


def get_perk_frame_template(template_path: Path) -> Image.Image | None:
    """Retrieve and cache the diamond-frame template used to composite perk icons."""
    global _perk_frame_template_cache
    if _perk_frame_template_cache is None and template_path.exists():
        _perk_frame_template_cache = Image.open(template_path).convert("RGBA")
    return _perk_frame_template_cache


