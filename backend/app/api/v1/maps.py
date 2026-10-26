# backend/app/api/v1/maps.py
"""On-demand layout API for maps."""

from app.routes.maps import maps_bp, get_map_layout

router = maps_bp

__all__ = ["maps_bp", "router", "get_map_layout"]
