# backend/app/services/db/export_registry.py
"""What the database export/import covers, and the table-driven part of it.

`TARGET_GROUPS` names every exportable entity and the group it is filed under in an
export file. `SIMPLE_EXPORT_TARGETS` and `SIMPLE_DELETE_TARGETS` describe the entities
whose export and replace-mode clearing need no custom code.
"""
from collections.abc import Callable
from typing import Any

from app.core.extensions import db
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.base import column_dict
from app.models.changelog import ChangelogPost
from app.models.chaos import ChaosRun
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.community import BugReport
from app.models.equipment import Item, ItemAddon, ItemCategory, KillerAddon, Offering
from app.models.gauntlet import GauntletRun
from app.models.history import HistoryRun
from app.models.map import MapSource
from app.models.map_layout import MapLayout
from app.models.page_streak import PageStreakRun
from app.models.perk import Perk
from app.models.sanction import BannedEmailHash
from app.models.tier_list import TIER_LIST_FIELDS, TierList
from app.models.user import User, UserShowcase

_TIER_LIST_OPTIONAL = {
    "is_nsfw",
    "cover_image_url",
    "tiers",
    "item_ids",
    "custom_items",
    "default_placements",
    "translations",
}


def power_icon_local_path(power_name: str | None) -> str | None:
    if not power_name:
        return None
    p_clean = power_name.lower().replace(" ", "_").replace("'", "").replace("-", "_")
    return f"icons/powers/{p_clean}.webp" if p_clean else None


def user_avatar_relative_path(avatar_url: str | None) -> str | None:
    if not avatar_url or avatar_url == "default_avatar":
        return None
    filename = avatar_url.rsplit("/", 1)[-1].split("?")[0]
    return f"uploads/avatars/{filename}" if filename else None


def serialize_survivor(s: Survivor) -> dict[str, Any]:
    return column_dict(s)


def serialize_killer(k: Killer) -> dict[str, Any]:
    row = column_dict(k)
    row["power_icon_local_path"] = k.power_icon_local_path or power_icon_local_path(k.power_name)
    return row


def serialize_perk(p: Perk) -> dict[str, Any]:
    return column_dict(p)


def serialize_item_category(c: ItemCategory) -> dict[str, Any]:
    return c.to_dict()


def serialize_item(i: Item) -> dict[str, Any]:
    return column_dict(i)


def serialize_killer_addon(a: KillerAddon) -> dict[str, Any]:
    return column_dict(a)


def serialize_item_addon(a: ItemAddon) -> dict[str, Any]:
    return column_dict(a)


def serialize_offering(o: Offering) -> dict[str, Any]:
    return column_dict(o)


def serialize_chapter(c: Chapter) -> dict[str, Any]:
    return column_dict(c)


def serialize_user(u: User) -> dict[str, Any]:
    return {
        "login": u.login,
        "username": u.username,
        "email": u.email,
        "password_hash": u.password_hash,
        "role": u.role,
        "avatar_url": u.avatar_url,
        "avatar_relative_path": user_avatar_relative_path(u.avatar_url),
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }


def serialize_admin_audit_log(log: AdminAuditLog) -> dict[str, Any]:
    admin_user = db.session.get(User, log.admin_user_id) if log.admin_user_id else None
    return {
        "admin_login": admin_user.login if admin_user else None,
        "action": log.action,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "details": log.details,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def serialize_banned_email_hash(row: BannedEmailHash) -> dict[str, Any]:
    """One ban-evasion list entry. The pepper is never part of this: only the keyed hash, the
    version of the pepper that made it, and the entry's own dates travel in a file."""
    return {
        "email_hmac": row.email_hmac,
        "key_version": row.key_version,
        "reason_code": row.reason_code,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
    }


def serialize_changelog_post(post: ChangelogPost) -> dict[str, Any]:
    return {
        "title": post.title,
        "content_html": post.content_html,
        "position": post.position,
        "is_published": post.is_published,
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "edited_at": post.edited_at.isoformat() if post.edited_at else None,
        "author_login": post.author.login if post.author else None,
        "author_name": post.author_name,
        "created_at": post.created_at.isoformat() if post.created_at else None,
    }


def serialize_tier_list(t: TierList) -> dict[str, Any]:
    row: dict[str, Any] = {"id": t.id}
    for field in TIER_LIST_FIELDS:
        value = getattr(t, field)
        if field in _TIER_LIST_OPTIONAL and not value:
            continue
        row[field] = value
    return row

TARGET_GROUPS: dict[str, list[str]] = {
    "content": [
        "chapters",
        "realms",
        "item_categories",
        "map_sources",
        "survivors",
        "killers",
        "perks",
        "items",
        "killer_addons",
        "item_addons",
        "offerings",
        "maps",
        "map_layouts",
        "tier_lists",
    ],
    "users": [
        "users",
        "ownerships",
        "user_showcases",
        "banned_email_hashes",
    ],
    "community": [
        "bug_reports",
        "changelog_posts",
        "gauntlet_runs",
        "chaos_runs",
        "history_runs",
        "page_streak_runs",
        "rosters",
    ],
    "settings": [
        "challenge_mode_settings",
        "admin_audit_logs",
    ],
}

SUPPORTED_EXPORT_TARGETS = [
    target for targets in TARGET_GROUPS.values() for target in targets
]

#: Never purged from the admin panel: the accounts (that would delete the acting admin too), the
#: audit log (append-only) and the ban-evasion list (wiping it would let banned addresses back in).
NOT_PURGEABLE: frozenset[str] = frozenset({"users", "admin_audit_logs", "banned_email_hashes"})
PURGEABLE_TARGETS: list[str] = [target for target in SUPPORTED_EXPORT_TARGETS if target not in NOT_PURGEABLE]

#: A table can only be purged together with the tables whose rows point at it without a cascade
#: (`ondelete="RESTRICT"`): chapters <- characters, realms / map sources <- maps, item categories <- items.
PURGE_REQUIRES: dict[str, tuple[str, ...]] = {
    "chapters": ("survivors", "killers"),
    "realms": ("maps",),
    "map_sources": ("maps",),
    "item_categories": ("items", "item_addons"),
}


def unknown_targets(targets: list[str] | set[str], allowed: list[str]) -> list[str]:
    """The names in `targets` that are not in `allowed` (an empty list when all of them are)."""
    allowed_set = set(allowed)
    return sorted({str(target) for target in targets if target not in allowed_set})


def missing_purge_dependencies(targets: list[str] | set[str]) -> list[str]:
    """The tables that must be purged too for `targets` to be purged (empty when none are missing)."""
    chosen = set(targets)
    return sorted({dep for target in chosen for dep in PURGE_REQUIRES.get(target, ()) if dep not in chosen})


# Entities whose export is "select all, serialize each row, store under one key" --
# no nested collections, no cross-entity joins beyond a single to-one lookup.
# The 4th tuple element lists which serialized fields hold a static-dir-relative
# image path and should get a base64 "<field>_data" sibling embedded.
SIMPLE_EXPORT_TARGETS: list[tuple[str, type, Callable[[Any], dict[str, Any]], list[str]]] = [
    ("survivors", Survivor, serialize_survivor, ["avatar_local_path"]),
    ("killers", Killer, serialize_killer, ["avatar_local_path", "power_icon_local_path"]),
    ("perks", Perk, serialize_perk, ["icon_local_path"]),
    ("item_categories", ItemCategory, serialize_item_category, []),
    ("map_sources", MapSource, lambda s: {"id": s.id, "code": s.code, "label": s.label}, []),
    ("items", Item, serialize_item, ["icon_local_path"]),
    ("killer_addons", KillerAddon, serialize_killer_addon, ["icon_local_path"]),
    ("item_addons", ItemAddon, serialize_item_addon, ["icon_local_path"]),
    ("offerings", Offering, serialize_offering, ["icon_local_path"]),
    ("chapters", Chapter, serialize_chapter, ["banner_local_path"]),
    ("users", User, serialize_user, ["avatar_relative_path"]),
    ("bug_reports", BugReport, lambda r: r.to_dict(), []),
    ("challenge_mode_settings", ChallengeModeSetting, lambda cms: cms.to_dict(), []),
    ("admin_audit_logs", AdminAuditLog, serialize_admin_audit_log, []),
    ("banned_email_hashes", BannedEmailHash, serialize_banned_email_hash, []),
    ("changelog_posts", ChangelogPost, serialize_changelog_post, []),
    ("tier_lists", TierList, serialize_tier_list, []),
]

# Entities whose deletion in "replace" mode is a single unconditional DELETE, gated
# only by their own target key. Order matters: perks must be cleared before
# characters (perk.character_id FK), mirroring the plan's original ordering.
SIMPLE_DELETE_TARGETS: list[tuple[str, type]] = [
    ("bug_reports", BugReport),
    ("killer_addons", KillerAddon),
    ("item_addons", ItemAddon),
    ("offerings", Offering),
    ("items", Item),
    ("item_categories", ItemCategory),
    ("perks", Perk),
    ("survivors", Survivor),
    ("killers", Killer),
    ("chapters", Chapter),
    ("challenge_mode_settings", ChallengeModeSetting),
    ("user_showcases", UserShowcase),
    ("banned_email_hashes", BannedEmailHash),
    # Never "admin_audit_logs": the audit log is append-only, so replace mode does not clear it.
    ("changelog_posts", ChangelogPost),
    ("gauntlet_runs", GauntletRun),
    ("chaos_runs", ChaosRun),
    ("history_runs", HistoryRun),
    ("page_streak_runs", PageStreakRun),
    ("map_layouts", MapLayout),
    ("tier_lists", TierList),
]
