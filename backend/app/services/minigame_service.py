# backend/app/services/minigame_service.py
import hashlib
import logging
import random
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.core.extensions import db
from app.models.chapter import Chapter
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.minigame import (
    MinigameDailyChallenge,
    MinigameRepeatableChallenge,
    MinigameSharedLink,
    MinigameUserStat,
)
from app.models.perk import Perk
from app.models.smash_or_pass import Entity

logger = logging.getLogger(__name__)

# Catalog caching to eliminate repetitive DB queries
_CATALOG_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_CATALOG_TTL_SECONDS = 300

class MinigameService:
    """Core domain logic for Dead by Daylight minigames and guesser challenges."""

    def get_catalog(self, lang: str | None = None) -> dict[str, Any]:
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
                "gender": (s.gender or "female").capitalize(),
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
                "gender": (k.gender or "male").capitalize(),
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
                "perk_type": p.perk_type or "entity",
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

    def get_or_create_daily(self, game_mode: str, target_date: date, lang: str | None = None) -> dict[str, Any]:
        """Fetches cached daily challenge from PostgreSQL, or deterministically generates it."""
        existing = db.session.query(MinigameDailyChallenge).filter_by(
            challenge_date=target_date, game_mode=game_mode, is_active=True
        ).first()

        if existing:
            return existing.to_dict()

        # Generate deterministic daily challenge using date seed
        seed_str = f"{target_date.isoformat()}:{game_mode}"
        seed_int = int(hashlib.sha256(seed_str.encode("utf-8")).hexdigest(), 16) % (2**32)
        rng = random.Random(seed_int)

        rounds = self._generate_rounds_for_mode(game_mode, rng)
        title = self._default_title_for_mode(game_mode, target_date)

        daily = MinigameDailyChallenge(
            challenge_date=target_date,
            game_mode=game_mode,
            title=title,
            description=f"Official daily {game_mode.replace('_', ' ').title()} for {target_date.isoformat()}.",
            rounds=rounds,
            is_active=True,
        )
        db.session.add(daily)
        db.session.commit()

        return daily.to_dict()

    def create_repeatable(self, game_mode: str, session_id: str, custom_rounds: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Generates an ephemeral repeatable challenge session cached in PostgreSQL with 24h TTL."""
        rng = random.Random()
        rounds = custom_rounds if custom_rounds else self._generate_rounds_for_mode(game_mode, rng)

        rep = MinigameRepeatableChallenge(
            session_id=session_id,
            game_mode=game_mode,
            title=f"Repeatable {game_mode.replace('_', ' ').title()}",
            rounds=rounds,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.session.add(rep)
        db.session.commit()

        return rep.to_dict()

    def _redact_identifiers(self, text: str, targets: list[str | None], placeholder: str = "[REDACTED]") -> str:
        """Thoroughly redacts character, power, or perk names and component words from text."""
        import re
        if not text:
            return ""
        stop_words = {
            "the", "a", "an", "of", "and", "in", "on", "at", "to", "for", "with",
            "from", "by", "is", "it", "her", "his", "she", "he", "or", "as", "be",
            "was", "were", "are", "been", "that", "this", "they", "them", "their",
            "into", "over", "after", "before", "each", "all", "both", "any", "some"
        }
        clean_targets = []
        for t in targets:
            if not t:
                continue
            t_clean = t.strip()
            if len(t_clean) >= 2 and t_clean.lower() not in stop_words:
                clean_targets.append(t_clean)
            tokens = re.split(r'[\s\-]+', t_clean)
            for part in tokens:
                part_clean = part.strip("()[],.'\"")
                if len(part_clean) >= 2 and part_clean.lower() not in stop_words:
                    clean_targets.append(part_clean)

        clean_targets = sorted(list(set(clean_targets)), key=len, reverse=True)

        result = text
        for target in clean_targets:
            pattern = r'\b' + re.escape(target) + r"(?:['’]s)?\b"
            result = re.sub(pattern, placeholder, result, flags=re.IGNORECASE)
        return result

    def _generate_rounds_for_mode(self, game_mode: str, rng: random.Random) -> list[dict[str, Any]]:
        """Generates round definitions for single or multi-round game modes."""
        survivors = db.session.query(Survivor).all()
        killers = db.session.query(Killer).all()
        perks = db.session.query(Perk).all()
        realms = db.session.query(Realm).all()

        if game_mode in ("classic", "classic_character"):
            all_chars = [("survivor", s.id) for s in survivors] + [("killer", k.id) for k in killers]
            chosen_type, chosen_id = rng.choice(all_chars) if all_chars else ("killer", 1)
            return [{
                "round_number": 1,
                "mode": "classic_character",
                "target_type": chosen_type,
                "target_id": chosen_id,
                "max_attempts": 6,
            }]

        elif game_mode in ("realm", "realm_guesser"):
            chosen = rng.choice(realms) if realms else None
            return [{
                "round_number": 1,
                "mode": "realm_guesser",
                "target_type": "realm",
                "target_id": chosen.id if chosen else 1,
                "max_attempts": 6,
                "config": {"starting_zoom": 350}
            }]

        elif game_mode in ("pixel", "pixel_avatar"):
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

        elif game_mode in ("perk", "perk_distortion"):
            chosen = rng.choice(perks) if perks else None
            return [{
                "round_number": 1,
                "mode": "perk_distortion",
                "target_type": "perk",
                "target_id": chosen.id if chosen else 1,
                "max_attempts": 6,
            }]

        elif game_mode in ("classic_perk", "perk_classic"):
            chosen = rng.choice(perks) if perks else None
            return [{
                "round_number": 1,
                "mode": "classic_perk",
                "target_type": "perk",
                "target_id": chosen.id if chosen else 1,
                "max_attempts": 6,
            }]

        elif game_mode in ("power", "killer_power"):
            chosen_killer = rng.choice(killers) if killers else None
            killer_desc = chosen_killer.power_description if chosen_killer else ""
            if chosen_killer:
                killer_desc = self._redact_identifiers(
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

        elif game_mode in ("audio", "terror_radius"):
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

        elif game_mode == "fog_trial":
            # Multi-round interchangeable trial: Realm -> Power -> Audio -> Classic
            realm = rng.choice(realms) if realms else None
            killer = rng.choice(killers) if killers else None
            killer_id = killer.id if killer else 1
            killer_desc = killer.power_description if killer else ""
            if killer:
                killer_desc = self._redact_identifiers(
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

        elif game_mode in ("quote", "quote_lore"):
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
                    quote_text = self._redact_identifiers(quote_text, [target_name, getattr(target_char, "real_name", None)], placeholder="[REDACTED]")
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
                lore_excerpt = self._redact_identifiers(
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

        elif game_mode in ("addon", "addon_guesser"):
            from app.models.equipment import KillerAddon
            addons = db.session.query(KillerAddon).join(Killer).filter(
                KillerAddon.description != None,
                KillerAddon.description != ""
            ).all()
            if addons:
                chosen_addon = rng.choice(addons)
                killer = chosen_addon.killer
                addon_desc = chosen_addon.description
                addon_desc = self._redact_identifiers(
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

        elif game_mode == "emoji_riddle":
            killers_with_emojis = [k for k in killers if k.emoji_riddle]
            chosen_killer = rng.choice(killers_with_emojis or killers) if killers else None
            killer_id = chosen_killer.id if chosen_killer else 1
            emojis = chosen_killer.emoji_riddle if (chosen_killer and chosen_killer.emoji_riddle) else "🔪 💀 🩸"
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

        # Default fallback: classic character
        chosen_killer = rng.choice(killers) if killers else None
        return [{
            "round_number": 1,
            "mode": game_mode,
            "target_type": "killer",
            "target_id": chosen_killer.id if chosen_killer else 1,
            "max_attempts": 6,
        }]

    def _default_title_for_mode(self, game_mode: str, target_date: date) -> str:
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

    def evaluate_guess(self, round_data: dict[str, Any], guess_type: str, guess_id: int, attempt_number: int = 1) -> dict[str, Any]:
        """Evaluates a guess against round_data, returning mode-specific feedback."""
        mode = round_data.get("mode", "classic_character")
        target_type = round_data.get("target_type", "killer")
        target_id = round_data.get("target_id")

        if mode in ("classic_character", "classic", "classic_killer"):
            return self._evaluate_classic_character(target_type, target_id, guess_type, guess_id, attempt_number)
        elif mode in ("classic_perk", "perk_classic"):
            return self._evaluate_classic_perk(target_id, guess_id, attempt_number)
        elif mode in ("realm_guesser", "realm"):
            return self._evaluate_realm(target_id, guess_id, attempt_number)
        elif mode in ("terror_radius", "voice_line", "hook_scream", "audio"):
            return self._evaluate_audio(target_type, target_id, guess_type, guess_id, attempt_number)
        elif mode in ("quote_lore", "quote"):
            is_match = (target_type == guess_type and target_id == guess_id)
            target_obj = (
                db.session.get(Killer, target_id) if target_type == "killer"
                else db.session.get(Survivor, target_id) if target_type == "survivor"
                else db.session.get(Perk, target_id)
            )
            guess_obj = (
                db.session.get(Killer, guess_id) if guess_type == "killer"
                else db.session.get(Survivor, guess_id) if guess_type == "survivor"
                else db.session.get(Perk, guess_id)
            )
            clues = {}
            if target_obj:
                if attempt_number >= 1:
                    clues["role"] = target_type.title()
                if attempt_number >= 2 and hasattr(target_obj, "chapter") and target_obj.chapter:
                    clues["chapter"] = target_obj.chapter.name
                if attempt_number >= 3:
                    clues["first_letter"] = target_obj.name[0]

            return {
                "is_correct": is_match,
                "attempt_number": attempt_number,
                "details": {"match": is_match},
                "unlocked_clues": clues,
                "guess": {
                    "id": guess_obj.id if guess_obj else guess_id,
                    "name": guess_obj.name if guess_obj else "Unknown",
                    "role": guess_type.title(),
                    "avatar_url": getattr(guess_obj, "portrait_url", "") or (f"/static/{guess_obj.avatar_local_path}" if getattr(guess_obj, "avatar_local_path", None) else ""),
                    "icon_url": getattr(guess_obj, "icon_url", "") or (f"/static/{guess_obj.icon_local_path}" if getattr(guess_obj, "icon_local_path", None) else ""),
                } if guess_obj else None,
            }
        elif mode in ("killer_power", "perk_distortion", "pixel_avatar", "addon_guesser", "emoji_riddle"):
            is_match = (target_type == guess_type and target_id == guess_id)
            guess_obj = (
                db.session.get(Killer, guess_id) if guess_type == "killer"
                else db.session.get(Survivor, guess_id) if guess_type == "survivor"
                else db.session.get(Perk, guess_id) if guess_type == "perk"
                else db.session.get(Realm, guess_id)
            )
            return {
                "is_correct": is_match,
                "attempt_number": attempt_number,
                "details": {"match": is_match},
                "guess": {
                    "id": guess_obj.id if guess_obj else guess_id,
                    "name": guess_obj.name if guess_obj else "Unknown",
                    "role": guess_type.title(),
                    "avatar_url": getattr(guess_obj, "portrait_url", "") or (f"/static/{guess_obj.avatar_local_path}" if getattr(guess_obj, "avatar_local_path", None) else ""),
                    "icon_url": getattr(guess_obj, "icon_url", "") or (f"/static/{guess_obj.icon_local_path}" if getattr(guess_obj, "icon_local_path", None) else ""),
                } if guess_obj else None,
            }
        else:
            is_match = (target_type == guess_type and target_id == guess_id)
            return {
                "is_correct": is_match,
                "attempt_number": attempt_number,
                "details": {"match": is_match}
            }

    def _evaluate_classic_perk(self, target_id: int, guess_id: int, attempt_number: int) -> dict[str, Any]:
        """Calculates attribute comparison matrix between guess and target perk."""
        target = db.session.get(Perk, target_id)
        guess = db.session.get(Perk, guess_id)

        if not target or not guess:
            return {"error": "Target or guess perk not found", "is_correct": False}

        is_exact = (target_id == guess_id)

        target_char_name = target.character.name if target.character else "General"
        guess_char_name = guess.character.name if guess.character else "General"

        target_role = (target.role or "Survivor").capitalize()
        guess_role = (guess.role or "Survivor").capitalize()

        target_type = (target.perk_type or "General").lower()
        guess_type = (guess.perk_type or "General").lower()

        target_teachable = bool(target.is_teachable)
        guess_teachable = bool(guess.is_teachable)

        clues = {}
        if attempt_number >= 3 and target.description:
            clues["first_sentence"] = target.description.split(".")[0] + "."

        return {
            "is_correct": is_exact,
            "attempt_number": attempt_number,
            "guess": {
                "id": guess.id,
                "name": guess.name,
                "role": guess_role,
                "character_name": guess_char_name,
                "perk_type": guess.perk_type or "General",
                "is_teachable": guess_teachable,
                "icon_url": guess.icon_url or (f"/static/{guess.icon_local_path}" if guess.icon_local_path else ""),
            },
            "attributes": {
                "role": {"status": "correct" if target_role == guess_role else "incorrect"},
                "character_name": {"status": "correct" if target_char_name == guess_char_name else "incorrect"},
                "perk_type": {"status": "correct" if target_type == guess_type else "incorrect"},
                "is_teachable": {"status": "correct" if target_teachable == guess_teachable else "incorrect"},
            },
            "unlocked_clues": clues,
        }


    def _evaluate_classic_character(self, target_type: str, target_id: int, guess_type: str, guess_id: int, attempt_number: int) -> dict[str, Any]:
        """Calculates attribute comparison matrix between guess and target character."""
        # Fetch target
        target = db.session.get(Killer if target_type == "killer" else Survivor, target_id)
        guess = db.session.get(Killer if guess_type == "killer" else Survivor, guess_id)

        if not target or not guess:
            return {"error": "Target or guess not found", "is_correct": False}

        is_exact = (target_type == guess_type and target_id == guess_id)

        # 1. Role
        target_role = "Killer" if target_type == "killer" else "Survivor"
        guess_role = "Killer" if guess_type == "killer" else "Survivor"
        role_match = "correct" if target_role == guess_role else "incorrect"

        # 2. Gender
        target_gender = (target.gender or "unknown").lower()
        guess_gender = (guess.gender or "unknown").lower()
        gender_match = "correct" if target_gender == guess_gender else "incorrect"

        # 3. Chapter
        target_chap = target.chapter
        guess_chap = guess.chapter
        target_chap_name = target_chap.name if target_chap else "Base Game"
        guess_chap_name = guess_chap.name if guess_chap else "Base Game"
        chapter_match = "correct" if target_chap_name == guess_chap_name else "incorrect"

        # 4. Release Year
        target_year = (target_chap.release_year if target_chap else None) or 2016
        guess_year = (guess_chap.release_year if guess_chap else None) or 2016
        if target_year == guess_year:
            year_res = {"status": "correct", "direction": "equal", "value": guess_year}
        elif target_year > guess_year:
            year_res = {"status": "incorrect", "direction": "higher", "value": guess_year}
        else:
            year_res = {"status": "incorrect", "direction": "lower", "value": guess_year}

        # 5. Licensed status
        target_licensed = bool(target_chap.is_licensed) if target_chap else False
        guess_licensed = bool(guess_chap.is_licensed) if guess_chap else False
        license_match = "correct" if target_licensed == guess_licensed else "incorrect"

        # 6. Stature / Height
        target_height = getattr(target, "height", "Tall") or "Tall"
        guess_height = getattr(guess, "height", "Tall") or "Tall"
        height_match = "correct" if target_height == guess_height else "incorrect"

        # 7. Clues unlocking at thresholds
        clues = {}
        if attempt_number >= 3:
            clues["first_letter"] = target.name[0]
        if attempt_number >= 5:
            clues["real_name_initials"] = "".join(w[0] for w in (target.real_name or target.name).split() if w)

        return {
            "is_correct": is_exact,
            "attempt_number": attempt_number,
            "guess": {
                "id": guess.id,
                "name": guess.name,
                "role": guess_role,
                "avatar_url": guess.portrait_url or f"/static/{guess.avatar_local_path}" if guess.avatar_local_path else "",
            },
            "attributes": {
                "role": role_match,
                "gender": gender_match,
                "chapter": chapter_match,
                "release_year": year_res,
                "is_licensed": license_match,
                "height": height_match,
            },
            "unlocked_clues": clues,
        }

    def _evaluate_realm(self, target_id: int, guess_id: int, attempt_number: int) -> dict[str, Any]:
        """Evaluates Realm guess and reveals progressive landmark and layout clues."""
        target_realm = db.session.get(Realm, target_id)
        guess_realm = db.session.get(Realm, guess_id)
        is_match = (target_id == guess_id)

        clues = {}
        if target_realm:
            if attempt_number >= 2:
                clues["maps_count"] = len(target_realm.maps) if hasattr(target_realm, "maps") else 3
            if attempt_number >= 3:
                clues["first_letter"] = target_realm.name[0]

        return {
            "is_correct": is_match,
            "attempt_number": attempt_number,
            "guess": {
                "id": guess_realm.id if guess_realm else guess_id,
                "name": guess_realm.name if guess_realm else "Unknown Realm",
            },
            "unlocked_clues": clues,
        }

    def _evaluate_audio(self, target_type: str, target_id: int, guess_type: str, guess_id: int, attempt_number: int) -> dict[str, Any]:
        """Evaluates audio guess (Terror radius / Chase music) and unlocks killer attribute clues."""
        is_match = (target_type == guess_type and target_id == guess_id)
        target_killer = db.session.get(Killer, target_id) if target_type == "killer" else None
        guess_obj = db.session.get(Killer, guess_id) if guess_type == "killer" else db.session.get(Survivor, guess_id)

        clues = {}
        if target_killer:
            if attempt_number >= 1:
                clues["movement_speed"] = target_killer.movement_speed or "4.6 m/s"
            if attempt_number >= 2:
                clues["terror_radius"] = target_killer.terror_radius or "32 metres"
            if attempt_number >= 3:
                clues["height"] = target_killer.height or "Average"

        layers = ["32m", "16m", "8m", "chase"]
        unlocked_layer = layers[min(attempt_number - 1, len(layers) - 1)]

        return {
            "is_correct": is_match,
            "attempt_number": attempt_number,
            "unlocked_audio_layer": unlocked_layer,
            "unlocked_clues": clues,
            "guess": {
                "id": guess_obj.id if guess_obj else guess_id,
                "name": guess_obj.name if guess_obj else "Unknown",
                "role": "Killer" if guess_type == "killer" else "Survivor",
                "avatar_url": (guess_obj.portrait_url or f"/static/{guess_obj.avatar_local_path}") if (guess_obj and hasattr(guess_obj, "avatar_local_path") and guess_obj.avatar_local_path) else "",
            } if guess_obj else None,
        }

