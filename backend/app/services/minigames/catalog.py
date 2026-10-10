# backend/app/services/minigames/catalog.py
"""Searchable catalog (characters, perks, realms) the guessing minigames autocomplete from."""
import time
from typing import Any

from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.perk import Perk

# Catalog caching to eliminate repetitive DB queries
_CATALOG_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_CATALOG_TTL_SECONDS = 300


def get_catalog(lang: str | None = None) -> dict[str, Any]:
    """Returns full searchable catalog of characters, perks, realms, and powers."""
    cache_key = f"catalog:{lang or 'default'}"
    now = time.time()
    if cache_key in _CATALOG_CACHE:
        ts, cached_data = _CATALOG_CACHE[cache_key]
        if now - ts < _CATALOG_TTL_SECONDS:
            return cached_data

    survivors = db.session.query(Survivor).options(joinedload(Survivor.chapter)).all()
    killers = db.session.query(Killer).options(joinedload(Killer.chapter)).all()
    perks = db.session.query(Perk).options(joinedload(Perk.survivor), joinedload(Perk.killer)).all()
    realms = db.session.query(Realm).options(joinedload(Realm.maps)).all()

    characters_list = []
    for s in survivors:
        chap = s.chapter
        characters_list.append({
            "id": s.id,
            "type": "survivor",
            "name": s.localized(lang, "name", s.name),
            "raw_name": s.name,
            "real_name": s.real_name or s.name,
            "role": "Survivor",
            "gender": (s.gender or "unknown").capitalize(),
            "avatar_url": s.portrait_url or f"/static/{s.avatar_local_path}" if s.avatar_local_path else "",
            "chapter_id": s.chapter_id,
            "chapter_name": chap.localized_name(lang) if chap else "Base Game",
            "release_year": (chap.release_year if chap else None) or 2016,
            "is_licensed": bool(chap.is_licensed) if chap else False,
            "height": s.height or "Average",
            "emoji_riddle": s.emoji_riddle or "",
        })

    for k in killers:
        chap = k.chapter
        characters_list.append({
            "id": k.id,
            "type": "killer",
            "name": k.localized(lang, "name", k.name),
            "raw_name": k.name,
            "real_name": k.real_name or k.name,
            "role": "Killer",
            "gender": (k.gender or "unknown").capitalize(),
            "avatar_url": k.portrait_url or f"/static/{k.avatar_local_path}" if k.avatar_local_path else "",
            "chapter_id": k.chapter_id,
            "chapter_name": chap.localized_name(lang) if chap else "Base Game",
            "release_year": (chap.release_year if chap else None) or 2016,
            "is_licensed": bool(chap.is_licensed) if chap else False,
            "height": k.height or "Tall",
            "emoji_riddle": k.emoji_riddle or "",
            "power_name": k.power_name,
            "power_icon_url": k.power_icon_url or f"/static/{k.power_icon_local_path}" if k.power_icon_local_path else "",
            "movement_speed": k.movement_speed or "4.6 m/s",
            "terror_radius": k.terror_radius or "32 metres",
            "terror_radius_meters": k.terror_radius_meters or 32,
            "chase_music_url": k.chase_music_url or "",
        })

    perks_list = []
    for p in perks:
        perks_list.append({
            "id": p.id,
            "name": p.name,
            "role": p.role,
            "perk_types": p.resolved_perk_types,
            "is_teachable": p.is_teachable,
            "character_name": p.character.name if p.character else "General",
            "icon_url": p.icon_url or f"/static/{p.icon_local_path}" if p.icon_local_path else "",
            "description": p.description,
        })

    realms_list = []
    for r in realms:
        realms_list.append({
            "id": r.id,
            "name": r.localized_name(lang),
            "raw_name": r.name,
            "image_url": r.image_url or f"/static/{r.image_local_path}" if r.image_local_path else "",
        })

    killers_list = [c for c in characters_list if c["role"] == "Killer"]
    survivors_list = [c for c in characters_list if c["role"] == "Survivor"]

    result = {
        "characters": characters_list,
        "killers": killers_list,
        "survivors": survivors_list,
        "perks": perks_list,
        "realms": realms_list,
    }
    _CATALOG_CACHE[cache_key] = (now, result)
    return result
