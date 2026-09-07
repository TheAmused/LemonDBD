# backend/app/services/db/asset_bundling.py
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def get_static_dir() -> Path:
    """The on-disk root every `*_local_path` / `*_url` static reference is relative to."""
    return Path(__file__).resolve().parent.parent.parent / "static"


def read_asset_base64(static_dir: Path, relative_path: str | None) -> str | None:
    """Read `static_dir / relative_path` and return its bytes as base64, or None if
    there's no path to read or the file doesn't exist on disk."""
    if not relative_path:
        return None
    full_path = static_dir / relative_path
    if not full_path.is_file():
        return None
    try:
        return base64.b64encode(full_path.read_bytes()).decode("ascii")
    except Exception as e:
        logger.warning(f"Could not read asset [{relative_path}] for export: {e}")
        return None


def write_asset_base64(static_dir: Path, relative_path: str | None, data_b64: str | None) -> None:
    """Decode `data_b64` and write it to `static_dir / relative_path`, creating parent
    directories as needed. No-ops if either argument is missing/empty."""
    if not relative_path or not data_b64:
        return
    full_path = (static_dir / relative_path).resolve()
    if static_dir.resolve() not in full_path.parents:
        raise ValueError(f"Refusing to write asset: path [{relative_path}] escapes static dir")
    try:
        raw = base64.b64decode(data_b64)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(raw)
    except ValueError:
        raise
    except Exception as e:
        logger.warning(f"Could not write asset [{relative_path}] during import: {e}")
