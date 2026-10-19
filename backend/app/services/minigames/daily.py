# backend/app/services/minigames/daily.py
import hashlib
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.core.extensions import db
from app.core.transaction import transaction
from app.models.character import Killer
from app.models.minigame import MinigameDailyChallenge, MinigameRepeatableChallenge
from app.services.minigames.rounds import default_title_for_mode, generate_rounds_for_mode


#: Every mode `generate_rounds_for_mode` can build a round for. A daily or a
#: repeatable for anything else is never generated (an admin can still publish
#: one under any name), so a request cannot mint a row per made-up mode.
GENERATED_MODES = frozenset({
    "classic", "classic_character", "classic_killer",
    "realm", "realm_guesser",
    "pixel", "pixel_avatar",
    "perk", "perk_distortion", "classic_perk", "perk_classic",
    "power", "killer_power",
    "audio", "terror_radius",
    "fog_trial",
    "quote", "quote_lore",
    "addon", "addon_guesser",
    "emoji_riddle",
})

#: Round modes whose clue screen never needs the answer: the player only sees
#: the server's feedback on each guess (and an emoji string). For these the
#: answer stays on the server until the round is over. Every other mode draws
#: its clue FROM the answer (its portrait, icon, realm art or audio), so the
#: browser necessarily knows it.
SERVER_ONLY_ANSWER_MODES = frozenset({
    "classic", "classic_character", "classic_killer", "classic_perk", "perk_classic", "emoji_riddle",
})

#: How long a repeatable session row lives; `purge_expired_repeatables` deletes it after.
REPEATABLE_TTL = timedelta(hours=24)


def public_rounds(rounds: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """The rounds as a player may see them: the answer id removed wherever the
    clue does not depend on it."""
    out = []
    for raw in rounds or []:
        if not isinstance(raw, dict):
            continue
        round_ = dict(raw)
        if round_.get("mode") in SERVER_ONLY_ANSWER_MODES:
            round_.pop("target_id", None)
        out.append(round_)
    return out


def public_challenge(data: dict[str, Any]) -> dict[str, Any]:
    return {**data, "rounds": public_rounds(data.get("rounds"))}


def _active_daily(target_date: date, game_mode: str) -> MinigameDailyChallenge | None:
    return db.session.scalar(
        select(MinigameDailyChallenge).where(
            MinigameDailyChallenge.challenge_date == target_date,
            MinigameDailyChallenge.game_mode == game_mode,
            MinigameDailyChallenge.is_active.is_(True),
        )
    )


def get_or_create_daily(game_mode: str, target_date: date, lang: str | None = None) -> dict[str, Any] | None:
    """The daily for (date, mode): the stored (or admin-published) one, else a
    deterministic one generated and stored now. None for a mode nothing can
    generate and nobody published."""
    existing = _active_daily(target_date, game_mode)
    if existing:
        return existing.to_dict()
    if game_mode not in GENERATED_MODES:
        return None

    # Generate deterministic daily challenge using date seed
    seed_str = f"{target_date.isoformat()}:{game_mode}"
    seed_int = int(hashlib.sha256(seed_str.encode("utf-8")).hexdigest(), 16) % (2**32)
    rng = random.Random(seed_int)

    rounds = generate_rounds_for_mode(game_mode, rng)
    title = default_title_for_mode(game_mode, target_date)

    daily = MinigameDailyChallenge(
        challenge_date=target_date,
        game_mode=game_mode,
        title=title,
        description=f"Official daily {game_mode.replace('_', ' ').title()} for {target_date.isoformat()}.",
        rounds=rounds,
        is_active=True,
    )
    try:
        with transaction():
            db.session.add(daily)
    except IntegrityError:
        # Two first requests for the same day raced on uq_minigame_daily_date_mode:
        # the other one's row is the daily (same seed, same rounds).
        db.session.rollback()
        winner = _active_daily(target_date, game_mode)
        return winner.to_dict() if winner else None

    return daily.to_dict()


def create_repeatable(
    game_mode: str,
    session_id: str,
    custom_rounds: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generates an ephemeral repeatable challenge session cached in PostgreSQL with 24h TTL.

    Raises ValueError for a mode nothing can generate. The row is deleted by
    `purge_expired_repeatables` (the `minigame_sessions` maintenance job) once
    it expires."""
    if not custom_rounds and game_mode not in GENERATED_MODES:
        raise ValueError(f"Unknown game mode: {game_mode!r}")
    rng = random.Random()
    rounds = custom_rounds if custom_rounds else generate_rounds_for_mode(game_mode, rng)

    rep = MinigameRepeatableChallenge(
        session_id=(session_id or "")[:64],
        game_mode=game_mode,
        title=f"Repeatable {game_mode.replace('_', ' ').title()}",
        rounds=rounds,
        expires_at=datetime.now(timezone.utc) + REPEATABLE_TTL,
    )
    with transaction():
        db.session.add(rep)

    return rep.to_dict()


def upsert_daily_challenge(
    game_mode: str,
    title: str,
    description: str,
    rounds: list[dict[str, Any]],
    target_date: date,
) -> MinigameDailyChallenge:
    """Creates or updates an official daily challenge within an atomic transaction."""
    with transaction():
        existing = db.session.scalar(
            select(MinigameDailyChallenge).where(
                MinigameDailyChallenge.challenge_date == target_date,
                MinigameDailyChallenge.game_mode == game_mode,
            )
        )
        if existing:
            existing.title = title
            existing.description = description
            existing.rounds = rounds
            existing.is_active = True
            return existing
        else:
            challenge = MinigameDailyChallenge(
                challenge_date=target_date,
                game_mode=game_mode,
                title=title,
                description=description,
                rounds=rounds,
                is_active=True,
            )
            db.session.add(challenge)
            return challenge


def purge_expired_repeatables() -> int:
    """Deletes repeatable sessions past `expires_at`; returns how many."""
    with transaction():
        result = db.session.execute(
            delete(MinigameRepeatableChallenge).where(
                MinigameRepeatableChallenge.expires_at < datetime.now(timezone.utc)
            )
        )
    return int(result.rowcount or 0)


def update_killer_chase_music(killer_id: int, local_path: str) -> None:
    """Updates the cached chase music path for a killer atomically."""
    with transaction():
        killer = db.session.get(Killer, killer_id)
        if killer:
            killer.chase_music_local_path = local_path
