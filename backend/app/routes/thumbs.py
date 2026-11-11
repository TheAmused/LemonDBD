# backend/app/routes/thumbs.py
from flask import Blueprint

from app.utils.thumbnails import serve_category_thumb

thumbs_bp = Blueprint("thumbs", __name__, url_prefix="/api/v1/thumbs")


@thumbs_bp.route("/<string:category>/<int:width>/<path:rel>", methods=["GET"])
def get_thumb(category: str, width: int, rel: str):
    """Serve an allow-listed on-demand WebP thumbnail for a static asset."""
    return serve_category_thumb(category, width, rel)
