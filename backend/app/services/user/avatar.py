# backend/app/services/user/avatar.py
import logging
import os
import time
import uuid
from flask import current_app
from werkzeug.utils import secure_filename

from app.core.extensions import db
from app.models import User

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS: set[str] = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"}


def is_allowed_avatar_file(filename: str) -> bool:
    """Verify image extension against allowed file formats."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_avatar_storage_directory() -> str:
    """Returns the absolute persistent directory path for storing avatars."""
    if current_app:
        upload_cfg = current_app.config.get("UPLOAD_FOLDER")
        if upload_cfg:
            base_dir = os.path.abspath(upload_cfg)
        else:
            base_dir = os.path.abspath(
                os.path.join(current_app.root_path, "static", "uploads", "avatars")
            )
    else:
        base_dir = os.path.abspath(
            os.path.join(os.getcwd(), "app", "static", "uploads", "avatars")
        )
    os.makedirs(base_dir, exist_ok=True)
    return base_dir


#: The only `avatar_url` values the server writes: an upload, served by `/auth/avatar/file/`.
AVATAR_URL_PREFIX = "/api/v1/auth/avatar/file/"


def owned_avatar_filename(avatar_url: str | None, user_id: int) -> str | None:
    """The file behind `avatar_url` when it is one of *this* user's uploads, else None.

    Uploads are named `avatar_u<id>_<time>_<hex>.webp`, so the user id in the name is checked: a
    value pointing at someone else's file (or anything outside the avatar folder) is never treated
    as this account's to delete.
    """
    if not avatar_url or not avatar_url.startswith(AVATAR_URL_PREFIX):
        return None
    filename = avatar_url[len(AVATAR_URL_PREFIX):].split("?")[0]
    if "/" in filename or "\\" in filename or not filename.startswith(f"avatar_u{user_id}_"):
        return None
    return filename


def remove_stale_avatar_file(avatar_url: str | None, avatar_dir: str, user_id: int) -> None:
    """Deletes the user's previous upload from disk to prevent storage accumulation."""
    filename = owned_avatar_filename(avatar_url, user_id)
    if filename:
        old_path = os.path.join(avatar_dir, filename)
        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                logger.warning(f"Could not remove old avatar {old_path}: {e}")


#: Same cap as the profile page's file picker.
MAX_AVATAR_BYTES = 10 * 1024 * 1024
#: Refuse to decode anything bigger, whatever its file size: a small PNG can declare 13 000 x 13 000
#: pixels and cost hundreds of MB of memory once converted (Pillow's own limit is ~178 MP).
MAX_AVATAR_PIXELS = 40_000_000
AVATAR_PROCESSING_FAILED = "The image could not be processed. Try a PNG, JPEG or WebP file."


def process_and_save_avatar(user_id: int, file_storage) -> tuple[User | None, str | None]:
    """Center-crops image to 1:1, resizes to 256x256, and saves in WebP format.

    The previous upload is deleted only after the new one is stored and saved on the account: it
    used to be deleted first, so a corrupt file left the account pointing at a missing image.
    """
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    if not file_storage or not file_storage.filename:
        return None, "No image file provided."

    filename = secure_filename(file_storage.filename)
    if not is_allowed_avatar_file(filename):
        return None, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    avatar_dir = get_avatar_storage_directory()
    previous_avatar_url = user.avatar_url

    unique_id = f"u{user.id}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    new_filename = f"avatar_{unique_id}.webp"
    destination_path = os.path.join(avatar_dir, new_filename)

    try:
        from PIL import Image, ImageOps

        file_storage.stream.seek(0, os.SEEK_END)
        if file_storage.stream.tell() > MAX_AVATAR_BYTES:
            return None, "The image is larger than 10 MB."
        file_storage.stream.seek(0)
        image = Image.open(file_storage.stream)
        width, height = image.size
        if width * height > MAX_AVATAR_PIXELS:
            return None, "The image is too large (more than 40 megapixels)."
        image = ImageOps.exif_transpose(image)

        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            converted_image = image.convert("RGBA")
        else:
            converted_image = image.convert("RGB")

        width, height = converted_image.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        right = (width + min_dim) / 2
        bottom = (height + min_dim) / 2

        cropped = converted_image.crop((left, top, right, bottom))
        resized = cropped.resize((256, 256), Image.Resampling.LANCZOS)
        resized.save(destination_path, format="WEBP", quality=90, method=4)

        avatar_url = f"{AVATAR_URL_PREFIX}{new_filename}"
        user.avatar_url = avatar_url
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to process and save avatar for user {user_id}: {e}")
        db.session.rollback()
        if os.path.exists(destination_path):
            try:
                os.remove(destination_path)
            except Exception:
                logger.debug("Could not remove a half-written avatar file", exc_info=True)
        # The exception text (library internals, paths) stays in the log.
        return None, AVATAR_PROCESSING_FAILED

    if previous_avatar_url != avatar_url:
        remove_stale_avatar_file(previous_avatar_url, avatar_dir, user.id)
    return user, None


def clear_user_avatar(user_id: int) -> tuple[User | None, str | None]:
    """Resets user avatar to default."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    avatar_dir = get_avatar_storage_directory()
    previous_avatar_url = user.avatar_url

    user.avatar_url = "default_avatar"
    db.session.commit()
    remove_stale_avatar_file(previous_avatar_url, avatar_dir, user.id)
    return user, None
