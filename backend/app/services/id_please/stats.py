# backend/app/services/id_please/stats.py
from typing import Any

from sqlalchemy import select

from app.core.extensions import db
from app.models import IdPleaseMatchLog, IdPleaseRun, Killer, Survivor
from app.schemas.streak import StreakStats
from app.services.streak_stats import fetch_streak_stats


def _character_names() -> dict[tuple[str, int], str]:
    names: dict[tuple[str, int], str] = {}
    for side, model in (("killer", Killer), ("survivor", Survivor)):
        names.update({(side, cid): name for cid, name in db.session.execute(select(model.id, model.name))})
    return names


def fetch_id_please_user_stats(user_id: int, lane: str, difficulty: str) -> StreakStats[dict[str, Any]]:
    """Stats with every recent match carrying the character's current name (a log stores only the id)."""
    run_ids = db.session.scalars(
        select(IdPleaseRun.id).where(
            IdPleaseRun.user_id == user_id, IdPleaseRun.lane == lane, IdPleaseRun.difficulty == difficulty
        )
    ).all()
    names = _character_names() if run_ids else {}

    def serialize(log: IdPleaseMatchLog) -> dict[str, Any]:
        return {**log.to_dict(), "character_name": names.get((log.side, log.character_id), "")}

    return fetch_streak_stats(run_ids, IdPleaseRun, IdPleaseMatchLog, serialize)
