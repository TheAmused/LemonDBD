# backend/app/services/user/__init__.py
from app.services.user.admin import (
    admin_modify_user,
    admin_remove_user,
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
    ALLOWED_EXTENSIONS,
    clear_user_avatar,
    get_avatar_storage_directory,
    is_allowed_avatar_file,
    process_and_save_avatar,
    remove_stale_avatar_file,
)
from app.services.user.profile import (
    fetch_user_by_id,
    get_or_create_user_showcase,
    get_user_showcase,
    modify_user_profile,
    update_user_showcase,
)

__all__ = [
    "ALLOWED_EXTENSIONS",
    "is_allowed_avatar_file",
    "get_avatar_storage_directory",
    "remove_stale_avatar_file",
    "process_and_save_avatar",
    "clear_user_avatar",
    "create_user_account",
    "authenticate_user_credentials",
    "retrieve_user_from_jwt",
    "verify_email_code",
    "resend_verification_email",
    "request_password_reset",
    "reset_password_with_token",
    "fetch_user_by_id",
    "modify_user_profile",
    "get_or_create_user_showcase",
    "get_user_showcase",
    "update_user_showcase",
    "list_all_users_paginated",
    "admin_modify_user",
    "admin_remove_user",
    "fetch_admin_metrics",
    "seed_default_admin_if_empty",
]
