# backend/app/services/id_please/constants.py
"""Fixed rules of "ID, Please": the three lanes, the three difficulties, badge thresholds, checkpoints and account gates."""
MODE = "id_please"

#: A lane is one way to play. Each has its own runs, statistics, badges and kill switch (its `MODE_BY_LANE` mode).
#: `mixed` alternates the side every match; `survivor` and `killer` stay on one side.
LANES: tuple[str, ...] = ("mixed", "survivor", "killer")
MIXED = "mixed"
MODE_BY_LANE: dict[str, str] = {"mixed": "id_please", "survivor": "id_please_survivor", "killer": "id_please_killer"}
LANE_BY_MODE: dict[str, str] = {mode: lane for lane, mode in MODE_BY_LANE.items()}

DIFFICULTIES: tuple[str, ...] = ("milestones", "hardcore", "hardcore_plus")
HARDCORE_PLUS = "hardcore_plus"

#: Endless: reaching this streak for the first time earns the difficulty's badge (a `ChallengeCompletionRecord`) and
#: the run goes on. Single-side Milestones has no streak threshold: its badge comes from winning with every
#: character of the side (see `badge_by_roster` and `id_please_service`).
BADGE_STREAK: dict[str, int] = {"milestones": 50, "hardcore": 30, "hardcore_plus": 25}

#: A win on a multiple of this many matches is a checkpoint; 0 means a loss starts the attempt over.
CHECKPOINT_INTERVAL: dict[str, int] = {"milestones": 10, "hardcore": 0, "hardcore_plus": 0}

#: Version of the arithmetic in `chain.py`, stored on the run when its opening is accepted.
ALGO_VERSION = 2

LOADOUT_PERKS = 4

#: Every character teaches exactly three perks.
PERKS_PER_CHARACTER = 3

#: Fewest perks a side needs for four distinct ones to exist, and what a one-character roster must still allow.
MIN_PERKS = LOADOUT_PERKS

#: Characters an account must own on each side before a difficulty opens (the mixed lane needs both sides).
MIN_CHARACTERS: dict[str, dict[str, int]] = {
    "milestones": {"killer": 1, "survivor": 1},
    "hardcore": {"killer": 20, "survivor": 25},
    "hardcore_plus": {"killer": 30, "survivor": 30},
}

#: A single-side Milestones run is won by playing every character once, so a tiny roster would hand out the badge
#: after a handful of matches and never reach a checkpoint.
SOLO_MILESTONES_MIN_CHARACTERS = 10

SIDES: tuple[str, ...] = ("killer", "survivor")


def checkpoint_interval(difficulty: str) -> int:
    return CHECKPOINT_INTERVAL.get(difficulty, 0)


def lane_sides(lane: str) -> tuple[str, ...]:
    """The sides a lane is played on."""
    return SIDES if lane == MIXED else (lane,)


def is_solo(lane: str) -> bool:
    return lane != MIXED


def min_characters(lane: str, difficulty: str, side: str) -> int:
    """Characters needed on `side` for this lane and difficulty (0 for a side the lane never plays)."""
    if side not in lane_sides(lane):
        return 0
    if is_solo(lane) and difficulty == "milestones":
        return SOLO_MILESTONES_MIN_CHARACTERS
    return MIN_CHARACTERS[difficulty][side]


def keeps_memory_always(lane: str, difficulty: str) -> bool:
    """Hardcore and Hardcore+ never repeat a character within a round, in every lane. Milestones is decided per run."""
    return difficulty != "milestones"


def badge_by_roster(lane: str, difficulty: str) -> bool:
    """Only single-side Milestones earns its badge by winning with every character; every other lane and difficulty
    earns it at the streak in `BADGE_STREAK`."""
    return is_solo(lane) and difficulty == "milestones"
