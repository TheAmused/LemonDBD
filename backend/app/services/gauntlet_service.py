import json
import random
import re
import logging
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models import GauntletRun, GauntletMatchLog, Item, Addon, Perk, Character
from app.services.perk_service import PerkService
from app.services.ownership_service import OwnershipService

logger = logging.getLogger(__name__)

CHECKPOINT_INTERVAL = 10
BUILD_SIZE = 4

# Survivors run a full four-perk build where only the first slot has to be one of
# the character's own teachables; the rest are free picks.
SURVIVOR_TIERS = [
    {"tier_level": 0, "name": "The Warm Up", "perk_limit": 4, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"tier_level": 1, "name": "The Thinning", "perk_limit": 3, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"tier_level": 2, "name": "The Struggle", "perk_limit": 2, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"tier_level": 3, "name": "The Hardcore", "perk_limit": 1, "character_perks_only": False, "description": "Must be a character teachable perk"},
    {"tier_level": 4, "name": "The Legend", "perk_limit": 0, "character_perks_only": False, "description": "No perks allowed (no-perk trial)"},
]

# Killers play their own three teachables and nothing else, losing one of them at
# every checkpoint until they run the trial perkless.
KILLER_TIERS = [
    {"tier_level": 0, "name": "The Warm Up", "perk_limit": 3, "character_perks_only": True, "description": "All 3 of the killer's own perks"},
    {"tier_level": 1, "name": "The Restriction", "perk_limit": 2, "character_perks_only": True, "description": "2 of the killer's own perks"},
    {"tier_level": 2, "name": "The Barebones", "perk_limit": 1, "character_perks_only": True, "description": "1 of the killer's own perks"},
    {"tier_level": 3, "name": "The Entity's Chosen", "perk_limit": 0, "character_perks_only": True, "description": "No perks allowed (no-perk trial)"},
]

GENERAL_CHARACTER = "General"

# The live wiki.gg scraper only populates `Item.category` with the coarse role
# ("Survivor"/"Killer"), not an item type, so a survivor item's addon pool can't be
# looked up by equality on `category`. Instead we classify the item's type from its
# name via keyword matching against the known Survivor `Addon.associated_target`
# values (the full set of 6, confirmed during the original data audit).
SURVIVOR_ITEM_TYPE_PATTERNS = [
    ("Toolboxes", r"toolbox|\btools\b"),
    ("Med-Kits", r"med-kit|aid kit"),
    ("Flashlights", r"flashlight"),
    ("Fog Vials", r"fog vial"),
    ("Maps", r"\bmap\b"),
    ("Keys", r"\bkey\b"),
]


class GauntletService:
    def __init__(self, perk_service=None, ownership_service=None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    # ---- tiers -----------------------------------------------------------

    def get_tier_info(self, streak, role):
        tiers = KILLER_TIERS if role == "killer" else SURVIVOR_TIERS
        tier_index = min(len(tiers) - 1, max(0, streak // CHECKPOINT_INTERVAL))
        return dict(tiers[tier_index])

    # ---- ownership-backed pools -------------------------------------------

    def _owned_character_names(self, user_id, role):
        db_role = "Killer" if role == "killer" else "Survivor"
        owned = self.ownership_service.get_user_characters(user_id, role=db_role)
        return [c["name"] for c in owned if c["is_owned"]]

    @staticmethod
    def _character_teachable_perks(character_name):
        """The target's own teachable perks, shown as the suggested first-slot picks."""
        perks = db.session.scalars(
            select(Perk)
            .join(Character, Perk.character_id == Character.id)
            .where(Character.name == character_name, Perk.is_teachable.is_(True))
            .order_by(Perk.name.asc())
        ).all()
        return [p.to_dict() for p in perks]

    @staticmethod
    def _classify_survivor_item_type(name):
        n = (name or "").lower()
        for target, pattern in SURVIVOR_ITEM_TYPE_PATTERNS:
            if re.search(pattern, n):
                return target
        return None

    def _roll_survivor_gear(self):
        items = db.session.scalars(select(Item).where(Item.role == "Survivor")).all()
        if not items:
            return None, []
        item = random.choice(items)
        # Item.category is the coarse role ("Survivor"/"Killer") from the live scraper,
        # not an item type, so the addon pool has to be matched by classifying the item
        # type from its name instead of comparing category/associated_target directly.
        target = self._classify_survivor_item_type(item.name)
        addons = []
        if target:
            addons = db.session.scalars(
                select(Addon).where(
                    Addon.category == "Survivor",
                    Addon.associated_target == target,
                    Addon.description != "",
                )
            ).all()
        picked = random.sample(addons, min(2, len(addons))) if addons else []
        return item.to_dict(), [a.to_dict() for a in picked]

    def _roll_killer_addons(self, target_char):
        addons = db.session.scalars(
            select(Addon).where(
                Addon.category == "Killer",
                Addon.associated_target == target_char,
                Addon.description != "",
            )
        ).all()
        picked = random.sample(addons, min(2, len(addons))) if addons else []
        return [a.to_dict() for a in picked]

    # ---- runs -------------------------------------------------------------

    def _initial_target(self, user_id, role):
        names = self._owned_character_names(user_id, role)
        if names:
            return random.choice(names)
        return "Meg Thomas" if role == "survivor" else "The Trapper"

    def get_or_create_run(self, user_id, role):
        run = db.session.scalars(
            select(GauntletRun).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
        ).first()
        if run:
            d = run.to_dict()
            d["tier_info"] = self.get_tier_info(d["current_streak"], role)
            return d

        target_character = self._initial_target(user_id, role)
        tier_info = self.get_tier_info(0, role)
        initial_loadout = {
            "character": target_character,
            "character_perks": self._character_teachable_perks(target_character),
            "item": None,
            "addons": [],
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
        db.session.add(new_run)
        db.session.commit()
        d = new_run.to_dict()
        d["tier_info"] = tier_info
        return d

    def roll(self, user_id, role, target_character=None):
        run = self.get_or_create_run(user_id, role)
        tier_info = self.get_tier_info(run["current_streak"], role)

        owned_names = self._owned_character_names(user_id, role)

        completed = run["completed_characters"]
        remaining = [c for c in owned_names if c not in completed]
        if not remaining:
            remaining = owned_names if owned_names else [self._initial_target(user_id, role)]

        target_char = target_character if target_character else random.choice(remaining)

        if role == "survivor":
            item, addons = self._roll_survivor_gear()
        else:
            item, addons = None, self._roll_killer_addons(target_char)

        loadout = {
            "character": target_char,
            "character_perks": self._character_teachable_perks(target_char),
            "item": item,
            "addons": addons,
            "tier_info": tier_info,
        }

        r = db.session.scalars(select(GauntletRun).where(GauntletRun.id == run["id"])).first()
        r.current_character_id = target_char
        r.current_loadout_json = json.dumps(loadout)
        db.session.commit()
        d = r.to_dict()
        d["tier_info"] = tier_info
        return d

    def reveal_target(self, user_id, run_id):
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.id == run_id, GauntletRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        r.target_revealed = True
        db.session.commit()
        d = r.to_dict()
        d["tier_info"] = self.get_tier_info(d["current_streak"], r.role)
        return d

    def reset_run(self, user_id, role):
        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
        ).first()
        if not r:
            raise ValueError("Run not found")

        db.session.delete(r)
        db.session.commit()
        return self.get_or_create_run(user_id, role)

    def submit_result(self, user_id, run_id, result):
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")

        r = db.session.scalars(
            select(GauntletRun).where(GauntletRun.id == run_id, GauntletRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        if r.status == "completed":
            raise ValueError("This run is already completed — reset it to play again")

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
            # The gauntlet is won once every owned character has been cleared.
            owned = self._owned_character_names(user_id, r.role)
            if owned and all(name in completed for name in owned):
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

        db.session.add(GauntletMatchLog(
            run_id=run_id,
            role=r.role,
            character_id=char_id,
            result=result,
            perks_json=perks_json,
            streak_before=current_streak,
            streak_after=streak_after,
        ))
        db.session.commit()
        d = r.to_dict()
        d["tier_info"] = self.get_tier_info(streak_after, r.role)
        return d

    def get_stats(self, user_id, role):
        run_ids = db.session.scalars(
            select(GauntletRun.id).where(GauntletRun.user_id == user_id, GauntletRun.role == role)
        ).all()
        if not run_ids:
            return {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []}

        total = db.session.scalar(
            select(func.count(GauntletMatchLog.id)).where(GauntletMatchLog.run_id.in_(run_ids))
        ) or 0
        wins = db.session.scalar(
            select(func.count(GauntletMatchLog.id)).where(
                GauntletMatchLog.run_id.in_(run_ids), GauntletMatchLog.result == "win"
            )
        ) or 0
        win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

        recent = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id.in_(run_ids))
            .order_by(GauntletMatchLog.id.desc()).limit(10)
        ).all()

        return {
            "total_matches": total,
            "wins": wins,
            "losses": total - wins,
            "win_rate": win_rate,
            "recent_logs": [log.to_dict() for log in recent],
        }
