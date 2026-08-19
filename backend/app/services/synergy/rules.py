# backend/app/services/synergy/rules.py
from typing import Any, Dict, List, Set, Tuple

POSITIVE_SYNERGY_RULES: List[Tuple[Set[str], List[str], str]] = [
    (
        {"sloppy butcher", "a nurse's calling"},
        ["Sloppy Butcher", "A Nurse's Calling"],
        "Sloppy Butcher inflicts Mangled/Hemorrhage to slow healing, keeping survivors injured longer so A Nurse's Calling can track them.",
    ),
    (
        {"sprint burst", "vigil"},
        ["Sprint Burst", "Vigil"],
        "Vigil speeds up Exhaustion recovery by 30%, allowing Sprint Burst to be used much more frequently.",
    ),
    (
        {"lithe", "vigil"},
        ["Lithe", "Vigil"],
        "Vigil reduces Exhaustion cooldown, enabling faster Lithe resets during chases.",
    ),
    (
        {"balanced landing", "vigil"},
        ["Balanced Landing", "Vigil"],
        "Vigil reduces Exhaustion cooldown for Balanced Landing.",
    ),
    (
        {"dead hard", "vigil"},
        ["Dead Hard", "Vigil"],
        "Vigil reduces Exhaustion cooldown for Dead Hard.",
    ),
    (
        {"dramaturgy", "vigil"},
        ["Dramaturgy", "Vigil"],
        "Vigil reduces Exhaustion cooldown for Dramaturgy.",
    ),
    (
        {"scourge hook: pain resonance", "pop goes the weasel"},
        ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel"],
        "Pain Resonance explodes the highest progression generator, allowing you to follow up with Pop Goes the Weasel for massive regression.",
    ),
    (
        {"overcharge", "call of brine"},
        ["Overcharge", "Call of Brine"],
        "Combines regression multipliers on kicked generators for rapid progress loss and difficult skill checks.",
    ),
    (
        {"overcharge", "dragon's grip"},
        ["Overcharge", "Dragon's Grip"],
        "Forces difficult skill checks and punishes survivors with Exposed when touching kicked generators.",
    ),
    (
        {"unbreakable", "exponential"},
        ["Unbreakable", "Exponential"],
        "Exponential boosts recovery speed while Unbreakable allows self-recovery from the dying state.",
    ),
    (
        {"unbreakable", "soul guard"},
        ["Unbreakable", "Soul Guard"],
        "Recovering from dying state grants Endurance, turning slugging into an advantage.",
    ),
    (
        {"tenacity", "unbreakable"},
        ["Tenacity", "Unbreakable"],
        "Allows fast crawling while recovering and self-recovering from the dying state.",
    ),
    (
        {"kindred", "open-handed"},
        ["Kindred", "Open-Handed"],
        "Open-Handed extends Kindred's killer and team aura reading range by 16 meters.",
    ),
    (
        {"bond", "open-handed"},
        ["Bond", "Open-Handed"],
        "Open-Handed extends Bond's teammate aura detection range dramatically.",
    ),
    (
        {"windows of opportunity", "open-handed"},
        ["Windows of Opportunity", "Open-Handed"],
        "Extends aura reading range for nearby pallets and vault locations.",
    ),
    (
        {"botany knowledge", "self-care"},
        ["Botany Knowledge", "Self-Care"],
        "Botany Knowledge counters Self-Care's speed penalty for fast self-healing.",
    ),
    (
        {"botany knowledge", "desperate measures"},
        ["Botany Knowledge", "Desperate Measures"],
        "Stacks healing speed multipliers for lightning-fast heals.",
    ),
    (
        {"we'll make it", "botany knowledge"},
        ["We'll Make It", "Botany Knowledge"],
        "Provides massive healing speed bonuses (+100% and +50%) after unhooking teammates.",
    ),
    (
        {"bite the bullet", "self-care"},
        ["Bite the Bullet", "Self-Care"],
        "Completely silences grunts of pain and noise while self-healing.",
    ),
    (
        {"flashbang", "background player"},
        ["Flashbang", "Background Player"],
        "Background Player gives high sprint speed when killer picks up, enabling easy Flashbang saves.",
    ),
    (
        {"lethal pursuer", "nowhere to hide"},
        ["Lethal Pursuer", "Nowhere to Hide"],
        "Lethal Pursuer extends Nowhere to Hide's aura reveal duration by +2 seconds.",
    ),
    (
        {"lethal pursuer", "barbecue & chilli"},
        ["Lethal Pursuer", "Barbecue & Chilli"],
        "Extends BBQ aura duration on distant survivors after hooking.",
    ),
    (
        {"lethal pursuer", "a nurse's calling"},
        ["Lethal Pursuer", "A Nurse's Calling"],
        "Extends Nurse's Calling aura reveal duration.",
    ),
    (
        {"lethal pursuer", "i'm all ears"},
        ["Lethal Pursuer", "I'm All Ears"],
        "Extends aura reveal duration during vaults.",
    ),
    (
        {"brutal strength", "enduring"},
        ["Brutal Strength", "Enduring"],
        "Reduces pallet stun time and increases break speed for high chase pressure.",
    ),
    (
        {"enduring", "spirit fury"},
        ["Enduring", "Spirit Fury"],
        "Spirit Fury breaks pallets automatically on stun, and Enduring minimizes the stun duration.",
    ),
    (
        {"save the best for last", "rapid brutality"},
        ["Save the Best for Last", "Rapid Brutality"],
        "Rapid Brutality grants haste on basic attack hits, compounding attack recovery speed.",
    ),
]

EXHAUSTION_PERKS: Set[str] = {
    "sprint burst",
    "dead hard",
    "lithe",
    "balanced landing",
    "head on",
    "overcome",
    "smash hit",
    "dramaturgy",
    "background player",
}

NO_MITHER_ANTI_PERKS: List[Tuple[str, str, str]] = [
    ("self-care", "Self-Care", "No Mither keeps you permanently Broken/Injured, rendering Self-Care completely useless."),
    ("inner healing", "Inner Healing", "No Mither keeps you permanently Broken, preventing Inner Healing from restoring health."),
    ("for the people", "For the People", "No Mither keeps you Broken, preventing you from using For the People."),
    ("renewal", "Renewal", "No Mither prevents healing to healthy state."),
    ("second wind", "Second Wind", "No Mither prevents healing to healthy state."),
    ("solidarity", "Solidarity", "No Mither keeps you permanently Broken."),
]

HEX_RUIN_ANTI_PERKS: List[Tuple[str, str, str]] = [
    ("pop goes the weasel", "Pop Goes the Weasel", "Hex: Ruin automatically regresses generators, preventing generator kick interactions required for Pop Goes the Weasel."),
    ("overcharge", "Overcharge", "Hex: Ruin automatically regresses generators, preventing generator kick interactions required for Overcharge."),
    ("call of brine", "Call of Brine", "Hex: Ruin automatically regresses generators, preventing generator kick interactions required for Call of Brine."),
    ("dragon's grip", "Dragon's Grip", "Hex: Ruin automatically regresses generators, preventing generator kick interactions."),
]

