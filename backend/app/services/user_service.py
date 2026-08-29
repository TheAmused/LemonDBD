# backend/app/services/user_service.py
import logging
from typing import Any
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
    def __init__(self, secret_key: str | None = None):
        self._secret_key = secret_key

    def _get_avatar_dir(self) -> str:
        return get_avatar_storage_directory()

    def generate_token(self, user_id: int, role: str = "user") -> str:
        return generate_token(user_id=user_id, role=role)

    def generate_auth_token(self, user: User) -> str:
        return generate_token(user_id=user.id, role=user.role)

    def verify_token(self, token: str) -> User | None:
        return retrieve_user_from_jwt(token)

    def register_user(
        self,
        username: str,
        email: str,
        password: str,
        role: str = "user",
        avatar_url: str = "default_avatar",
    ) -> tuple[User | None, str | None]:
        return create_user_account(username, email, password, role, avatar_url)

    def authenticate(
        self,
        username_or_email: str,
        password: str,
    ) -> tuple[User | None, str | None]:
        return authenticate_user_credentials(username_or_email, password)

    def get_user_by_id(self, user_id: int) -> User | None:
        return fetch_user_by_id(user_id)

    def update_user_profile(
        self,
        user_id: int,
        email: str | None = None,
        avatar_url: str | None = None,
        new_password: str | None = None,
    ) -> tuple[User | None, str | None]:
        return modify_user_profile(user_id, email, avatar_url, new_password)

    def save_user_avatar(self, user_id: int, file_storage) -> tuple[User | None, str | None]:
        return process_and_save_avatar(user_id, file_storage)

    def delete_user_avatar(self, user_id: int) -> tuple[User | None, str | None]:
        return clear_user_avatar(user_id)

    def get_all_users(
        self,
        search: str | None = None,
        role: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict[str, Any]:
        return list_all_users_paginated(search, role, page, per_page)

    def admin_update_user(
        self,
        user_id: int,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[User | None, str | None]:
        return admin_modify_user(user_id, role, is_active)

    def admin_delete_user(self, user_id: int) -> bool:
        return admin_remove_user(user_id)

    def get_admin_system_stats(self) -> dict[str, Any]:
        return fetch_admin_metrics()

    def seed_default_admin_if_empty(self) -> None:
        seed_default_admin_if_empty()

    def verify_email(self, email: str, code: str) -> tuple[User | None, str | None]:
        return verify_email_code(email, code)

    def resend_verification(self, email: str) -> tuple[bool, str | None]:
        return resend_verification_email(email)

    def request_password_reset(self, email: str) -> tuple[bool, str | None]:
        return request_password_reset(email)

    def reset_password(self, token: str, new_password: str) -> tuple[User | None, str | None]:
        return reset_password_with_token(token, new_password)
