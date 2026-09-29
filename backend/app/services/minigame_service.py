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

# Fallback gender mappings for canon characters (98 characters)
KNOWN_GENDERS: dict[str, str] = {
    # Survivors (Female)
    "Meg Thomas": "female", "Claudette Morel": "female", "Nea Karlsson": "female",
    "Laurie Strode": "female", "Feng Min": "female", "Kate Denson": "female",
    "Jane Romero": "female", "Nancy Wheeler": "female", "Yui Kimura": "female",
    "Zarina Kassir": "female", "Cheryl Mason": "female", "Elodie Rakoto": "female",
    "Élodie Rakoto": "female", "Yun-Jin Lee": "female", "Lee Yun-jin": "female",
    "Jill Valentine": "female", "Mikaela Reid": "female", "Haddie Kaur": "female",
    "Ada Wong": "female", "Rebecca Chambers": "female", "Thalita Lyra": "female",
    "Ellen Ripley": "female", "Sable Ward": "female", "Lara Croft": "female",
    "Orela Rose": "female", "Vee Boonyasak": "female", "Taurie Cain": "female",
    "Eleven": "female", "Michonne Grimes": "female",
    # Survivors (Male)
    "Dwight Fairfield": "male", "Jake Park": "male", "Ace Visconti": "male",
    "William 'Bill' Overbeck": "male", "David King": "male", "Quentin Smith": "male",
    "David Tapp": "male", "Detective Tapp": "male", "Adam Francis": "male",
    "Jeff Johansen": "male", "Ashley J. Williams": "male", "Steve Harrington": "male",
    "Felix Richter": "male", "Jonah Vasquez": "male", "Yoichi Asakawa": "male",
    "Vittorio Toscano": "male", "Renato Lyra": "male", "Gabriel Soma": "male",
    "Nicolas Cage": "male", "Alan Wake": "male", "Trevor Belmont": "male",
    "Shane Wiigwaas": "male", "Shane": "male", "Dustin Henderson": "male",
    "Rick Grimes": "male", "Kwon Tae-young": "male", "Tae-Young": "male",
    "Leon Scott Kennedy": "male", "Leon S. Kennedy": "male",
    # Killers (Female)
    "The Nurse": "female", "The Hag": "female", "The Huntress": "female",
    "The Pig": "female", "The Spirit": "female", "The Plague": "female",
    "The Onryō": "female", "The Skull Merchant": "female", "The Krasue": "female",
    # Killers (Monster/Other)
    "The Demogorgon": "monster_other", "The Dredge": "monster_other",
    "The Xenomorph": "monster_other", "The Unknown": "monster_other",
    "The Singularity": "monster_other",
}


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
                "gender": self._resolve_gender(s.name, "Survivor"),
                "avatar_url": s.portrait_url or f"/static/{s.avatar_local_path}" if s.avatar_local_path else "",
                "chapter_id": s.chapter_id,
                "chapter_name": chap.localized_name(lang) if chap else "Base Game",
                "release_year": (chap.release_year if chap else None) or 2016,
                "is_licensed": bool(chap.is_licensed) if chap else False,
                "height": "Average",
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
                "gender": self._resolve_gender(k.name, "Killer"),
                "avatar_url": k.portrait_url or f"/static/{k.avatar_local_path}" if k.avatar_local_path else "",
                "chapter_id": k.chapter_id,
                "chapter_name": chap.localized_name(lang) if chap else "Base Game",
                "release_year": (chap.release_year if chap else None) or 2016,
                "is_licensed": bool(chap.is_licensed) if chap else False,
                "height": k.height or "Tall",
                "power_name": k.power_name,
                "power_icon_url": k.power_icon_url or f"/static/{k.power_icon_local_path}" if k.power_icon_local_path else "",
                "movement_speed": k.movement_speed or "4.6 m/s",
                "terror_radius": k.terror_radius or "32 metres",
                "terror_radius_meters": k.terror_radius_meters or 32,
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


    def _resolve_gender(self, name: str, role: str) -> str:
        """Determines gender using canon entities or fallback registry."""
        if name in KNOWN_GENDERS:
            return KNOWN_GENDERS[name]

        entity = db.session.query(Entity).filter_by(name=name).first()
        if entity and entity.gender:
            return entity.gender

        return "male" if role == "Killer" else "female"

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
            return [{
                "round_number": 1,
                "mode": "killer_power",
                "target_type": "killer",
                "target_id": chosen_killer.id if chosen_killer else 1,
                "max_attempts": 5,
            }]

        elif game_mode in ("audio", "terror_radius"):
            chosen_killer = rng.choice(killers) if killers else None
            return [{
                "round_number": 1,
                "mode": "terror_radius",
                "target_type": "killer",
                "target_id": chosen_killer.id if chosen_killer else 1,
                "max_attempts": 5,
            }]

        elif game_mode == "fog_trial":
            # Multi-round interchangeable trial: Realm -> Power -> Audio -> Classic
            realm = rng.choice(realms) if realms else None
            killer = rng.choice(killers) if killers else None
            perk = rng.choice(perks) if perks else None
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
                    "target_id": killer.id if killer else 1,
                    "max_attempts": 5,
                },
                {
                    "round_number": 3,
                    "mode": "terror_radius",
                    "target_type": "killer",
                    "target_id": killer.id if killer else 1,
                    "max_attempts": 5,
                },
                {
                    "round_number": 4,
                    "mode": "classic_character",
                    "target_type": "killer",
                    "target_id": killer.id if killer else 1,
                    "max_attempts": 6,
                }
            ]

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
        target_gender = self._resolve_gender(target.name, target_role)
        guess_gender = self._resolve_gender(guess.name, guess_role)
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
        """Evaluates audio guess (Terror radius / Voice line / Hook scream) and unlocks audio layers."""
        is_match = (target_type == guess_type and target_id == guess_id)
        layers = ["32m", "16m", "8m", "chase"]
        unlocked_layer = layers[min(attempt_number - 1, len(layers) - 1)]

        return {
            "is_correct": is_match,
            "attempt_number": attempt_number,
            "unlocked_audio_layer": unlocked_layer,
        }
