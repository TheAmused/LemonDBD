# backend/scripts/normalize_export/bootstrap.py
"""Locations and the two leaf modules the conversion borrows from the app."""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))


def _load_module(module_name: str, relative_path: str):
    """Load one module by path, without importing the `app` package.

    `app/__init__.py` builds the whole Flask application. This is an offline
    data script; loading the two leaf modules it needs directly keeps it
    runnable with nothing but the standard library installed.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(module_name, BACKEND_ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


_matching = _load_module("_lemon_matching", "app/services/db/matching.py")
_parsing = _load_module("_lemon_parsing", "app/services/db/parsing.py")

chapter_key = _matching.chapter_key
name_key = _matching.name_key
normalize_dlc_type = _parsing.normalize_dlc_type
normalize_rarity = _parsing.normalize_rarity
parse_movement_speed = _parsing.parse_movement_speed
parse_release_date = _parsing.parse_release_date

#: The one copy of the baseline seed data that reaches the container.
#: `backend/Dockerfile` builds from the `backend/` directory alone, so nothing
#: under the repository root -- `data/static_export/` included -- is ever in the
#: image, and `/app/data` is an empty named volume. `static_db_seeder` reads
#: this directory (`SEEDS_DATA_DIR`), so this is the file set that is actually
#: seeded. Editing a copy anywhere else changes nothing.
DEFAULT_CONTENT_DIR = BACKEND_ROOT / "app" / "seeds" / "data" / "content"

BASE_GAME_NAME = "Base Game"
DEFAULT_SOURCE_CODE = "hens333"
DEFAULT_SOURCE_LABEL = "Hens333 12-Clock Callouts"

