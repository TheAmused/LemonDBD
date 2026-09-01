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


def is_webp(content: bytes) -> bool:
    return len(content) >= 12 and content[:4] == WEBP_MAGIC_RIFF and content[8:12] == WEBP_MAGIC_WEBP


def is_png(content: bytes) -> bool:
    return content[:8] == PNG_MAGIC


def ensure_format_bytes(content: bytes, relative_path: str, quality: int = 92) -> bytes:
    """Make `content` match the extension of `relative_path` (.webp or .png).

    Returns the bytes unchanged if they're already valid for that format,
    otherwise decodes and re-encodes. Falls back to the original bytes if
    Pillow can't decode them (and logs a warning) so callers never crash
    on a bad/unexpected download.
    """
    suffix = relative_path.lower()
    if suffix.endswith(".webp"):
        if is_webp(content):
            return content
        try:
            return to_webp_bytes(content, quality=quality)
        except Exception as err:
            logger.warning(f"Could not re-encode [{relative_path}] to WebP: {err}")
            return content
    if suffix.endswith(".png"):
        if is_png(content):
            return content
        try:
            return to_png_bytes(content)
        except Exception as err:
            logger.warning(f"Could not re-encode [{relative_path}] to PNG: {err}")
            return content
    return content


def save_webp(image_bytes: bytes, output_path: str | Path, quality: int = 90) -> Path:
    """Convert `image_bytes` to WebP and write it to `output_path` (suffix forced to .webp)."""
    target_path = Path(output_path).with_suffix(".webp")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(to_webp_bytes(image_bytes, quality=quality))
    return target_path


_perk_frame_template_cache: Image.Image | None = None


def get_perk_frame_template(template_path: Path) -> Image.Image | None:
    """Retrieve and cache the diamond-frame template used to composite perk icons."""
    global _perk_frame_template_cache
    if _perk_frame_template_cache is None and template_path.exists():
        _perk_frame_template_cache = Image.open(template_path).convert("RGBA")
    return _perk_frame_template_cache


def composite_perk_diamond_frame(icon_bytes: bytes, template_path: Path, quality: int = 92) -> bytes:
    """Composite a perk icon onto the canonical diamond frame and export as WebP.

    Falls back to a plain WebP re-encode of the icon (no frame) if the
    template is missing, and to the original bytes if decoding fails entirely.
    """
    template = get_perk_frame_template(template_path)
    if template is None:
        try:
            return to_webp_bytes(icon_bytes, quality=quality)
        except Exception:
            return icon_bytes

    try:
        size = template.size[0]
        canvas = template.copy()

        with Image.open(io.BytesIO(icon_bytes)) as icon:
            icon_rgba = icon.convert("RGBA")
            icon_size = int(size * 0.85)
            icon_resized = icon_rgba.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
            offset = ((size - icon_size) // 2, (size - icon_size) // 2)
            canvas.alpha_composite(icon_resized, offset)

        out_buf = io.BytesIO()
        canvas.save(out_buf, format="WEBP", quality=quality, method=6)
        return out_buf.getvalue()
    except Exception as err:
        logger.warning(f"Could not composite perk diamond frame: {err}")
        return icon_bytes
