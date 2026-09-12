# backend/app/services/maps/__init__.py
"""Map reads. Nothing here writes -- `app/seeds/static_db_seeder.py` is the
only seeder, and `seeder.py`/`data.py` next door are empty tombstones
explaining why the second one had to go."""
from app.services.maps.queries import fetch_maps, fetch_realms

__all__ = [
    "fetch_maps",
    "fetch_realms",
]
