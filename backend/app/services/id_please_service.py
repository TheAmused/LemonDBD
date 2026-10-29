# backend/app/services/id_please_service.py
"""ID, Please: an endless, deterministic chain of matches in three difficulties and three lanes, each with a one-time badge.

The mixed lane swaps the side every match; the survivor and killer lanes stay on one. Every lane earns its badge at a
streak (50, 30 or 25), except single-side Milestones, which asks for a win with every character of the side. Hardcore
and Hardcore+ never repeat a character within a round; Hardcore+ also shuffles the order of the player's perks at every
opening, so the same four perks never lead to the same chain twice."""
import secrets
from dataclasses import replace
from datetime import datetime
from typing import Any

from app.core.extensions import db
from app.models import IdPleaseMatchLog, IdPleaseRun
from app.schemas.streak import ChallengeCompletionDict, StreakStats
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.challenge_completions import fetch_challenge_completions, record_challenge_completion
from app.services.id_please import BADGE_STREAK, DIFFICULTIES, LANES, MODE_BY_LANE, ALGO_VERSION, checkpoint_interval
from app.services.id_please.constants import HARDCORE_PLUS, MIXED, badge_by_roster, is_solo, keeps_memory_always, lane_sides
from app.services.id_please.eligibility import Eligibility, evaluate, evaluate_difficulty
from app.services.id_please.engine import Loadout, empty_used, following, opening, start_used, unplayed, validate_opening
from app.services.id_please.roster import Roster, always_on_perk_counts, load_roster, to_ids
from app.services.id_please.stats import fetch_id_please_user_stats
from app.services.id_please.views import match_view, roster_listing
from app.services.match_log_retention import add_match_log
from app.services.roster_milestone import get_full_roster_milestone
from app.services.streak_run import StreakRunService


class IdPleaseConflict(ValueError):
    """A request that is right but cannot be applied to the run as it stands now (HTTP 409)."""

    def __init__(self, message: str, code: str, **details: Any):
        super().__init__(message)
        self.code = code
        self.details = details


class IdPleaseService(StreakRunService):
    run_model = IdPleaseRun
    variant_fields = ("lane", "difficulty")

    def __init__(self, lane: str = MIXED):
        """A service speaks for one lane: its runs, its completions and its kill switch. Work on a run that is
        already loaded (the inactivity sweep) follows the run's own lane."""
        if lane not in LANES:
            raise ValueError(f"Unknown lane '{lane}'")
        self.lane = lane
        self.mode = MODE_BY_LANE[lane]

    # -- presentation ----------------------------------------------------------

    def _eligibility(self, lane: str, difficulty: str, roster: Roster) -> Eligibility:
        return evaluate_difficulty(lane, difficulty, roster, always_on_perk_counts())

    @staticmethod
    def _badge_earned(user_id: int, lane: str, difficulty: str) -> bool:
        return bool(fetch_challenge_completions(user_id, MODE_BY_LANE[lane], difficulty, limit=1))

    @staticmethod
    def _memory(lane: str, difficulty: str, earned: bool) -> bool:
        """Whether a character already played may not come up again. Hardcore and Hardcore+ always say so; single-side
        Milestones says so until its badge is earned, after which characters may repeat again."""
        return keeps_memory_always(lane, difficulty) or (is_solo(lane) and not earned)

    @staticmethod
    def _badge_progress(run: IdPleaseRun, roster: Roster) -> dict[str, int]:
        """The way to the badge as the progress bar counts it: a streak, or in single-side Milestones the characters won
        with out of the characters owned (the owned count is live, so a new unlock lengthens it)."""
        if not badge_by_roster(run.lane, run.difficulty):
            return {"current": min(run.current_streak, BADGE_STREAK[run.difficulty]), "target": BADGE_STREAK[run.difficulty]}
        owned = set(roster.characters(run.lane))
        played = set(run.used_character_ids.get(run.lane, [])) & owned
        in_play = run.current_match > 0
        won = len(played - {run.current_loadout.get("character_id")}) if in_play else 0
        return {"current": won, "target": len(owned)}

    def _present(self, run: IdPleaseRun) -> dict[str, Any]:
        roster = load_roster(run.user_id, run.perk_seed)
        earned = self._badge_earned(run.user_id, run.lane, run.difficulty)
        return {
            **run.to_dict(),
            "match": match_view(run.current_loadout, roster),
            "checkpoint": match_view(run.checkpoint_loadout, roster),
            "checkpoint_interval": checkpoint_interval(run.difficulty),
            "badge_streak": None if badge_by_roster(run.lane, run.difficulty) else BADGE_STREAK[run.difficulty],
            "badge_earned": earned,
            "badge_progress": None if earned else self._badge_progress(run, roster),
            "eligibility": self._eligibility(run.lane, run.difficulty, roster),
            "roster_fingerprint": roster.fingerprint,
        }

    def _build_run(self, user_id: int, lane: str, difficulty: str) -> IdPleaseRun:
        if difficulty not in DIFFICULTIES:
            raise ValueError(f"Unknown difficulty '{difficulty}'")
        return IdPleaseRun(
            user_id=user_id,
            lane=lane,
            difficulty=difficulty,
            status="in_progress",
            algo_version=ALGO_VERSION,
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            opening_side="",
            opening_perk_ids=[],
            perk_seed=0,
            current_match=0,
            current_loadout={},
            before_loadout={},
            used_character_ids={},
            checkpoint_loadout={},
        )

    def _back_to_setup(self, run: IdPleaseRun) -> None:
        run.current_streak = 0
        run.last_checkpoint_streak = 0
        run.opening_side = ""
        run.opening_perk_ids = []
        run.perk_seed = 0
        run.current_match = 0
        run.current_loadout = {}
        run.before_loadout = {}
        run.used_character_ids = {}
        run.checkpoint_loadout = {}

    # -- public run API --------------------------------------------------------

    def get_or_create_run(self, user_id: int, difficulty: str) -> dict[str, Any]:
        return self._get_or_create_run(user_id, self.lane, difficulty)

    def abandon_run(self, user_id: int, difficulty: str) -> dict[str, Any]:
        return self._abandon_run(user_id, self.lane, difficulty)

    def get_eligibility(self, user_id: int) -> dict[str, Any]:
        roster = load_roster(user_id)
        return {"difficulties": evaluate(self.lane, roster, always_on_perk_counts()), "roster_fingerprint": roster.fingerprint}

    def _check_side(self, side: str) -> None:
        if side not in lane_sides(self.lane):
            if is_solo(self.lane):
                raise ValueError(f"This challenge is played on the {self.lane} side only")
            raise ValueError("Side must be 'killer' or 'survivor'")

    def get_roster(self, user_id: int, side: str) -> dict[str, Any]:
        self._check_side(side)
        roster = load_roster(user_id)
        return {**roster_listing(side, roster), "roster_fingerprint": roster.fingerprint}

    def preview(self, user_id: int, side: str, perk_positions: object, difficulty: str = "milestones") -> dict[str, Any]:
        """Match 1 for four chosen perks, without touching any run. The mixed lane also previews match 2 (the mirror on
        the other side); a single-side lane does not: its second match is not shown before it is played."""
        self._check_side(side)
        if difficulty not in DIFFICULTIES:
            raise ValueError(f"Unknown difficulty '{difficulty}'")
        if difficulty == HARDCORE_PLUS:
            raise ValueError("Hardcore+ shuffles your perks when the run starts, so there is nothing to preview")
        roster = load_roster(user_id)
        if not roster.characters(side) or not roster.perks(side):
            raise ValueError("No characters or perks to choose from on this side")
        if any(not roster.characters(other) for other in lane_sides(self.lane)):
            raise ValueError("No characters to play on the other side")
        positions = validate_opening(perk_positions, len(roster.perks(side)))
        first = opening(side, positions, roster)
        memory = self._memory(self.lane, difficulty, self._badge_earned(user_id, self.lane, difficulty))
        used = start_used(side, first["character_id"]) if memory else empty_used()
        view: dict[str, Any] = {"first": match_view(first, roster), "second": None, "roster_fingerprint": roster.fingerprint}
        if len(lane_sides(self.lane)) > 1:
            second, _ = following(self.lane, difficulty, first, None, used, roster, memory=memory)
            view["second"] = match_view(second, roster)
        return view

    # -- guards ---------------------------------------------------------------

    def _load_run(self, user_id: int, run_id: int) -> IdPleaseRun:
        run = self._load_run_for_result(user_id, run_id)
        if run.lane != self.lane:
            raise ValueError("Run not found")
        return run

    def _require_roster(self, run: IdPleaseRun, roster: Roster, fingerprint: str | None) -> None:
        eligibility = self._eligibility(run.lane, run.difficulty, roster)
        if not eligibility["met"]:
            raise IdPleaseConflict(
                "Your characters or perks no longer meet this difficulty's requirements.",
                "roster_below_minimum",
                eligibility=eligibility,
            )
        if fingerprint is not None and fingerprint != roster.fingerprint:
            raise IdPleaseConflict(
                "Your characters or perks changed. Check the IDs again.", "roster_changed",
                roster_fingerprint=roster.fingerprint,
            )

    # -- play -----------------------------------------------------------------

    def submit_opening(
        self, user_id: int, run_id: int, side: str, perk_positions: object, fingerprint: str | None = None
    ) -> dict[str, Any]:
        assert_challenge_mode_enabled(self.mode)
        run = self._load_run(user_id, run_id)
        if run.current_match != 0:
            raise IdPleaseConflict("This run has already started.", "already_started")
        self._check_side(side)
        roster = load_roster(user_id)
        self._require_roster(run, roster, fingerprint)
        positions = validate_opening(perk_positions, len(roster.perks(side)))

        run.perk_seed = 0
        if run.difficulty == HARDCORE_PLUS:
            # The player picked four perks; their places in the chain come from a shuffle drawn now and kept for the attempt.
            chosen = to_ids(positions, roster.perks(side))
            run.perk_seed = secrets.randbelow(2**31 - 1) + 1
            roster = replace(roster, perk_seed=run.perk_seed)
            positions = sorted(roster.perk_positions(side, chosen))
        first = opening(side, positions, roster)
        run.opening_side = side
        run.opening_perk_ids = list(first["perk_ids"])
        run.current_match = 1
        run.current_loadout = first
        run.before_loadout = {}
        memory = self._memory(run.lane, run.difficulty, self._badge_earned(user_id, run.lane, run.difficulty))
        run.used_character_ids = start_used(side, first["character_id"]) if memory else empty_used()
        run.checkpoint_loadout = {}
        db.session.commit()
        return self._present(run)

    def _award_badge(self, run: IdPleaseRun, roster: Roster) -> None:
        if self._badge_earned(run.user_id, run.lane, run.difficulty):
            return
        sides = lane_sides(run.lane)
        full = all(get_full_roster_milestone(list(roster.characters(side)), side.capitalize())[0] for side in sides)
        record_challenge_completion(
            user_id=run.user_id,
            mode=MODE_BY_LANE[run.lane],
            variant=run.difficulty,
            attempts_taken=run.attempts + 1,
            matches_played=run.playthrough_matches,
            unlocked_characters_count=sum(len(roster.characters(side)) for side in sides),
            full_roster=bool(full),
        )

    def _log(self, run: IdPleaseRun, roster: Roster, result: str, streak_after: int, triggered_by: str = "player") -> None:
        loadout = run.current_loadout
        add_match_log(run, IdPleaseMatchLog(
            run_id=run.id,
            attempt=run.attempt,
            match_number=run.current_match,
            side=loadout.get("side", ""),
            character_id=loadout.get("character_id", 0),
            perk_ids=list(loadout.get("perk_ids", [])),
            roster_fingerprint=roster.fingerprint,
            result=result,
            streak_before=run.current_streak,
            streak_after=streak_after,
            triggered_by=triggered_by,
        ))

    def _lose(self, run: IdPleaseRun, roster: Roster, triggered_by: str = "player") -> None:
        interval = checkpoint_interval(run.difficulty)
        checkpoint: Loadout | dict = run.checkpoint_loadout
        if interval > 0 and run.last_checkpoint_streak > 0 and checkpoint:
            streak_after = run.last_checkpoint_streak
            self._log(run, roster, "loss", streak_after, triggered_by)
            memory = self._memory(run.lane, run.difficulty, self._badge_earned(run.user_id, run.lane, run.difficulty))
            run.start_new_attempt()
            run.current_streak = streak_after
            run.current_loadout = {k: v for k, v in checkpoint.items() if k != "used"}
            run.current_match = checkpoint["number"]
            run.before_loadout = {}
            run.used_character_ids = checkpoint.get("used") or empty_used() if memory else empty_used()
            return
        self._log(run, roster, "loss", 0, triggered_by)
        run.start_new_attempt()
        self._back_to_setup(run)

    def _win(self, run: IdPleaseRun, roster: Roster) -> None:
        streak_after = run.current_streak + 1
        self._log(run, roster, "win", streak_after)
        current = run.current_loadout
        used = run.used_character_ids or empty_used()
        earned = self._badge_earned(run.user_id, run.lane, run.difficulty)
        badge_now = False
        if not earned:
            if badge_by_roster(run.lane, run.difficulty):
                # `used` holds every character won with plus the one just won: none left means all were won with.
                badge_now = unplayed(run.lane, used, roster) == 0
            else:
                badge_now = streak_after == BADGE_STREAK[run.difficulty]
        memory = self._memory(run.lane, run.difficulty, earned or badge_now)
        nxt, new_used = following(
            run.lane, run.difficulty, current, run.before_loadout or None, used, roster, memory=memory
        )
        run.current_streak = streak_after
        run.best_streak = max(run.best_streak, streak_after)
        run.before_loadout = dict(current)
        run.current_loadout = nxt
        run.current_match = nxt["number"]
        run.used_character_ids = new_used
        interval = checkpoint_interval(run.difficulty)
        if interval > 0 and streak_after % interval == 0:
            run.last_checkpoint_streak = streak_after
            run.checkpoint_loadout = {**nxt, "used": new_used}
        if badge_now:
            self._award_badge(run, roster)

    def submit_result(
        self, user_id: int, run_id: int, match_number: int, result: str, fingerprint: str | None = None
    ) -> dict[str, Any]:
        assert_challenge_mode_enabled(self.mode)
        self._validate_result(result)
        run = self._load_run(user_id, run_id)
        if run.current_match == 0:
            raise IdPleaseConflict("Choose your opening first.", "not_started")
        if match_number != run.current_match:
            raise IdPleaseConflict("This match was already reported.", "stale_match", run=self._present(run))
        roster = load_roster(user_id, run.perk_seed)
        self._require_roster(run, roster, fingerprint)

        if result == "win":
            self._win(run, roster)
        else:
            self._lose(run, roster)
        db.session.commit()
        return self._present(run)

    def apply_inactivity_loss(self, run_id: int, idle_before: datetime | None = None) -> bool:
        """Counts a loss for a run nobody has played since `idle_before`. A run still in setup has nothing to lose."""
        run = self._load_run_for_inactivity(run_id, idle_before)
        if not run:
            return False
        if run.current_match == 0:
            from app.core.transaction import end_transaction

            end_transaction()
            return False
        self._lose(run, load_roster(run.user_id, run.perk_seed), triggered_by="inactivity")
        db.session.commit()
        return True

    def get_stats(self, user_id: int, difficulty: str) -> StreakStats[dict[str, Any]]:
        return fetch_id_please_user_stats(user_id, self.lane, difficulty)

    def get_completions(self, user_id: int, difficulty: str) -> list[ChallengeCompletionDict]:
        return self._completions(user_id, difficulty)
