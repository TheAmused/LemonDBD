# backend/app/services/gauntlet_service.py
import logging

from sqlalchemy import select

from app.core.extensions import db
from app.models import GauntletMatchLog, GauntletRun
from app.schemas.gauntlet import GauntletLoadout, GauntletMatchLogDict, GauntletRunState, TierInfo
from app.schemas.streak import ChallengeCompletionDict, StreakStats
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.challenge_completions import fetch_challenge_completions, record_challenge_completion
from app.services.gauntlet import (
    CHECKPOINT_INTERVAL,
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
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
from app.services.roster_milestone import get_full_roster_milestone

logger = logging.getLogger(__name__)


class GauntletService:
    def __init__(self, perk_service: PerkService | None = None, ownership_service: OwnershipService | None = None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    def get_tier_info(self, streak: int, role: str) -> TierInfo:
        return get_tier_info(streak, role)

    def _freeze_pool(self, r: GauntletRun) -> list[int]:
        ids = get_owned_character_ids(r.user_id, r.role, self.ownership_service)
        r.owned_character_ids = ids
        return ids

    def _is_unfrozen(self, current_streak: int, owned_character_ids: list[int]) -> bool:
        return not owned_character_ids

    def _state(self, r: GauntletRun, tier_info: TierInfo) -> GauntletRunState:
        data = r.to_dict()
        ids = data["owned_character_ids"]
        pool_frozen = bool(ids)
        if not ids:
            ids = get_owned_character_ids(r.user_id, r.role, self.ownership_service)
        return {
            **data,
            "pool_frozen": pool_frozen,
            "owned_characters": resolve_character_names_by_ids(ids, role=r.role),
            "tier_info": tier_info,
        }

    def get_or_create_run(self, user_id: int, role: str) -> GauntletRunState:
        run = db.session.scalars(
            select(GauntletRun).where(
                GauntletRun.user_id == user_id,
                GauntletRun.role == role,
            )
        ).first()

        if run:
            return self._state(run, self.get_tier_info(run.current_streak, role))

        assert_challenge_mode_enabled("gauntlet")

        target_character = pick_initial_target(user_id, role, self.ownership_service)
        tier_info = self.get_tier_info(0, role)
        initial_loadout: GauntletLoadout = {
            "character": target_character,
            "character_perks": get_character_teachable_perks(target_character),
            "tier_info": tier_info,
        }
        live_owned_ids = get_owned_character_ids(user_id, role, self.ownership_service)

        new_run = GauntletRun(
            user_id=user_id,
            role=role,
            status="in_progress",
            current_character_id=target_character,
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_characters=[],
            checkpoint_characters=[],
            owned_character_ids=live_owned_ids,
            current_loadout=initial_loadout,
        )
        db.session.add(new_run)
        db.session.commit()

        return self._state(new_run, tier_info)

    def roll(self, user_id: int, role: str, target_character: str | None = None) -> GauntletRunState:
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
        r.current_loadout = loadout
        db.session.commit()

        return self._state(r, tier_info)

    def reveal_target(self, user_id: int, run_id: int) -> GauntletRunState:
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.id == run_id, GauntletRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        if self._is_unfrozen(r.current_streak, r.owned_character_ids):
            self._freeze_pool(r)
        r.target_revealed = True
        db.session.commit()
        return self._state(r, self.get_tier_info(r.current_streak, r.role))

    def reset_run(self, user_id: int, role: str) -> GauntletRunState:
        assert_challenge_mode_enabled("gauntlet")
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
        ).first()
        if not r:
            raise ValueError("Run not found")

        db.session.delete(r)
        db.session.commit()
        return self.get_or_create_run(user_id, role)

    def submit_result(self, user_id: int, run_id: int, result: str, triggered_by: str = "player") -> GauntletRunState:
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if triggered_by != "inactivity":
            assert_challenge_mode_enabled("gauntlet")

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

        if self._is_unfrozen(r.current_streak, r.owned_character_ids):
            self._freeze_pool(r)

        current_streak = r.current_streak
        best_streak = r.best_streak
        last_checkpoint = r.last_checkpoint_streak
        completed = r.completed_characters
        checkpoint_chars = r.checkpoint_characters
        char_id = r.current_character_id
        loadout = r.current_loadout
        match_perks = loadout.get("character_perks", [])

        if result == "win":
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            if char_id not in completed:
                completed.append(char_id)
            if CHECKPOINT_INTERVAL > 0 and streak_after % CHECKPOINT_INTERVAL == 0:
                last_checkpoint = streak_after
                checkpoint_chars = list(completed)

            owned_ids = r.owned_character_ids
            owned_names = resolve_character_names_by_ids(owned_ids, role=r.role)
            if owned_names and all(name in completed for name in owned_names):
                r.status = "completed"
        else:
            streak_after = last_checkpoint if CHECKPOINT_INTERVAL > 0 else 0
            completed = list(checkpoint_chars)
            best_after = best_streak
            r.attempts += 1

        r.current_streak = streak_after
        r.best_streak = best_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_characters = completed
        r.checkpoint_characters = checkpoint_chars

        db.session.add(
            GauntletMatchLog(
                run_id=run_id,
                role=r.role,
                character_id=char_id,
                result=result,
                triggered_by=triggered_by,
                perks=match_perks,
                streak_before=current_streak,
                streak_after=streak_after,
            )
        )

        if result == "win" and r.status == "completed":
            # owned_ids was captured before this refreeze -- doing it after
            # would silently pull in a newly-owned character, inflating the count.
            is_full, _ = get_full_roster_milestone(
                owned_ids,
                role="Killer" if r.role == "killer" else "Survivor",
                roster_limit=ORIGINAL_KILLER_ROSTER_LIMIT if r.role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT,
            )
            record_challenge_completion(
                user_id=user_id,
                mode="gauntlet",
                variant=f"{r.role}_{r.game_mode}",
                attempts_taken=r.attempts + 1,
                matches_played=len(r.match_logs),
                unlocked_characters_count=len(owned_ids),
                full_roster=is_full,
            )
            self._freeze_pool(r)
            r.attempts = 0
        elif result == "loss" and streak_after == 0:
            self._freeze_pool(r)

        db.session.commit()

        return self._state(r, self.get_tier_info(streak_after, r.role))

    def get_stats(self, user_id: int, role: str) -> StreakStats[GauntletMatchLogDict]:
        return fetch_gauntlet_user_stats(user_id, role)

    def get_completions(self, user_id: int, role: str) -> list[ChallengeCompletionDict]:
        # game_mode isn't yet a user-facing choice at this layer (every run is
        # created with the model's "original" default), so completions are
        # only ever recorded/queried under that variant today. The stored
        # variant string still carries game_mode from the run itself (see
        # submit_result) so this stays correct if that ever changes.
        return fetch_challenge_completions(user_id, "gauntlet", f"{role}_original")
