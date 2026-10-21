# backend/app/services/db/asset_bundling.py
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def get_static_dir() -> Path:
    """The on-disk root every `*_local_path` / `*_url` static reference is relative to."""
    return Path(__file__).resolve().parent.parent.parent / "static"


#: What a database backup may write into the public static folder: images only. A backup is
#: admin-made, but a doctored one must still not plant an .html/.svg/.js file on this domain.
ALLOWED_ASSET_SUFFIXES = frozenset({".webp", ".png", ".jpg", ".jpeg", ".gif"})
_ALLOWED_IMAGE_FORMATS = frozenset({"WEBP", "PNG", "JPEG", "GIF"})


def _contained(static_dir: Path, relative_path: str) -> Path | None:
    """`static_dir / relative_path` resolved, or None when it points outside `static_dir`
    (an absolute path, `..`, or a symlink out of the folder)."""
    root = static_dir.resolve()
    full_path = (static_dir / relative_path).resolve()
    return full_path if root in full_path.parents else None


def read_asset_base64(static_dir: Path, relative_path: str | None) -> str | None:
    """Read `static_dir / relative_path` and return its bytes as base64, or None if
    there's no path to read, the file doesn't exist on disk, or the path leaves `static_dir`
    (the paths come from database rows, which an import can set)."""
    if not relative_path:
        return None
    full_path = _contained(static_dir, relative_path)
    if full_path is None:
        logger.warning(f"Skipped asset [{relative_path}] for export: it is outside the static folder")
        return None
    if not full_path.is_file():
        return None
    try:
        return base64.b64encode(full_path.read_bytes()).decode("ascii")
    except Exception as e:
        logger.warning(f"Could not read asset [{relative_path}] for export: {e}")
        return None


def _check_image(relative_path: str, raw: bytes) -> None:
    """Raise ValueError unless `raw` decodes as one of the allowed image formats."""
    from io import BytesIO

    from PIL import Image

    try:
        with Image.open(BytesIO(raw)) as image:
            image_format = image.format
            image.verify()
    except Exception as err:
        raise ValueError(f"Refusing to write asset: [{relative_path}] is not a readable image ({err})") from err
    if image_format not in _ALLOWED_IMAGE_FORMATS:
        raise ValueError(f"Refusing to write asset: [{relative_path}] is a {image_format} image")


def write_asset_base64(static_dir: Path, relative_path: str | None, data_b64: str | None) -> None:
    """Decode `data_b64` and write it to `static_dir / relative_path`, creating parent
    directories as needed. No-ops if either argument is missing/empty.

    Raises ValueError for a path outside `static_dir`, a file type that is not an allowed
    image, or bytes that do not decode as one (Pillow); the import then fails as a whole."""
    if not relative_path or not data_b64:
        return
    full_path = _contained(static_dir, relative_path)
    if full_path is None:
        raise ValueError(f"Refusing to write asset: path [{relative_path}] escapes static dir")
    if full_path.suffix.lower() not in ALLOWED_ASSET_SUFFIXES:
        raise ValueError(f"Refusing to write asset: [{relative_path}] is not an allowed image type")
    try:
        raw = base64.b64decode(data_b64)
    except Exception as err:
        raise ValueError(f"Refusing to write asset: [{relative_path}] is not valid base64") from err
    _check_image(relative_path, raw)
    try:
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(raw)
    except Exception as e:
        logger.warning(f"Could not write asset [{relative_path}] during import: {e}")
