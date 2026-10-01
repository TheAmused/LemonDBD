# backend/app/schemas/common.py
"""Small validators shared across admin-authoring schemas.

`clean_image_url` started out duplicated inside `tier_list.py`; it moved here
once `smash_or_pass.py`'s admin-create schema needed the exact same rule
(https:// URLs, raster data:image/* up to a size cap, or a same-origin
/static/... path -- otherwise dropped rather than rejected) for roster covers
and entity media.
"""
from __future__ import annotations

import re

_DATA_IMAGE_PATTERN = re.compile(r"^data:image/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$")
_MAX_DATA_IMAGE_CHARS = 131_072


def clean_image_url(value: str | None) -> str | None:
    """`https:` URLs, raster `data:image/*` up to the size cap, or a
    same-origin `/static/...` path. Anything else -- and anything at
    all when `value` is falsy -- becomes None rather than an error."""
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    if value.startswith("data:"):
        return value if len(value) <= _MAX_DATA_IMAGE_CHARS and _DATA_IMAGE_PATTERN.match(value) else None
    if value.startswith("/static/"):
        return value if ".." not in value and "//" not in value else None
    if len(value) > 2048:
        return None
    return value if value.startswith("https://") else None
