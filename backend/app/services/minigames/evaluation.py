# backend/app/services/minigames/evaluation.py
"""Scores a guess against a round and reveals the clues its attempt number unlocks."""
from typing import Any

from app.core.extensions import db
from app.models.character import Killer, Survivor
from app.models.map import Realm
from app.models.perk import Perk


def _evaluate_quote_lore(target_type: str, target_id: int, guess_type: str, guess_id: int, attempt_number: int) -> dict[str, Any]:
    """Evaluates a quote/lore guess, unlocking role, chapter and first-letter clues."""
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


def _evaluate_identity_guess(target_type: str, target_id: int, guess_type: str, guess_id: int, attempt_number: int) -> dict[str, Any]:
    """Evaluates modes whose only feedback is whether the guess is the target."""
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


def _evaluate_classic_perk(target_id: int, guess_id: int, attempt_number: int) -> dict[str, Any]:
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


def _evaluate_classic_character(target_type: str, target_id: int, guess_type: str, guess_id: int, attempt_number: int) -> dict[str, Any]:
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
    target_default_height = "Average" if target_type == "survivor" else "Tall"
    guess_default_height = "Average" if guess_type == "survivor" else "Tall"
    target_height = getattr(target, "height", target_default_height) or target_default_height
    guess_height = getattr(guess, "height", guess_default_height) or guess_default_height
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
            "gender": (guess.gender or "unknown").capitalize(),
            "chapter_name": guess_chap_name,
            "release_year": guess_year,
            "is_licensed": guess_licensed,
            "height": guess_height,
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


def _evaluate_realm(target_id: int, guess_id: int, attempt_number: int) -> dict[str, Any]:
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


def _evaluate_audio(target_type: str, target_id: int, guess_type: str, guess_id: int, attempt_number: int) -> dict[str, Any]:
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


def evaluate_guess(round_data: dict[str, Any], guess_type: str, guess_id: int, attempt_number: int = 1) -> dict[str, Any]:
    """Evaluates a guess against round_data, returning mode-specific feedback."""
    mode = round_data.get("mode", "classic_character")
    target_type = round_data.get("target_type", "killer")
    target_id = round_data.get("target_id")

    if mode in ("classic_character", "classic", "classic_killer"):
        return _evaluate_classic_character(target_type, target_id, guess_type, guess_id, attempt_number)
    elif mode in ("classic_perk", "perk_classic"):
        return _evaluate_classic_perk(target_id, guess_id, attempt_number)
    elif mode in ("realm_guesser", "realm"):
        return _evaluate_realm(target_id, guess_id, attempt_number)
    elif mode in ("terror_radius", "voice_line", "hook_scream", "audio"):
        return _evaluate_audio(target_type, target_id, guess_type, guess_id, attempt_number)
    elif mode in ("quote_lore", "quote"):
        return _evaluate_quote_lore(target_type, target_id, guess_type, guess_id, attempt_number)
    elif mode in ("killer_power", "perk_distortion", "pixel_avatar", "addon_guesser", "emoji_riddle"):
        return _evaluate_identity_guess(target_type, target_id, guess_type, guess_id, attempt_number)
    else:
        is_match = (target_type == guess_type and target_id == guess_id)
        return {
            "is_correct": is_match,
            "attempt_number": attempt_number,
            "details": {"match": is_match}
        }
