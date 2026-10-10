# backend/app/services/db/serializers.py
from typing import Any
from app.core.extensions import db
from app.models.admin import AdminAuditLog
from app.models.changelog import ChangelogPost
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.equipment import Item, ItemAddon, KillerAddon, Offering
from app.models.equipment import ItemCategory
from app.models.map import Realm
from app.models.perk import Perk
from app.models.smash_or_pass import Entity, Roster
from app.models.tier_list import TierList
from app.models.user import User, UserShowcase


def power_icon_local_path(power_name: str | None) -> str | None:
    """Fallback for a killer profile that has no stored `power_icon_local_path`.

    The path used to be recomputed from `power_name` on every read, which meant
    a renamed power silently pointed at a file that did not exist. It is a
    stored column now; this only fills the gap for rows imported before it was.
    """
    if not power_name:
        return None
    p_clean = power_name.lower().replace(" ", "_").replace("'", "").replace("-", "_")
    return f"icons/powers/{p_clean}.webp" if p_clean else None


def serialize_survivor(s: Survivor) -> dict[str, Any]:
    """One survivor row, exported exactly as `survivors.json` holds it."""
    return {
        "id": s.id,
        "name": s.name,
        "portrait_url": s.portrait_url,
        "real_name": s.real_name,
        "avatar_local_path": s.avatar_local_path,
        "chapter_id": s.chapter_id,
        "gender": s.gender,
        "height": s.height or "Average",
        "emoji_riddle": s.emoji_riddle,
        "is_disabled": s.is_disabled,
        "disabled_reason": s.disabled_reason,
        "lore": s.lore,
        "translations": s.translations or {},
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def serialize_killer(k: Killer) -> dict[str, Any]:
    """One killer row, power statistics and chase music included."""
    return {
        "id": k.id,
        "name": k.name,
        "portrait_url": k.portrait_url,
        "real_name": k.real_name,
        "avatar_local_path": k.avatar_local_path,
        "chapter_id": k.chapter_id,
        "gender": k.gender,
        "emoji_riddle": k.emoji_riddle,
        "is_disabled": k.is_disabled,
        "disabled_reason": k.disabled_reason,
        "lore": k.lore,
        "power_name": k.power_name,
        "power_description": k.power_description,
        "power_icon_url": k.power_icon_url,
        "power_icon_local_path": (
            k.power_icon_local_path or power_icon_local_path(k.power_name)
        ),
        "movement_speed_ms": (
            format(k.movement_speed_ms, "f") if k.movement_speed_ms is not None else None
        ),
        "terror_radius": k.terror_radius,
        "terror_radius_meters": k.terror_radius_meters,
        "height": k.height,
        "chase_music_url": k.chase_music_url,
        "chase_music_local_path": k.chase_music_local_path,
        "translations": k.translations or {},
        "created_at": k.created_at.isoformat() if k.created_at else None,
    }


def serialize_perk(p: Perk) -> dict[str, Any]:
    return {
        "id": p.id,
        "name": p.name,
        "alternate_name": p.alternate_name,
        "is_generic_counterpart": p.is_generic_counterpart,
        "is_teachable": p.is_teachable,
        # `category` became `role` -- one name for one fact. It is not
        # derivable from the owner keys: 27 general perks have no character and
        # still belong to a side.
        "role": p.role,
        "description": p.description,
        "icon_url": p.icon_url,
        "icon_local_path": p.icon_local_path,
        "survivor_id": p.survivor_id,
        "killer_id": p.killer_id,
        "perk_types": p.resolved_perk_types,
        "translations": p.translations or {},
    }


def serialize_item_category(c: ItemCategory) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "addon_target_label": c.addon_target_label,
        "role": c.role,
    }


def serialize_item(item: Item) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "category_id": item.category_id,
        "description": item.description,
        "icon_url": item.icon_url,
        "icon_local_path": item.icon_local_path,
        "rarity": item.rarity,
        "translations": item.translations or {},
    }


def _addon_base(a) -> dict[str, Any]:
    return {
        "id": a.id,
        "name": a.name,
        "description": a.description,
        "icon_url": a.icon_url,
        "icon_local_path": a.icon_local_path,
        "rarity": a.rarity,
        "translations": a.translations or {},
    }


def serialize_killer_addon(a: KillerAddon) -> dict[str, Any]:
    """One killer add-on. `killer_id` is NOT NULL here, which it could not be
    while the 51 item add-ons shared the table."""
    return {**_addon_base(a), "killer_id": a.killer_id}


def serialize_item_addon(a: ItemAddon) -> dict[str, Any]:
    """One item-class add-on. `associated_target` and `category` are not
    exported: the first is the class's plural label, the second is the table."""
    return {**_addon_base(a), "item_category_id": a.item_category_id}


def serialize_user_showcase(sc: UserShowcase) -> dict[str, Any]:
    return {
        "username": sc.user.username if sc.user else None,
        "player_title": sc.player_title,
        "devotion_level": sc.devotion_level,
        "grade_rank": sc.grade_rank,
        # Real keys now, not the character names they used to copy.
        "survivor_main_id": sc.survivor_main_id,
        "survivor_main_prestige": sc.survivor_main_prestige,
        "survivor_perk_ids": sc.survivor_perk_ids,
        "killer_main_id": sc.killer_main_id,
        "killer_main_prestige": sc.killer_main_prestige,
        "killer_perk_ids": sc.killer_perk_ids,
    }


def serialize_smash_entity(e: Entity, username_by_user_id: dict[int, str]) -> dict[str, Any]:
    """The profile is columns now, so it exports as columns. `metadata_json` --
    one blob restating those columns in up to three spellings apiece -- is gone;
    so are `compatibility_tags` and the `en` half of `translations`, both of
    which the row already carries."""
    return {
        "slug": e.slug,
        "name": e.name,
        "real_name": e.real_name,
        "role": e.role,
        "gender": e.gender,
        "media_url": e.media_url,
        "media_display": e.media_display,
        "watermark_left": e.watermark_left,
        "watermark_right": e.watermark_right,
        "archetype": e.archetype,
        "bio": e.bio,
        "tagline": e.tagline,
        "quote": e.quote,
        "meme": e.meme,
        "turn_on": e.turn_on,
        "dealbreaker": e.dealbreaker,
        "dating_vibe": e.dating_vibe,
        "red_flags": list(e.red_flags or []),
        "green_flags": list(e.green_flags or []),
        "chapter": e.chapter,
        "danger_level": e.danger_level,
        "chaos_score": e.chaos_score,
        "translations": e.translations or {},
        "order_index": e.order_index,
        "stat": e.stat.to_dict() if e.stat else None,
        "votes": [
            {
                "username": username_by_user_id.get(v.user_id) if v.user_id else None,
                "session_id": v.session_id,
                "vote_type": v.vote_type,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in e.votes
        ],
    }


def serialize_roster(r: Roster, username_by_user_id: dict[int, str]) -> dict[str, Any]:
    return {
        "slug": r.slug,
        "name": r.name,
        "description": r.description,
        "translations": r.translations or {},
        "cover_image_url": r.cover_image_url,
        "theme_color": r.theme_color,
        "category": r.category,
        "is_nsfw": r.is_nsfw,
        "is_active": r.is_active,
        "entities": [serialize_smash_entity(e, username_by_user_id) for e in r.entities],
    }


def serialize_admin_audit_log(log: AdminAuditLog) -> dict[str, Any]:
    admin_user = db.session.get(User, log.admin_user_id) if log.admin_user_id else None
    return {
        "admin_username": admin_user.username if admin_user else None,
        "action": log.action,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "details": log.details,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def serialize_changelog_post(post: ChangelogPost) -> dict[str, Any]:
    return {
        "title": post.title,
        "content_html": post.content_html,
        "tag": post.tag,
        "position": post.position,
        "is_published": post.is_published,
        "author_username": post.author.username if post.author else None,
        "author_name": post.author_name,
        "created_at": post.created_at.isoformat() if post.created_at else None,
    }


def serialize_offering(o: Offering) -> dict[str, Any]:
    """`category` is omitted: it restated `role` and contradicted it six times."""
    return {
        "id": o.id,
        "name": o.name,
        "role": o.role,
        "realm_id": o.realm_id,
        "description": o.description,
        "icon_url": o.icon_url,
        "icon_local_path": o.icon_local_path,
        "rarity": o.rarity,
        "translations": o.translations or {},
    }


def serialize_chapter(c: Chapter) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "release_date": c.release_date.isoformat() if c.release_date else None,
        "release_year": c.release_year,
        "is_licensed": c.is_licensed,
        "dlc_type": c.dlc_type,
        "banner_url": c.banner_url,
        "banner_local_path": c.banner_local_path,
        "translations": c.translations or {},
    }


def serialize_realm(rb: Realm) -> dict[str, Any]:
    return {
        "id": rb.id,
        "name": rb.name,
        "image_url": rb.image_url,
        "image_local_path": rb.image_local_path,
        "translations": rb.translations or {},
    }


def user_avatar_relative_path(avatar_url: str | None) -> str | None:
    """Mirrors app.services.user.avatar's file layout: an uploaded avatar's
    `avatar_url` is `/api/v1/auth/avatar/file/<filename>`, stored on disk at
    `uploads/avatars/<filename>` under the static dir. "default_avatar" (or
    empty) means no uploaded file exists."""
    if not avatar_url or avatar_url == "default_avatar":
        return None
    filename = avatar_url.rsplit("/", 1)[-1].split("?")[0]
    return f"uploads/avatars/{filename}" if filename else None


def serialize_user(u: User) -> dict[str, Any]:
    return {
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


#: Every column a tier-list seed row may carry, in seed-file order. Shared by
#: the exporter (`serialize_tier_list`) and the importer, so a round trip
#: cannot drop a field one side forgot.
TIER_LIST_FIELDS = (
    "slug",
    "kind",
    "title",
    "description",
    "cover_image_url",
    "tiers",
    "item_ids",
    "custom_items",
    "default_placements",
    "translations",
    "is_featured",
    "is_active",
    "sort_order",
)

#: Optional JSON columns: omitted from a seed row when they do not apply, the
#: same "absent key means NULL" rule every other seed file follows.
_TIER_LIST_OPTIONAL = {"cover_image_url", "tiers", "item_ids", "custom_items", "default_placements", "translations"}


def serialize_tier_list(t: TierList) -> dict[str, Any]:
    """One official tier list, exported exactly as `tier_lists.json` holds it."""
    row: dict[str, Any] = {"id": t.id}
    for field in TIER_LIST_FIELDS:
        value = getattr(t, field)
        if field in _TIER_LIST_OPTIONAL and not value:
            continue
        row[field] = value
    return row

