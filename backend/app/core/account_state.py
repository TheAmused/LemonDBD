# backend/app/core/account_state.py
"""Whether an account may sign in right now (pure, no database access).

`User.is_active` is False for a permanent ban; `User.suspended_until` is the end of the longest
active suspension. Both are derived from the sanctions by `services/moderation_actions.py`
(`recompute_user_state`), which is the only writer. A past `suspended_until` is stale but harmless:
it is ignored here, so a suspension ends without any job writing to the database.
"""
from datetime import datetime, timezone
from typing import Any


def as_utc(value: datetime | None) -> datetime | None:
    """A timezone-aware UTC datetime (SQLite hands datetimes back naive; they are stored as UTC)."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_blocked(user: Any, now: datetime | None = None) -> bool:
    """True when the account is banned or inside an active suspension."""
    return block_kind(user, now) is not None


def block_kind(user: Any, now: datetime | None = None) -> str | None:
    """"banned", "suspended" or None."""
    if not user.is_active:
        return "banned"
    until = as_utc(getattr(user, "suspended_until", None))
    if until is not None and until > (now or datetime.now(timezone.utc)):
        return "suspended"
    return None


class AccountBlockedError(Exception):
    """Raised once the caller has proven who they are (password, second factor or Google token)
    and the account turned out to be banned or suspended. Carries the user for the 403 payload."""

    def __init__(self, user: Any) -> None:
        super().__init__("Account is blocked")
        self.user = user
