# backend/app/services/db/export_registry.py
"""What the database export/import covers, and the table-driven part of it.

`TARGET_GROUPS` names every exportable entity and the group it is filed under in an
export file. `SIMPLE_EXPORT_TARGETS` and `SIMPLE_DELETE_TARGETS` describe the entities
whose export and replace-mode clearing need no custom code.
"""
from collections.abc import Callable
from typing import Any

from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.changelog import ChangelogPost
from app.models.chaos import ChaosRun
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.community import BugReport
from app.models.equipment import Item, ItemAddon, ItemCategory, KillerAddon, Offering
from app.models.gauntlet import GauntletRun
from app.models.history import HistoryRun
from app.models.map import MapSource
from app.models.page_streak import PageStreakRun
from app.models.perk import Perk
from app.models.tier_list import TierList
from app.models.user import User, UserShowcase
from app.services.db.serializers import (
    serialize_admin_audit_log, serialize_changelog_post, serialize_chapter,
    serialize_item, serialize_item_addon, serialize_item_category, serialize_killer,
    serialize_killer_addon, serialize_offering, serialize_perk, serialize_survivor,
    serialize_tier_list, serialize_user,
)

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
        "tier_lists",
    ],
    "users": [
        "users",
        "ownerships",
        "user_showcases",
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
    ("admin_audit_logs", AdminAuditLog),
    ("changelog_posts", ChangelogPost),
    ("gauntlet_runs", GauntletRun),
    ("chaos_runs", ChaosRun),
    ("history_runs", HistoryRun),
    ("page_streak_runs", PageStreakRun),
    ("tier_lists", TierList),
]
