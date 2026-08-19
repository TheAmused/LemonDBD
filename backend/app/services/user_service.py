import logging
import os
import uuid
import time
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone
from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
from sqlalchemy import select, func, or_, delete
from app.core.extensions import db
from app.models import User, UserCharacterOwnership, UserPerkOwnership, Character, Perk

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


class UserService:
    def __init__(self, secret_key: Optional[str] = None):
        self._secret_key = secret_key

    def _get_serializer(self) -> URLSafeTimedSerializer:
        key = self._secret_key or (
            current_app.config.get("SECRET_KEY", "lemon-dbd-secret-key-2026")
            if current_app
            else "lemon-dbd-secret-key-2026"
        )
        return URLSafeTimedSerializer(key)

    def _get_avatar_dir(self) -> str:
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

    def generate_token(self, user_id: int, expires_in: int = 86400 * 7) -> str:
        serializer = self._get_serializer()
        return serializer.dumps(
            {"user_id": user_id, "created_at": datetime.now(timezone.utc).timestamp()}
        )

    def verify_token(self, token: str, max_age: int = 86400 * 7) -> Optional[User]:
        serializer = self._get_serializer()
        try:
            data = serializer.loads(token, max_age=max_age)
            user_id = data.get("user_id")
            if not user_id:
                return None
            user = db.session.get(User, user_id)
            if user and user.is_active:
                return user
            return None
        except (SignatureExpired, BadTimeSignature, Exception) as e:
            logger.debug(f"Token verification failed: {e}")
            return None

    def register_user(
        self,
        username: str,
        email: str,
        password: str,
        role: str = "user",
        avatar_url: str = "default_avatar",
    ) -> Tuple[Optional[User], Optional[str]]:
        clean_username = (username or "").strip()
        clean_email = (email or "").strip().lower()

        if not clean_username or len(clean_username) < 3:
            return None, "Username must be at least 3 characters long."
        if not clean_email or "@" not in clean_email:
            return None, "A valid email address is required."
        if not password or len(password) < 3:
            return None, "Password must be at least 3 characters long."

        existing_username = db.session.scalars(
            select(User).where(User.username.ilike(clean_username))
        ).first()
        if existing_username:
            return None, "Username is already taken."

        existing_email = db.session.scalars(
            select(User).where(User.email.ilike(clean_email))
        ).first()
        if existing_email:
            return None, "Email address is already registered."

        role_clean = role.lower() if role in ["admin", "user"] else "user"
        pw_hash = generate_password_hash(password)

        new_user = User(
            username=clean_username,
            email=clean_email,
            password_hash=pw_hash,
            role=role_clean,
            avatar_url=avatar_url or "default_avatar",
            is_active=True,
        )
        db.session.add(new_user)
        db.session.commit()

        logger.info(f"User '{new_user.username}' registered with role '{new_user.role}'.")
        return new_user, None

    def authenticate(
        self, username_or_email: str, password: str
    ) -> Tuple[Optional[User], Optional[str]]:
        clean_id = (username_or_email or "").strip()
        if not clean_id or not password:
            return None, None

        user = db.session.scalars(
            select(User).where(
                or_(
                    User.username.ilike(clean_id),
                    User.email.ilike(clean_id.lower()),
                )
            )
        ).first()

        if not user or not user.is_active:
            return None, None

        if check_password_hash(user.password_hash, password):
            token = self.generate_token(user.id)
            return user, token

        return None, None

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return db.session.get(User, user_id)

    def update_user_profile(
        self,
        user_id: int,
        email: Optional[str] = None,
        avatar_url: Optional[str] = None,
        new_password: Optional[str] = None,
    ) -> Tuple[Optional[User], Optional[str]]:
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found."

        if email:
            clean_email = email.strip().lower()
            if clean_email != user.email:
                existing = db.session.scalars(
                    select(User).where(User.email.ilike(clean_email), User.id != user_id)
                ).first()
                if existing:
                    return None, "Email address is already in use."
                user.email = clean_email

        if avatar_url:
            user.avatar_url = avatar_url.strip()

        if new_password:
            if len(new_password) < 6:
                return None, "New password must be at least 6 characters long."
            user.password_hash = generate_password_hash(new_password)

        db.session.commit()
        return user, None

    def save_user_avatar(self, user_id: int, file_storage) -> Tuple[Optional[User], Optional[str]]:
        """
        Always center-crops to 1:1, resizes to 256x256, and saves as .webp format.
        """
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found."

        if not file_storage or not file_storage.filename:
            return None, "No image file provided."

        filename = secure_filename(file_storage.filename)
        if not allowed_file(filename):
            return None, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

        avatar_dir = self._get_avatar_dir()
        self._remove_old_avatar_file(user.avatar_url, avatar_dir)

        # ALWAYS use .webp extension
        unique_id = f"u{user.id}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        new_filename = f"avatar_{unique_id}.webp"
        destination_path = os.path.join(avatar_dir, new_filename)

        try:
            from PIL import Image, ImageOps

            file_storage.stream.seek(0)
            image = Image.open(file_storage.stream)
            image = ImageOps.exif_transpose(image)

            # Convert to RGBA for transparency support or RGB for opaque images
            if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                converted_image = image.convert("RGBA")
            else:
                converted_image = image.convert("RGB")

            # Center square crop (1:1 aspect ratio)
            width, height = converted_image.size
            min_dim = min(width, height)
            left = (width - min_dim) / 2
            top = (height - min_dim) / 2
            right = (width + min_dim) / 2
            bottom = (height + min_dim) / 2

            cropped = converted_image.crop((left, top, right, bottom))
            resized = cropped.resize((256, 256), Image.Resampling.LANCZOS)

            # ALWAYS save as WEBP
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

    def delete_user_avatar(self, user_id: int) -> Tuple[Optional[User], Optional[str]]:
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found."

        avatar_dir = self._get_avatar_dir()
        self._remove_old_avatar_file(user.avatar_url, avatar_dir)

        user.avatar_url = "default_avatar"
        db.session.commit()
        return user, None

    def _remove_old_avatar_file(self, avatar_url: Optional[str], avatar_dir: str) -> None:
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

    def get_all_users(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        stmt = select(User)

        if role and role.lower() in ["admin", "user"]:
            stmt = stmt.where(User.role == role.lower())

        if search and search.strip():
            pat = f"%{search.strip().lower()}%"
            stmt = stmt.where(or_(User.username.ilike(pat), User.email.ilike(pat)))

        total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        stmt = stmt.order_by(User.id.asc()).offset((page - 1) * per_page).limit(per_page)
        users = db.session.scalars(stmt).all()

        user_list = []
        for u in users:
            d = u.to_dict()
            owned_chars = (
                db.session.scalar(
                    select(func.count(UserCharacterOwnership.id)).where(
                        UserCharacterOwnership.user_id == u.id,
                        UserCharacterOwnership.is_owned.is_(True),
                    )
                )
                or 0
            )
            unlocked_perks = (
                db.session.scalar(
                    select(func.count(UserPerkOwnership.id)).where(
                        UserPerkOwnership.user_id == u.id,
                        UserPerkOwnership.is_unlocked.is_(True),
                    )
                )
                or 0
            )
            d["owned_characters_count"] = owned_chars
            d["unlocked_perks_count"] = unlocked_perks
            user_list.append(d)

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "users": user_list,
        }

    def admin_update_user(
        self,
        user_id: int,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[Optional[User], Optional[str]]:
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found."

        if role and role.lower() in ["admin", "user"]:
            user.role = role.lower()
        if is_active is not None:
            user.is_active = is_active

        db.session.commit()
        return user, None

    def admin_delete_user(self, user_id: int) -> bool:
        user = db.session.get(User, user_id)
        if not user:
            return False
        avatar_dir = self._get_avatar_dir()
        self._remove_old_avatar_file(user.avatar_url, avatar_dir)
        db.session.delete(user)
        db.session.commit()
        return True

    def get_admin_system_stats(self) -> Dict[str, Any]:
        total_users = db.session.scalar(select(func.count(User.id))) or 0
        active_users = (
            db.session.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
        )
        admin_count = (
            db.session.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
        )

        total_characters = db.session.scalar(select(func.count(Character.id))) or 0
        survivors_count = (
            db.session.scalar(
                select(func.count(Character.id)).where(Character.role == "Survivor")
            )
            or 0
        )
        killers_count = (
            db.session.scalar(
                select(func.count(Character.id)).where(Character.role == "Killer")
            )
            or 0
        )
        total_perks = db.session.scalar(select(func.count(Perk.id))) or 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "admin_count": admin_count,
            "total_characters": total_characters,
            "survivors_count": survivors_count,
            "killers_count": killers_count,
            "total_perks": total_perks,
        }

    def seed_default_admin_if_empty(self) -> None:
        try:
            from app.seeds.user_seeder import seed_default_users

            seed_default_users()
        except Exception as e:
            logger.debug(f"Error executing user seeder: {e}")