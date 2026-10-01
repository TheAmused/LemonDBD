# backend/app/routes/avatars.py
from flask import Blueprint

from app.utils.thumbnails import serve_thumb

avatars_bp = Blueprint("avatars", __name__, url_prefix="/api/v1/avatars")

# The character grid shows avatars at ~150-250 px; 256 px stays sharp on 2x screens
# for the smallest cards without making the browser decode 512 px bitmaps by the dozen.
THUMB_WIDTH = 256


@avatars_bp.route("/thumb/<path:rel>", methods=["GET"])
def get_avatar_thumb(rel: str):
    """A small WebP copy of a character avatar (cached on disk after the first request)."""
    return serve_thumb("avatars", rel, THUMB_WIDTH, aspect=2.0)
