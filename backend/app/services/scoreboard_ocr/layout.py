# backend/app/services/scoreboard_ocr/layout.py
"""Where things sit on the end-of-match scoreboard.

Every position is measured once on a reference screenshot (1920x1080, panel in its
usual place) and stored relative to the centre of the first perk slot. On each
uploaded screenshot the panel is located first -- from the perk diamonds, falling back
to the right-aligned bloodpoint numbers -- and everything else is derived from it.
That keeps a panel drawn further left, or at another UI scale, lined up; nothing is a
fixed pixel window any more.
"""
from __future__ import annotations

from dataclasses import dataclass

# Reference frame (the analyzer resizes every screenshot to 1920x1080).
REF_PERK1_X = 231.0      # centre of the first perk diamond
REF_PERK_PITCH = 59.3    # distance between perk diamonds
REF_BP_RIGHT = 883.0     # right edge of the bloodpoint number (right-aligned)
NAME_TO_BODY = 58.0      # name line centre -> centre of the loadout/bloodpoint line

# Loadout slot centres (x) and sizes on the loadout line.
PERK_XS = tuple(REF_PERK1_X + i * REF_PERK_PITCH for i in range(4))
OFFERING_X = 482.0
ITEM_X = 550.0
ADDON_XS = (626.0, 680.0)
# Crop sizes that match the reference icons' canvas, measured on the sample screenshots
# as the size where the best icon wins most clearly over the runner-up (see
# scripts/eval_scoreboard_ocr.py --loadout).
PERK_SIZE = 60
OFFERING_SIZE = 52
ITEM_SIZE = 50
ADDON_SIZE = 50

# Name line.
STATUS_ICON_X = (203.0, 243.0)  # window holding the escaped/dead/in-trial/killer icon
NAME_X = 250.0                   # where the character name usually starts
PLAYER_MIN_X = 340.0             # a first box starting right of this is a player name
GLOW_X = (238.0, 450.0)          # strip whose brightness tells the highlighted (own) row
ROW_TEXT_X = (180.0, 700.0)      # any OCR box starting here belongs to the name line

# Prestige badge digits (centre), relative to the loadout line.
PRESTIGE_X = 129.0
PRESTIGE_DY = -18.0
PRESTIGE_BOX = (74, 44)

# Bloodpoints crop, relative to the loadout line.
BP_X = (752.0, 892.0)  # starts just left of a 5-digit number: further left the add-on slot's edge reads as "1"
BP_HALF_H = 20

# Strip on the name line, left of the status icon: red on the killer row only (the
# highlighted own row is gold, which this measure ignores).
REDNESS_X = (150.0, 192.0)
REDNESS_HALF_H = 12
KILLER_REDNESS = 40.0


@dataclass(frozen=True)
class Panel:
    """Maps reference x positions onto one screenshot."""

    x0: float = REF_PERK1_X  # centre of the first perk diamond on this screenshot
    scale: float = 1.0       # UI scale relative to the reference
    located: bool = False    # True when found from the perk diamonds, not guessed

    def x(self, ref_x: float) -> float:
        return self.x0 + (ref_x - REF_PERK1_X) * self.scale

    def d(self, ref_len: float) -> float:
        return ref_len * self.scale

    @property
    def pitch(self) -> float:
        return REF_PERK_PITCH * self.scale

    @classmethod
    def from_bp_right(cls, right: float) -> "Panel":
        return cls(x0=REF_PERK1_X + (right - REF_BP_RIGHT))
