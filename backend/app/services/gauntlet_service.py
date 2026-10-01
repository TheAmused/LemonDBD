# backend/app/services/gauntlet_service.py
import logging

from sqlalchemy import select

from app.core.extensions import db
from app.models import GauntletMatchLog, GauntletRun
from app.schemas.gauntlet import GauntletLoadout, GauntletMatchLogDict, GauntletRunState, TierInfo
from app.schemas.streak import ChallengeCompletionDict, StreakStats
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.gauntlet import (
    DEFAULT_GAME_MODE,
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
    PICK_CHARACTER_MODES,
    build_loadout,
    build_team_loadout,
    fetch_gauntlet_user_stats,
    get_characters_per_match,
    get_owned_character_ids,
    get_players_per_character,
    get_tier_info,
    is_checkpoint,
    pick_initial_target,
    pick_initial_targets,
    resolve_character_names_by_ids,
    roll_gauntlet_target,
    roll_gauntlet_team,
)
from app.services.ownership_service import OwnershipService
from app.services.perk_service import PerkService
from app.services.streak_run import StreakRunService

logger = logging.getLogger(__name__)


class GauntletService(StreakRunService):
    mode = "gauntlet"
    run_model = GauntletRun
    variant_fields = ("role", "game_mode")

    def __init__(self, perk_service: PerkService | None = None, ownership_service: OwnershipService | None = None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    def get_tier_info(self, streak: int, role: str, game_mode: str = DEFAULT_GAME_MODE) -> TierInfo:
        return get_tier_info(streak, role, game_mode)

    def _freeze_pool(self, r: GauntletRun) -> list[int]:
        ids = get_owned_character_ids(r.user_id, r.role, self.ownership_service)
        r.owned_character_ids = ids
        return ids

    def _freeze_pool_if_needed(self, r: GauntletRun) -> None:
        self._freeze_if_empty(
            r, "owned_character_ids", lambda: get_owned_character_ids(r.user_id, r.role, self.ownership_service)
        )

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

    def get_or_create_run(self, user_id: int, role: str, game_mode: str = DEFAULT_GAME_MODE) -> GauntletRunState:
        return self._get_or_create_run(user_id, role, game_mode)

    def _present(self, run: GauntletRun) -> GauntletRunState:
        return self._state(run, self.get_tier_info(run.current_streak, run.role, run.game_mode))

    def _build_run(self, user_id: int, role: str, game_mode: str) -> GauntletRun:
        tier_info = self.get_tier_info(0, role, game_mode)
        team_size = get_characters_per_match(game_mode)
        if team_size > 1:
            names = pick_initial_targets(user_id, role, self.ownership_service, team_size)
            initial_loadout = build_team_loadout(names, tier_info, get_players_per_character(game_mode))
            target_character = names[0]
        else:
            target_character = pick_initial_target(user_id, role, self.ownership_service)
            initial_loadout = build_loadout(target_character, tier_info)
        live_owned_ids = get_owned_character_ids(user_id, role, self.ownership_service)

        return GauntletRun(
            user_id=user_id,
            role=role,
            game_mode=game_mode,
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

    def roll(
        self, user_id: int, role: str, target_character: str | None = None, game_mode: str = DEFAULT_GAME_MODE
    ) -> GauntletRunState:
        run = self.get_or_create_run(user_id, role, game_mode)
        completed = run.get("completed_characters", [])

        team_size = get_characters_per_match(game_mode)
        if team_size > 1 and target_character is None:
            names, loadout, tier_info = roll_gauntlet_team(
                role=role,
                current_streak=run["current_streak"],
                completed_characters=completed,
                owned_characters=run["owned_characters"],
                game_mode=game_mode,
                count=team_size,
            )
            target_char = names[0]
        else:
            target_char, loadout, tier_info = roll_gauntlet_target(
                role=role,
                current_streak=run["current_streak"],
                completed_characters=completed,
                owned_characters=run["owned_characters"],
                target_character=target_character,
                game_mode=game_mode,
            )

        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.current_character_id = target_char
        r.current_loadout = loadout
        db.session.commit()

        return self._state(r, tier_info)

    def reveal_target(self, user_id: int, run_id: int) -> GauntletRunState:
        r = self._find_run_by_id(user_id, run_id)
        if not r:
            raise ValueError("Run not found")
        self._freeze_pool_if_needed(r)
        r.target_revealed = True
        db.session.commit()
        return self._state(r, self.get_tier_info(r.current_streak, r.role, r.game_mode))

    def prepare_next_match(self, user_id: int, role: str, game_mode: str = DEFAULT_GAME_MODE) -> GauntletRunState:
        """Line up the match after a result: a fresh random target, or, where the
        player picks their own character, an empty seat until they choose."""
        if game_mode not in PICK_CHARACTER_MODES:
            return self.roll(user_id, role, game_mode=game_mode)
        r = self._find_run(user_id, role, game_mode)
        if not r:
            raise ValueError("Run not found")
        r.target_revealed = False
        db.session.commit()
        return self._state(r, self.get_tier_info(r.current_streak, r.role, r.game_mode))

    def select_target(self, user_id: int, run_id: int, character: str) -> GauntletRunState:
        r = self._find_run_by_id(user_id, run_id)
        if not r:
            raise ValueError("Run not found")
        if r.game_mode not in PICK_CHARACTER_MODES:
            raise ValueError("This mode picks the character for you")
        if r.status == "completed":
            raise ValueError("This run is already completed. Reset it to play again.")
        self._freeze_pool_if_needed(r)
        if character not in resolve_character_names_by_ids(r.owned_character_ids, role=r.role):
            raise ValueError("That character is not in your roster")
        if character in r.completed_characters:
            raise ValueError("You already beat that character")

        tier_info = self.get_tier_info(r.current_streak, r.role, r.game_mode)
        r.current_character_id = character
        r.current_loadout = build_loadout(character, tier_info)
        r.target_revealed = True
        db.session.commit()
        return self._state(r, tier_info)

    def reset_run(self, user_id: int, role: str, game_mode: str = DEFAULT_GAME_MODE) -> GauntletRunState:
        return self._reset_run(user_id, role, game_mode)

    def submit_result(self, user_id: int, run_id: int, result: str, triggered_by: str = "player") -> GauntletRunState:
        self._validate_result(result)
        if triggered_by != "inactivity":
            assert_challenge_mode_enabled("gauntlet")

        r = self._load_run_for_result(user_id, run_id)
        self._freeze_pool_if_needed(r)

        current_streak = r.current_streak
        best_streak = r.best_streak
        last_checkpoint = r.last_checkpoint_streak
        completed = r.completed_characters
        checkpoint_chars = r.checkpoint_characters
        char_id = r.current_character_id
        loadout = r.current_loadout
        players = loadout.get("players")
        if players:
            match_names = [player["character"] for player in players]
            match_perks = [perk for player in players for perk in player.get("character_perks", [])]
        else:
            match_names = [char_id]
            match_perks = loadout.get("character_perks", [])

        if result == "win":
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            for name in match_names:
                if name not in completed:
                    completed.append(name)
            if is_checkpoint(streak_after, r.game_mode):
                last_checkpoint = streak_after
                checkpoint_chars = list(completed)

            owned_ids = r.owned_character_ids
            owned_names = resolve_character_names_by_ids(owned_ids, role=r.role)
            if owned_names and all(name in completed for name in owned_names):
                r.status = "completed"
        else:
            streak_after = last_checkpoint
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
                character_id=" + ".join(name[:45] for name in match_names)[:100],
                result=result,
                triggered_by=triggered_by,
                perks=match_perks,
                streak_before=current_streak,
                streak_after=streak_after,
            )
        )

        if result == "win" and r.status == "completed":
            self._complete_run(
                r,
                user_id,
                f"{r.role}_{r.game_mode}",
                owned_ids,
                role="Killer" if r.role == "killer" else "Survivor",
                roster_limit=ORIGINAL_KILLER_ROSTER_LIMIT if r.role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT,
            )
            self._freeze_pool(r)
        elif result == "loss" and streak_after == 0:
            self._freeze_pool(r)

        db.session.commit()

        return self._state(r, self.get_tier_info(streak_after, r.role, r.game_mode))

    def get_stats(
        self, user_id: int, role: str, game_mode: str = DEFAULT_GAME_MODE
    ) -> StreakStats[GauntletMatchLogDict]:
        return fetch_gauntlet_user_stats(user_id, role, game_mode)

    def get_completions(
        self, user_id: int, role: str, game_mode: str = DEFAULT_GAME_MODE
    ) -> list[ChallengeCompletionDict]:
        return self._completions(user_id, f"{role}_{game_mode}")
