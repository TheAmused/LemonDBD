# backend/app/services/user_service.py
import logging
from typing import Any, Dict, Optional, Tuple

from app.core.security import generate_token
from app.models import User
from app.services.user import (
    admin_modify_user,
    admin_remove_user,
    authenticate_user_credentials,
    clear_user_avatar,
    create_user_account,
    fetch_admin_metrics,
    fetch_user_by_id,
    get_avatar_storage_directory,
    list_all_users_paginated,
    modify_user_profile,
    process_and_save_avatar,
    request_password_reset,
    resend_verification_email,
    reset_password_with_token,
    retrieve_user_from_jwt,
    seed_default_admin_if_empty,
    verify_email_code,
)

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, secret_key: Optional[str] = None):
        self._secret_key = secret_key

    def _get_avatar_dir(self) -> str:
        return get_avatar_storage_directory()

    def generate_token(self, user_id: int, role: str = "user") -> str:
        """Generates a standard signed JWT access token."""
        return generate_token(user_id=user_id, role=role)

    def generate_auth_token(self, user: User) -> str:
        """Helper to generate a JWT directly from a User model."""
        return generate_token(user_id=user.id, role=user.role)

    def verify_token(self, token: str) -> Optional[User]:
        return retrieve_user_from_jwt(token)

    def register_user(
        self,
        username: str,
        email: str,
        password: str,
        role: str = "user",
        avatar_url: str = "default_avatar",
    ) -> Tuple[Optional[User], Optional[str]]:
        return create_user_account(username, email, password, role, avatar_url)

    def authenticate(
        self,
        username_or_email: str,
        password: str,
    ) -> Tuple[Optional[User], Optional[str]]:
        return authenticate_user_credentials(username_or_email, password)

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return fetch_user_by_id(user_id)

    def update_user_profile(
        self,
        user_id: int,
        email: Optional[str] = None,
        avatar_url: Optional[str] = None,
        new_password: Optional[str] = None,
    ) -> Tuple[Optional[User], Optional[str]]:
        return modify_user_profile(user_id, email, avatar_url, new_password)

    def save_user_avatar(self, user_id: int, file_storage) -> Tuple[Optional[User], Optional[str]]:
        return process_and_save_avatar(user_id, file_storage)

    def delete_user_avatar(self, user_id: int) -> Tuple[Optional[User], Optional[str]]:
        return clear_user_avatar(user_id)

    def get_all_users(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        return list_all_users_paginated(search, role, page, per_page)

    def admin_update_user(
        self,
        user_id: int,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[Optional[User], Optional[str]]:
        return admin_modify_user(user_id, role, is_active)

    def admin_delete_user(self, user_id: int) -> bool:
        return admin_remove_user(user_id)

    def get_admin_system_stats(self) -> Dict[str, Any]:
        return fetch_admin_metrics()

    def seed_default_admin_if_empty(self) -> None:
        seed_default_admin_if_empty()

    def verify_email(self, email: str, code: str) -> Tuple[Optional[User], Optional[str]]:
        return verify_email_code(email, code)

    def resend_verification(self, email: str) -> Tuple[bool, Optional[str]]:
        return resend_verification_email(email)

    def request_password_reset(self, email: str) -> Tuple[bool, Optional[str]]:
        return request_password_reset(email)

    def reset_password(self, token: str, new_password: str) -> Tuple[Optional[User], Optional[str]]:
        return reset_password_with_token(token, new_password)

