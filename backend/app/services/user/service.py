# backend/app/services/user/service.py
import logging
import warnings
from typing import Any

from app.core.security import generate_token
from app.models import User
from app.services.user.admin import (
    admin_modify_user,
    admin_remove_user,
    delete_own_account,
    fetch_admin_metrics,
    list_all_users_paginated,
    seed_default_admin_if_empty,
)
from app.services.user.auth import (
    authenticate_user_credentials,
    create_user_account,
    request_password_reset,
    resend_verification_email,
    reset_password_with_token,
    retrieve_user_from_jwt,
    verify_email_code,
)
from app.services.user.avatar import (
    clear_user_avatar,
    get_avatar_storage_directory,
    process_and_save_avatar,
)
from app.services.user.data_export import export_filename, export_user_data
from app.services.user.profile import (
    fetch_user_by_id,
    get_or_create_user_showcase,
    get_user_showcase,
    mark_onboarding_complete,
    modify_user_profile,
    set_preferred_language,
    update_user_showcase,
)

logger = logging.getLogger(__name__)


class UserService:
    """Deprecated class facade for user services. Use domain package functions directly."""

    def __init__(self, secret_key: str | None = None):
        warnings.warn(
            "UserService is deprecated; call domain functions from app.services.user directly.",
            DeprecationWarning,
            stacklevel=2,
        )
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
        login: str,
        username: str,
        email: str,
        password: str,
        role: str = "user",
        avatar_url: str = "default_avatar",
    ) -> tuple[User | None, str | None]:
        return create_user_account(login, username, email, password, role, avatar_url)

    def authenticate(
        self,
        login_or_email: str,
        password: str,
    ) -> tuple[User | None, str | None]:
        return authenticate_user_credentials(login_or_email, password)

    def get_user_by_id(self, user_id: int) -> User | None:
        return fetch_user_by_id(user_id)

    def update_user_profile(
        self,
        user_id: int,
        email: str | None = None,
        avatar_url: str | None = None,
        new_password: str | None = None,
        current_password: str | None = None,
        two_factor_code: str | None = None,
        username: str | None = None,
    ) -> tuple[User | None, str | None]:
        return modify_user_profile(
            user_id, email, avatar_url, new_password, current_password, two_factor_code, username
        )

    def mark_onboarding_complete(self, user_id: int) -> tuple[User | None, str | None]:
        return mark_onboarding_complete(user_id)

    def set_preferred_language(self, user_id: int, language: str) -> tuple[User | None, str | None]:
        return set_preferred_language(user_id, language)

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

    def export_user_data(self, user_id: int, requested_by: str = "self") -> dict | None:
        return export_user_data(user_id, requested_by)

    def export_filename(self, user_id: int, requested_by: str = "self") -> str:
        return export_filename(user_id, requested_by)

    def delete_own_account(
        self,
        user_id: int,
        password: str,
        two_factor_code: str | None = None,
        google_credential: str | None = None,
    ) -> tuple[bool, str | None]:
        return delete_own_account(user_id, password, two_factor_code, google_credential)

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

    def get_user_showcase(self, user_id: int) -> dict[str, Any] | None:
        return get_user_showcase(user_id)

    def update_user_showcase(
        self, user_id: int, data: dict[str, Any]
    ) -> tuple[dict[str, Any] | None, str | None]:
        return update_user_showcase(user_id, data)
