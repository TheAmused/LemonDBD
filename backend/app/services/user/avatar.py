# backend/app/services/user/avatar.py
import logging
import os
import time
import uuid
from typing import Optional, Set, Tuple
from flask import current_app
from werkzeug.utils import secure_filename

from app.core.extensions import db
from app.models import User

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS: Set[str] = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"}


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


def remove_stale_avatar_file(avatar_url: Optional[str], avatar_dir: str) -> None:
    """Deletes old avatar image from disk to prevent storage accumulation."""
    if not avatar_url or avatar_url == "default_avatar":
        return
    filename = avatar_url.split("/")[-1].split("?")[0]
    if filename:
        old_path = os.path.join(avatar_dir, filename)
        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                logger.warning(f"Could not remove old avatar {old_path}: {e}")


def process_and_save_avatar(user_id: int, file_storage) -> Tuple[Optional[User], Optional[str]]:
    """Center-crops image to 1:1, resizes to 256x256, and saves in WebP format."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    if not file_storage or not file_storage.filename:
        return None, "No image file provided."

    filename = secure_filename(file_storage.filename)
    if not is_allowed_avatar_file(filename):
        return None, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    avatar_dir = get_avatar_storage_directory()
    remove_stale_avatar_file(user.avatar_url, avatar_dir)

    unique_id = f"u{user.id}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    new_filename = f"avatar_{unique_id}.webp"
    destination_path = os.path.join(avatar_dir, new_filename)

    try:
        from PIL import Image, ImageOps

        file_storage.stream.seek(0)
        image = Image.open(file_storage.stream)
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

        avatar_url = f"/api/v1/auth/avatar/file/{new_filename}"
        user.avatar_url = avatar_url
        db.session.commit()
        return user, None

    except Exception as e:
        logger.error(f"Failed to process and save avatar for user {user_id}: {e}")
        if os.path.exists(destination_path):
            try:
                os.remove(destination_path)
            except Exception:
                pass
        return None, f"Failed to process image: {str(e)}"


def clear_user_avatar(user_id: int) -> Tuple[Optional[User], Optional[str]]:
    """Resets user avatar to default."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    avatar_dir = get_avatar_storage_directory()
    remove_stale_avatar_file(user.avatar_url, avatar_dir)

    user.avatar_url = "default_avatar"
    db.session.commit()
    return user, None

