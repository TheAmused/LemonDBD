# backend/app/services/gauntlet_service.py
import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.core.extensions import db
from app.models import GauntletMatchLog, GauntletRun
from app.services.gauntlet import (
    CHECKPOINT_INTERVAL,
    fetch_gauntlet_user_stats,
    get_character_teachable_perks,
    get_owned_character_ids,
    get_tier_info,
    pick_initial_target,
    resolve_character_names_by_ids,
    roll_gauntlet_target,
)
from app.services.ownership_service import OwnershipService
from app.services.perk_service import PerkService

logger = logging.getLogger(__name__)


class GauntletService:
    def __init__(self, perk_service: Optional[PerkService] = None, ownership_service: Optional[OwnershipService] = None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    def get_tier_info(self, streak: int, role: str) -> Dict[str, Any]:
        return get_tier_info(streak, role)

    def _freeze_pool(self, r: GauntletRun) -> list:
        ids = get_owned_character_ids(r.user_id, r.role, self.ownership_service)
        r.owned_characters_json = json.dumps(ids)
        return ids

    def _with_owned_characters(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["owned_characters"] = resolve_character_names_by_ids(data["owned_character_ids"])
        return data

    def get_or_create_run(self, user_id: int, role: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(GauntletRun).where(
                GauntletRun.user_id == user_id,
                GauntletRun.role == role,
            )
        ).first()

        if run:
            if not json.loads(run.owned_characters_json or "[]"):
                self._freeze_pool(run)
                db.session.commit()
            data = self._with_owned_characters(run.to_dict())
            data["tier_info"] = self.get_tier_info(data["current_streak"], role)
            return data

        target_character = pick_initial_target(user_id, role, self.ownership_service)
        tier_info = self.get_tier_info(0, role)
        initial_loadout = {
            "character": target_character,
            "character_perks": get_character_teachable_perks(target_character),
            "tier_info": tier_info,
        }

        new_run = GauntletRun(
            user_id=user_id,
            role=role,
            status="in_progress",
            current_character_id=target_character,
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_characters_json="[]",
            checkpoint_characters_json="[]",
            current_loadout_json=json.dumps(initial_loadout),
        )
        self._freeze_pool(new_run)
        db.session.add(new_run)
        db.session.commit()

        data = self._with_owned_characters(new_run.to_dict())
        data["tier_info"] = tier_info
        return data

    def roll(self, user_id: int, role: str, target_character: Optional[str] = None) -> Dict[str, Any]:
        run = self.get_or_create_run(user_id, role)
        completed = run.get("completed_characters", [])

        target_char, loadout, tier_info = roll_gauntlet_target(
            role=role,
            current_streak=run["current_streak"],
            completed_characters=completed,
            owned_characters=run["owned_characters"],
            target_character=target_character,
        )

        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.current_character_id = target_char
        r.current_loadout_json = json.dumps(loadout)
        db.session.commit()

        data = self._with_owned_characters(r.to_dict())
        data["tier_info"] = tier_info
        return data

    def reveal_target(self, user_id: int, run_id: int) -> Dict[str, Any]:
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.id == run_id, GauntletRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        r.target_revealed = True
        db.session.commit()
        data = self._with_owned_characters(r.to_dict())
        data["tier_info"] = self.get_tier_info(data["current_streak"], r.role)
        return data

    def reset_run(self, user_id: int, role: str) -> Dict[str, Any]:
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
        ).first()
        if not r:
            raise ValueError("Run not found")

        db.session.delete(r)
        db.session.commit()
        return self.get_or_create_run(user_id, role)

    def submit_result(self, user_id: int, run_id: int, result: str, triggered_by: str = "player") -> Dict[str, Any]:
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")

        r = db.session.scalars(
            select(GauntletRun).where(
                GauntletRun.id == run_id,
                GauntletRun.user_id == user_id,
            )
        ).first()
        if not r:
            raise ValueError("Run not found")
        if r.status == "completed":
            raise ValueError("This run is already completed. Reset it to play again.")

        current_streak = r.current_streak
        best_streak = r.best_streak
        last_checkpoint = r.last_checkpoint_streak
        completed = json.loads(r.completed_characters_json or "[]")
        checkpoint_chars = json.loads(r.checkpoint_characters_json or "[]")
        char_id = r.current_character_id
        loadout = json.loads(r.current_loadout_json or "{}")
        perks_json = json.dumps(loadout.get("character_perks", []))

        if result == "win":
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            if char_id not in completed:
                completed.append(char_id)
            if CHECKPOINT_INTERVAL > 0 and streak_after % CHECKPOINT_INTERVAL == 0:
                last_checkpoint = streak_after
                checkpoint_chars = list(completed)
            # The gauntlet is won once every character frozen into this
            # run's pool has been cleared. completed_characters_json stays
            # name-keyed (existing convention), so resolve the frozen id
            # pool to current names before comparing.
            owned_ids = json.loads(r.owned_characters_json or "[]")
            owned_names = resolve_character_names_by_ids(owned_ids)
            if owned_names and all(name in completed for name in owned_names):
                r.status = "completed"
        else:
            streak_after = last_checkpoint if CHECKPOINT_INTERVAL > 0 else 0
            completed = list(checkpoint_chars)
            best_after = best_streak

        r.current_streak = streak_after
        r.best_streak = best_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_characters_json = json.dumps(completed)
        r.checkpoint_characters_json = json.dumps(checkpoint_chars)

        if result == "win" and r.status == "completed":
            self._freeze_pool(r)
        elif result == "loss" and streak_after == 0:
            self._freeze_pool(r)

        db.session.add(
            GauntletMatchLog(
                run_id=run_id,
                role=r.role,
                character_id=char_id,
                result=result,
                triggered_by=triggered_by,
                perks_json=perks_json,
                streak_before=current_streak,
                streak_after=streak_after,
            )
        )
        db.session.commit()

        data = self._with_owned_characters(r.to_dict())
        data["tier_info"] = self.get_tier_info(streak_after, r.role)
        return data

    def get_stats(self, user_id: int, role: str) -> Dict[str, Any]:
        return fetch_gauntlet_user_stats(user_id, role)
