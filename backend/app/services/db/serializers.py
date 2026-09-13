# backend/app/services/db/serializers.py
from typing import Any
from app.core.extensions import db
from app.models.admin import AdminAuditLog
from app.models.changelog import ChangelogPost
from app.models.chapter import Chapter
from app.models.character import Character
from app.models.equipment import Item, Addon, Offering
from app.models.map import Realm
from app.models.perk import Perk
from app.models.smash_or_pass import Entity, Roster
from app.models.user import User, UserShowcase


def power_icon_local_path(power_name: str | None) -> str | None:
    """Mirrors Character.to_dict()'s computed (not stored) power icon path,
    so export/import knows where the power icon actually lives on disk."""
    if not power_name:
        return None
    p_clean = power_name.lower().replace(" ", "_").replace("'", "").replace("-", "_")
    return f"icons/powers/{p_clean}.webp" if p_clean else None


def serialize_character(c: Character) -> dict[str, Any]:
    return {
        "name": c.name,
        "role": c.role,
        "code_prefix": c.code_prefix,
        "portrait_url": c.portrait_url,
        "real_name": c.real_name,
        "short_name": c.short_name,
        "wiki_slug": c.wiki_slug,
        "avatar_local_path": c.avatar_local_path,
        "release_number": c.release_number,
        "chapter_name": c.chapter_name,
        "chapter_number": c.chapter_number,
        "dlc_type": c.dlc_type,
        "is_licensed": c.is_licensed,
        "release_year": c.release_year,
        "release_date": c.release_date,
        "dlc_counterparts": c.dlc_counterparts,
        "lore": c.lore,
        "power_name": c.power_name,
        "power_description": c.power_description,
        "power_icon_url": c.power_icon_url,
        "power_icon_local_path": power_icon_local_path(c.power_name),
        "movement_speed": c.movement_speed,
        "terror_radius": c.terror_radius,
        "terror_radius_meters": c.terror_radius_meters,
        "height": c.height,
        "translations": c.translations or {},
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def serialize_perk(p: Perk) -> dict[str, Any]:
    return {
        "name": p.name,
        "alternate_name": p.alternate_name,
        "is_generic_counterpart": p.is_generic_counterpart,
        "is_teachable": p.is_teachable,
        "category": p.category,
        "description": p.description,
        "icon_url": p.icon_url,
        "icon_local_path": p.icon_local_path,
        "character_name": p.character.name if p.character else None,
        "translations": p.translations or {},
    }


def serialize_item(item: Item) -> dict[str, Any]:
    return {
        "name": item.name,
        "category": item.category,
        "role": item.role,
        "description": item.description,
        "icon_url": item.icon_url,
        "icon_local_path": item.icon_local_path,
        "rarity": item.rarity,
        "translations": item.translations or {},
    }


def serialize_addon(a: Addon) -> dict[str, Any]:
    return {
        "name": a.name,
        "associated_target": a.associated_target,
        "category": a.category,
        "description": a.description,
        "icon_url": a.icon_url,
        "icon_local_path": a.icon_local_path,
        "rarity": a.rarity,
        "translations": a.translations or {},
    }


def serialize_user_showcase(sc: UserShowcase) -> dict[str, Any]:
    return {
        "username": sc.user.username if sc.user else None,
        "player_title": sc.player_title,
        "devotion_level": sc.devotion_level,
        "grade_rank": sc.grade_rank,
        "survivor_main_character": sc.survivor_main_character,
        "survivor_main_prestige": sc.survivor_main_prestige,
        "survivor_perk_ids": sc.survivor_perk_ids,
        "killer_main_character": sc.killer_main_character,
        "killer_main_prestige": sc.killer_main_prestige,
        "killer_perk_ids": sc.killer_perk_ids,
    }


def serialize_smash_entity(e: Entity, username_by_user_id: dict[int, str]) -> dict[str, Any]:
    return {
        "slug": e.slug,
        "name": e.name,
        "role": e.role,
        "gender": e.gender,
        "media_url": e.media_url,
        "media_type": e.media_type,
        "metadata_json": e.get_metadata(),
        "order_index": e.order_index,
        "is_active": e.is_active,
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
        "name_i18n_key": r.name_i18n_key,
        "description_i18n_key": r.description_i18n_key,
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
    return {
        "name": o.name,
        "category": o.category,
        "role": o.role,
        "description": o.description,
        "icon_url": o.icon_url,
        "icon_local_path": o.icon_local_path,
        "rarity": o.rarity,
        "translations": o.translations or {},
    }


def serialize_chapter(c: Chapter) -> dict[str, Any]:
    return {
        "name": c.name,
        "banner_url": c.banner_url,
        "banner_local_path": c.banner_local_path,
    }


def serialize_realm(rb: Realm) -> dict[str, Any]:
    return {
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
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }
