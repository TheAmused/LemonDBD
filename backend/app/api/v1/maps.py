# backend/app/api/v1/maps.py
"""On-demand layout API for maps."""
from typing import Any
from werkzeug.exceptions import HTTPException, NotFound
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.models.map_layout import MapLayout
from app.schemas.map import MapLayoutDetailResponse
from app.routes.maps import maps_bp, get_map_layout

router = maps_bp

__all__ = ["maps_bp", "router", "get_map_layout"]
