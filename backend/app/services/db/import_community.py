# backend/app/services/db/import_community.py
"""Import of settings and community-authored data: challenge settings, audit logs,
changelog, run histories, smash-or-pass rosters and bug reports."""
from typing import Any

from sqlalchemy import delete, select

from app.core.extensions import db
from app.models.admin import AdminAuditLog, ChallengeModeSetting
from app.models.changelog import ChangelogPost
from app.models.chaos import ChaosMatchLog, ChaosRun
from app.models.community import BugReport
from app.models.gauntlet import GauntletMatchLog, GauntletRun
from app.models.history import HistoryMatchLog, HistoryRun
from app.models.page_streak import PageStreakPageLog, PageStreakRun
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.services.db._common import parse_datetime
from app.services.db.import_upserts import upsert_entity
from app.services.db.run_family_export import import_run_family


#: Entity columns an import may set, matching `serialize_smash_entity`. The
#: profile half of this list used to travel as one `metadata_json` blob.
#: `slug` is the natural key and is never reassigned here.
SMASH_ENTITY_FIELDS = [
    "name",
    "real_name",
    "role",
    "gender",
    "media_url",
    "media_display",
    "watermark_left",
    "watermark_right",
    "archetype",
    "bio",
    "tagline",
    "quote",
    "meme",
    "turn_on",
    "dealbreaker",
    "dating_vibe",
    "red_flags",
    "green_flags",
    "chapter",
    "danger_level",
    "chaos_score",
    "translations",
    "order_index",
]


def _import_admin_audit_logs(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    user_map: dict[str, int],
) -> None:
    """Append audit-log rows, attributing them to a known admin when possible."""
    if "admin_audit_logs" in target_keys and "admin_audit_logs" in data:
        created = 0
        for row in data["admin_audit_logs"]:
            admin_id = user_map.get(row.get("admin_username")) if row.get("admin_username") else None
            db.session.add(AdminAuditLog(
                admin_user_id=admin_id,
                action=row.get("action", "unknown"),
                target_type=row.get("target_type"),
                target_id=row.get("target_id"),
                details=row.get("details"),
            ))
            created += 1
        db.session.flush()
        summary["admin_audit_logs"] = {"created": created, "updated": 0}


def _import_changelog_posts(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    user_map: dict[str, int],
) -> None:
    """Append changelog posts."""
    if "changelog_posts" in target_keys and "changelog_posts" in data:
        created = 0
        for row in data["changelog_posts"]:
            author_id = user_map.get(row.get("author_username")) if row.get("author_username") else None
            db.session.add(ChangelogPost(
                title=row.get("title", "Untitled"),
                content_html=row.get("content_html", ""),
                tag=row.get("tag", "feature"),
                position=row.get("position", 0),
                is_published=row.get("is_published", True),
                author_id=author_id,
                author_name=row.get("author_name", "The Entity"),
            ))
            created += 1
        db.session.flush()
        summary["changelog_posts"] = {"created": created, "updated": 0}


def _import_rosters(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    user_map: dict[str, int],
) -> None:
    """Smash-or-pass rosters with their entities, stats and votes."""
    if "rosters" in target_keys and "rosters" in data:
        r_created = r_updated = 0
        for r_row in data["rosters"]:
            roster_obj = db.session.scalar(select(Roster).where(Roster.slug == r_row.get("slug")))
            if not roster_obj:
                roster_obj = Roster(
                    slug=r_row.get("slug"),
                    name=r_row.get("name", ""),
                    description=r_row.get("description", ""),
                    translations=r_row.get("translations", {}),
                )
                db.session.add(roster_obj)
                db.session.flush()
                r_created += 1
            else:
                r_updated += 1
            for field in ["name", "description", "translations", "cover_image_url", "theme_color", "category", "is_nsfw", "is_active"]:
                if field in r_row:
                    setattr(roster_obj, field, r_row[field])

            for e_row in r_row.get("entities", []):
                entity_obj = db.session.scalar(
                    select(Entity).where(Entity.roster_id == roster_obj.id, Entity.slug == e_row.get("slug"))
                )
                if not entity_obj:
                    entity_obj = Entity(roster_id=roster_obj.id, slug=e_row.get("slug"), name=e_row.get("name", ""))
                    db.session.add(entity_obj)
                    db.session.flush()
                # The profile fields are columns now, so they set like
                # any other column. `set_metadata()` and the
                # `metadata_json` blob it wrote are gone.
                for field in SMASH_ENTITY_FIELDS:
                    if field in e_row:
                        setattr(entity_obj, field, e_row[field])

                stat_row = e_row.get("stat")
                if stat_row:
                    # `entity_id` is the primary key of entity_stats now
                    # -- the surrogate `id` is gone -- so this lookup is
                    # the identity lookup.
                    stat_obj = db.session.scalar(select(EntityStat).where(EntityStat.entity_id == entity_obj.id))
                    if not stat_obj:
                        stat_obj = EntityStat(entity_id=entity_obj.id)
                        db.session.add(stat_obj)
                    # `total_votes` and `smash_rate` are deliberately
                    # absent: they are generated columns, assigning them
                    # raises, and the database derives them from the
                    # three counts below.
                    for field in ["smash_count", "pass_count", "super_smash_count", "chaos_rating"]:
                        if field in stat_row:
                            setattr(stat_obj, field, stat_row[field])

                db.session.execute(delete(Vote).where(Vote.entity_id == entity_obj.id))
                for vote_row in e_row.get("votes", []):
                    vote_username = vote_row.get("username")
                    vote = Vote(
                        entity_id=entity_obj.id,
                        user_id=user_map.get(vote_username) if vote_username else None,
                        session_id=vote_row.get("session_id"),
                        vote_type=vote_row.get("vote_type", "smash"),
                    )
                    created_at = parse_datetime(vote_row.get("created_at"))
                    if created_at:
                        vote.created_at = created_at
                    db.session.add(vote)
        db.session.flush()
        summary["rosters"] = {"created": r_created, "updated": r_updated}


def import_community(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    user_map: dict[str, int],
) -> None:
    """Import settings, logs, run histories, rosters and bug reports."""
    upsert_entity(
        data, target_keys, summary, "challenge_mode_settings", ChallengeModeSetting, "mode",
        update_fields=["is_enabled", "disabled_reason"],
    )
    _import_admin_audit_logs(data, target_keys, summary, user_map)
    _import_changelog_posts(data, target_keys, summary, user_map)

    import_run_family(
        data, target_keys, summary, "gauntlet_runs", GauntletRun, GauntletMatchLog, "match_logs",
        run_natural_keys=["role", "game_mode"], user_map=user_map,
    )
    import_run_family(
        data, target_keys, summary, "chaos_runs", ChaosRun, ChaosMatchLog, "match_logs",
        run_natural_keys=["difficulty"], user_map=user_map,
    )
    import_run_family(
        data, target_keys, summary, "history_runs", HistoryRun, HistoryMatchLog, "match_logs",
        run_natural_keys=["mode"], user_map=user_map,
    )
    import_run_family(
        data, target_keys, summary, "page_streak_runs", PageStreakRun, PageStreakPageLog, "page_logs",
        run_natural_keys=["killer"], user_map=user_map,
    )

    _import_rosters(data, target_keys, summary, user_map)

    upsert_entity(
        data, target_keys, summary, "bug_reports", BugReport, "title",
        update_fields=["reporter_name", "reporter_email", "category", "message", "images_json", "status", "admin_notes"],
        defaults=lambda row: {
            "reporter_name": row.get("reporter_name", "Anonymous"),
            "message": row.get("message", ""),
        },
    )
