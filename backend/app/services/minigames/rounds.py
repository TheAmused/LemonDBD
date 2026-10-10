# backend/app/services/minigames/rounds.py
"""Round definitions for every minigame mode, and the title a daily challenge gets."""
import random
from datetime import date
from typing import Any

from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.perk import Perk
from app.services.minigames.redaction import redact_identifiers


def _classic_character_round(rng: random.Random, survivors: list[Survivor], killers: list[Killer]) -> list[dict[str, Any]]:
    """Round definition for the `classic_character` mode."""
    all_chars = [("survivor", s.id) for s in survivors] + [("killer", k.id) for k in killers]
    chosen_type, chosen_id = rng.choice(all_chars) if all_chars else ("killer", 1)
    return [{
        "round_number": 1,
        "mode": "classic_character",
        "target_type": chosen_type,
        "target_id": chosen_id,
        "max_attempts": 6,
    }]


def _realm_round(rng: random.Random, realms: list[Realm]) -> list[dict[str, Any]]:
    """Round definition for the `realm_guesser` mode."""
    chosen = rng.choice(realms) if realms else None
    return [{
        "round_number": 1,
        "mode": "realm_guesser",
        "target_type": "realm",
        "target_id": chosen.id if chosen else 1,
        "max_attempts": 6,
        "config": {"starting_zoom": 350}
    }]


def _pixel_avatar_round(rng: random.Random, survivors: list[Survivor], killers: list[Killer]) -> list[dict[str, Any]]:
    """Round definition for the `pixel_avatar` mode."""
    all_chars = [("survivor", s.id) for s in survivors] + [("killer", k.id) for k in killers]
    chosen_type, chosen_id = rng.choice(all_chars) if all_chars else ("killer", 1)
    return [{
        "round_number": 1,
        "mode": "pixel_avatar",
        "target_type": chosen_type,
        "target_id": chosen_id,
        "max_attempts": 6,
        "config": {"initial_pixel_size": 24}
    }]


def _perk_distortion_round(rng: random.Random, perks: list[Perk]) -> list[dict[str, Any]]:
    """Round definition for the `perk_distortion` mode."""
    chosen = rng.choice(perks) if perks else None
    return [{
        "round_number": 1,
        "mode": "perk_distortion",
        "target_type": "perk",
        "target_id": chosen.id if chosen else 1,
        "max_attempts": 6,
    }]


def _classic_perk_round(rng: random.Random, perks: list[Perk]) -> list[dict[str, Any]]:
    """Round definition for the `classic_perk` mode."""
    chosen = rng.choice(perks) if perks else None
    return [{
        "round_number": 1,
        "mode": "classic_perk",
        "target_type": "perk",
        "target_id": chosen.id if chosen else 1,
        "max_attempts": 6,
    }]


def _killer_power_round(rng: random.Random, killers: list[Killer]) -> list[dict[str, Any]]:
    """Round definition for the `killer_power` mode."""
    chosen_killer = rng.choice(killers) if killers else None
    killer_desc = chosen_killer.power_description if chosen_killer else ""
    if chosen_killer:
        killer_desc = redact_identifiers(
            killer_desc,
            [chosen_killer.name, chosen_killer.real_name, chosen_killer.power_name],
            placeholder="[REDACTED]"
        )
    return [{
        "round_number": 1,
        "mode": "killer_power",
        "target_type": "killer",
        "target_id": chosen_killer.id if chosen_killer else 1,
        "max_attempts": 5,
        "custom_data": {
            "power_description": killer_desc,
        },
    }]


def _terror_radius_round(rng: random.Random, killers: list[Killer]) -> list[dict[str, Any]]:
    """Round definition for the `terror_radius` mode."""
    chosen_killer = rng.choice(killers) if killers else None
    killer_id = chosen_killer.id if chosen_killer else 1
    return [{
        "round_number": 1,
        "mode": "terror_radius",
        "target_type": "killer",
        "target_id": killer_id,
        "max_attempts": 5,
        "custom_data": {
            "audio_endpoint": f"/api/v1/minigames/audio/terror_radius/{killer_id}",
        },
    }]


def _fog_trial_rounds(rng: random.Random, realms: list[Realm], killers: list[Killer]) -> list[dict[str, Any]]:
    """Round definition for the `fog_trial` mode."""
    # Multi-round interchangeable trial: Realm -> Power -> Audio -> Classic
    realm = rng.choice(realms) if realms else None
    killer = rng.choice(killers) if killers else None
    killer_id = killer.id if killer else 1
    killer_desc = killer.power_description if killer else ""
    if killer:
        killer_desc = redact_identifiers(
            killer_desc,
            [killer.name, killer.real_name, killer.power_name],
            placeholder="[REDACTED]"
        )
    return [
        {
            "round_number": 1,
            "mode": "realm_guesser",
            "target_type": "realm",
            "target_id": realm.id if realm else 1,
            "max_attempts": 5,
            "config": {"starting_zoom": 400}
        },
        {
            "round_number": 2,
            "mode": "killer_power",
            "target_type": "killer",
            "target_id": killer_id,
            "max_attempts": 5,
            "custom_data": {
                "power_description": killer_desc,
            },
        },
        {
            "round_number": 3,
            "mode": "terror_radius",
            "target_type": "killer",
            "target_id": killer_id,
            "max_attempts": 5,
            "custom_data": {
                "audio_endpoint": f"/api/v1/minigames/audio/terror_radius/{killer_id}",
            },
        },
        {
            "round_number": 4,
            "mode": "classic_character",
            "target_type": "killer",
            "target_id": killer_id,
            "max_attempts": 6,
        }
    ]


def _quote_lore_round(rng: random.Random, survivors: list[Survivor], killers: list[Killer], perks: list[Perk]) -> list[dict[str, Any]]:
    """Round definition for the `quote_lore` mode."""
    import re as _re

    # 50% chance to pick an iconic perk quote, 50% chance to pick a character lore excerpt
    perks_with_quotes = [p for p in perks if p.description and ('“' in p.description or '"' in p.description)]
    pick_perk_quote = bool(perks_with_quotes) and (rng.random() < 0.5)

    if pick_perk_quote:
        chosen_perk = rng.choice(perks_with_quotes)
        desc = chosen_perk.description
        # Extract quote (text between quotes or ending quote)
        quote_match = _re.search(r'[“"][^”"]+[”"](?:\s*-[^\n\r]+)?', desc)
        quote_text = quote_match.group(0).strip() if quote_match else desc[-200:].strip()
        
        # If perk has an associated character, target that character; otherwise target the perk
        target_char = chosen_perk.killer or chosen_perk.survivor
        if target_char:
            target_type = "killer" if chosen_perk.killer else "survivor"
            target_id = target_char.id
            target_name = target_char.name
            chapter_name = target_char.chapter.name if target_char.chapter else "Base Game"
            release_year = target_char.chapter.release_year if target_char.chapter else 2016
        else:
            target_type = "perk"
            target_id = chosen_perk.id
            target_name = chosen_perk.name
            chapter_name = "General Perks"
            release_year = 2016

        # Thoroughly clean target names from quote
        if target_name:
            quote_text = redact_identifiers(quote_text, [target_name, getattr(target_char, "real_name", None)], placeholder="[REDACTED]")
            quote_text = _re.sub(r'-\s*\[REDACTED\](?:\s*\[REDACTED\])*', '- [REDACTED]', quote_text)

        return [{
            "round_number": 1,
            "mode": "quote_lore",
            "target_type": target_type,
            "target_id": target_id,
            "max_attempts": 6,
            "custom_data": {
                "quote": quote_text,
                "quote_type": "perk_quote",
                "perk_name": chosen_perk.name,
                "role": target_type.title(),
                "chapter_name": chapter_name,
                "release_year": release_year,
            },
        }]

    # Character lore mode
    chars_with_lore = [(s, "survivor") for s in survivors if s.lore] + \
                      [(k, "killer") for k in killers if k.lore]
    if chars_with_lore:
        chosen_char, chosen_type = rng.choice(chars_with_lore)
    elif killers:
        chosen_char, chosen_type = killers[0], "killer"
    else:
        chosen_char, chosen_type = None, "killer"

    full_lore = (chosen_char.lore if chosen_char else None) or "The Entity hungers for more souls in the unending fog..."
    paragraphs = [p.strip() for p in full_lore.split("\n") if p.strip()]
    lore_excerpt = "\n\n".join(paragraphs[:2]) if len(paragraphs) >= 2 else full_lore
    if len(lore_excerpt) > 650:
        lore_excerpt = lore_excerpt[:600] + "..."

    if chosen_char:
        lore_excerpt = redact_identifiers(
            lore_excerpt,
            [chosen_char.name, getattr(chosen_char, "real_name", None)],
            placeholder="[REDACTED]"
        )

    chapter_name = chosen_char.chapter.name if (chosen_char and chosen_char.chapter) else "Base Game"
    release_year = chosen_char.chapter.release_year if (chosen_char and chosen_char.chapter) else 2016

    return [{
        "round_number": 1,
        "mode": "quote_lore",
        "target_type": chosen_type,
        "target_id": chosen_char.id if chosen_char else 1,
        "max_attempts": 6,
        "custom_data": {
            "quote": lore_excerpt,
            "quote_type": "character_lore",
            "role": chosen_type.title(),
            "chapter_name": chapter_name,
            "release_year": release_year,
        },
    }]


def _addon_guesser_round(rng: random.Random) -> list[dict[str, Any]] | None:
    """Round definition for the `addon_guesser` mode."""
    from app.models.equipment import KillerAddon
    addons = db.session.query(KillerAddon).join(Killer).filter(
        KillerAddon.description != None,
        KillerAddon.description != ""
    ).all()
    if addons:
        chosen_addon = rng.choice(addons)
        killer = chosen_addon.killer
        addon_desc = chosen_addon.description
        addon_desc = redact_identifiers(
            addon_desc,
            [killer.name, killer.real_name, killer.power_name, chosen_addon.name],
            placeholder="[REDACTED]"
        )
        return [{
            "round_number": 1,
            "mode": "addon_guesser",
            "target_type": "killer",
            "target_id": killer.id,
            "max_attempts": 5,
            "custom_data": {
                "addon_id": chosen_addon.id,
                "description": addon_desc,
                "rarity": chosen_addon.rarity,
                "icon_url": chosen_addon.icon_url,
            },
        }]


def _emoji_riddle_round(rng: random.Random, killers: list[Killer]) -> list[dict[str, Any]]:
    """Round definition for the `emoji_riddle` mode."""
    killers_with_emojis = [k for k in killers if k.emoji_riddle]
    chosen_killer = rng.choice(killers_with_emojis or killers) if killers else None
    killer_id = chosen_killer.id if chosen_killer else 1
    emojis = (chosen_killer.emoji_riddle if chosen_killer else None) or ""
    return [{
        "round_number": 1,
        "mode": "emoji_riddle",
        "target_type": "killer",
        "target_id": killer_id,
        "max_attempts": 5,
        "custom_data": {
            "emojis": emojis,
        },
    }]


def _fallback_round(game_mode: str, rng: random.Random, killers: list[Killer]) -> list[dict[str, Any]]:
    """Round for a mode with no dedicated generator."""
    chosen_killer = rng.choice(killers) if killers else None
    return [{
        "round_number": 1,
        "mode": game_mode,
        "target_type": "killer",
        "target_id": chosen_killer.id if chosen_killer else 1,
        "max_attempts": 6,
    }]


def generate_rounds_for_mode(game_mode: str, rng: random.Random) -> list[dict[str, Any]]:
    """Generates round definitions for single or multi-round game modes."""
    survivors = db.session.query(Survivor).all()
    killers = db.session.query(Killer).all()
    perks = db.session.query(Perk).all()
    realms = db.session.query(Realm).all()

    if game_mode in ("classic", "classic_character"):
        return _classic_character_round(rng, survivors, killers)
    elif game_mode in ("realm", "realm_guesser"):
        return _realm_round(rng, realms)
    elif game_mode in ("pixel", "pixel_avatar"):
        return _pixel_avatar_round(rng, survivors, killers)
    elif game_mode in ("perk", "perk_distortion"):
        return _perk_distortion_round(rng, perks)
    elif game_mode in ("classic_perk", "perk_classic"):
        return _classic_perk_round(rng, perks)
    elif game_mode in ("power", "killer_power"):
        return _killer_power_round(rng, killers)
    elif game_mode in ("audio", "terror_radius"):
        return _terror_radius_round(rng, killers)
    elif game_mode == "fog_trial":
        return _fog_trial_rounds(rng, realms, killers)
    elif game_mode in ("quote", "quote_lore"):
        return _quote_lore_round(rng, survivors, killers, perks)
    elif game_mode in ("addon", "addon_guesser"):
        rounds = _addon_guesser_round(rng)
        if rounds:
            return rounds
    elif game_mode == "emoji_riddle":
        return _emoji_riddle_round(rng, killers)

    return _fallback_round(game_mode, rng, killers)


def default_title_for_mode(game_mode: str, target_date: date) -> str:
    names = {
        "classic": "Daily Character Guesser",
        "classic_character": "Daily Character Guesser",
        "classic_killer": "Daily Killer Guesser",
        "classic_perk": "Daily Classic Perk Idle",
        "realm": "Daily Realm Survey",
        "realm_guesser": "Daily Realm Survey",
        "fog_trial": "The Fog Gauntlet Trial",
        "perk": "Daily Perk Decryption",
        "perk_distortion": "Daily Perk Decryption",
        "power": "Daily Killer Power Clue",
        "killer_power": "Daily Killer Power Clue",
        "audio": "Daily Audio Soundscape",
        "terror_radius": "Daily Terror Radius Soundscape",
        "voice_line": "Daily Voice Line Riddle",
        "pixel": "Daily Pixel Avatar Guesser",
        "pixel_avatar": "Daily Pixel Avatar Guesser",
        "quote": "Daily Lore & Quote Guesser",
        "quote_lore": "Daily Lore & Quote Guesser",
        "addon": "Daily Killer Add-on Guesser",
        "addon_guesser": "Daily Killer Add-on Guesser",
        "emoji_riddle": "Daily Emoji Riddle",
    }
    return f"{names.get(game_mode, 'Daily Minigame')} #{target_date.strftime('%Y%m%d')}"
