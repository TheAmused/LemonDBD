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
    retrieve_user_from_jwt,
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
    modify_user_profile,
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
    "fetch_user_by_id",
    "modify_user_profile",
    "list_all_users_paginated",
    "admin_modify_user",
    "admin_remove_user",
    "fetch_admin_metrics",
    "seed_default_admin_if_empty",
]

