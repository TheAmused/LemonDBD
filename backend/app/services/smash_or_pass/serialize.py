# backend/app/services/smash_or_pass/serialize.py
from typing import Any

from app.models.smash_or_pass import Entity, EntityStat


def enrich_with_stat(
    entity: Entity, stat: EntityStat | None, edition: str, lang: str | None = None
) -> dict[str, Any]:
    """Serialize an Entity plus its EntityStat into the flat dict shape shared by
    every vote/leaderboard/roster-browsing response (cast_vote, get_leaderboard,
    get_characters_with_stats, get_character_stat)."""
    d = entity.to_dict(lang)
    d["character_slug"] = entity.slug
    d["character_name"] = entity.name
    d["edition"] = edition
    d["smash_count"] = stat.smash_count if stat else 0
    d["pass_count"] = stat.pass_count if stat else 0
    d["super_smash_count"] = stat.super_smash_count if stat else 0
    # Generated columns: the database fills them in, and they read back as None
    # on a stat row that has been added but not yet flushed and re-read.
    d["total_votes"] = int(stat.total_votes or 0) if stat else 0
    d["smash_rate"] = round(stat.smash_rate or 0.0, 1) if stat else 0.0
    d["chaos_rating"] = stat.chaos_rating if stat else 50.0
    return d
