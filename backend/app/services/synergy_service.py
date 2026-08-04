from typing import List, Dict, Any

# Defined positive perk pairs and their descriptions
POSITIVE_SYNERGY_RULES = [
    (
        {"sloppy butcher", "a nurse's calling"},
        ["Sloppy Butcher", "A Nurse's Calling"],
        "Sloppy Butcher inflicts Mangled/Hemorrhage to slow healing, keeping survivors injured longer so A Nurse's Calling can track them."
    ),
    (
        {"sprint burst", "vigil"},
        ["Sprint Burst", "Vigil"],
        "Vigil speeds up Exhaustion recovery by 30%, allowing Sprint Burst to be used much more frequently."
    ),
    (
        {"lithe", "vigil"},
        ["Lithe", "Vigil"],
        "Vigil reduces Exhaustion cooldown, enabling faster Lithe resets during chases."
    ),
    (
        {"balanced landing", "vigil"},
        ["Balanced Landing", "Vigil"],
        "Vigil reduces Exhaustion cooldown for Balanced Landing."
    ),
    (
        {"dead hard", "vigil"},
        ["Dead Hard", "Vigil"],
        "Vigil reduces Exhaustion cooldown for Dead Hard."
    ),
    (
        {"dramaturgy", "vigil"},
        ["Dramaturgy", "Vigil"],
        "Vigil reduces Exhaustion cooldown for Dramaturgy."
    ),
    (
        {"scourge hook: pain resonance", "pop goes the weasel"},
        ["Scourge Hook: Pain Resonance", "Pop Goes the Weasel"],
        "Pain Resonance explodes the highest progression generator, allowing you to follow up with Pop Goes the Weasel for massive regression."
    ),
    (
        {"overcharge", "call of brine"},
        ["Overcharge", "Call of Brine"],
        "Combines regression multipliers on kicked generators for rapid progress loss and difficult skill checks."
    ),
    (
        {"overcharge", "dragon's grip"},
        ["Overcharge", "Dragon's Grip"],
        "Forces difficult skill checks and punishes survivors with Exposed when touching kicked generators."
    ),
    (
        {"unbreakable", "exponential"},
        ["Unbreakable", "Exponential"],
        "Exponential boosts recovery speed while Unbreakable allows self-recovery from the dying state."
    ),
    (
        {"unbreakable", "soul guard"},
        ["Unbreakable", "Soul Guard"],
        "Recovering from dying state grants Endurance, turning slugging into an advantage."
    ),
    (
        {"tenacity", "unbreakable"},
        ["Tenacity", "Unbreakable"],
        "Allows fast crawling while recovering and self-recovering from the dying state."
    ),
    (
        {"kindred", "open-handed"},
        ["Kindred", "Open-Handed"],
        "Open-Handed extends Kindred's killer and team aura reading range by 16 meters."
    ),
    (
        {"bond", "open-handed"},
        ["Bond", "Open-Handed"],
        "Open-Handed extends Bond's teammate aura detection range dramatically."
    ),
    (
        {"windows of opportunity", "open-handed"},
        ["Windows of Opportunity", "Open-Handed"],
        "Extends aura reading range for nearby pallets and vault locations."
    ),
    (
        {"botany knowledge", "self-care"},
        ["Botany Knowledge", "Self-Care"],
        "Botany Knowledge counters Self-Care's speed penalty for fast self-healing."
    ),
    (
        {"botany knowledge", "desperate measures"},
        ["Botany Knowledge", "Desperate Measures"],
        "Stacks healing speed multipliers for lightning-fast heals."
    ),
    (
        {"we'll make it", "botany knowledge"},
        ["We'll Make It", "Botany Knowledge"],
        "Provides massive healing speed bonuses (+100% and +50%) after unhooking teammates."
    ),
    (
        {"bite the bullet", "self-care"},
        ["Bite the Bullet", "Self-Care"],
        "Completely silences grunts of pain and noise while self-healing."
    ),
    (
        {"flashbang", "background player"},
        ["Flashbang", "Background Player"],
        "Background Player gives high sprint speed when killer picks up, enabling easy Flashbang saves."
    ),
    (
        {"lethal pursuer", "nowhere to hide"},
        ["Lethal Pursuer", "Nowhere to Hide"],
        "Lethal Pursuer extends Nowhere to Hide's aura reveal duration by +2 seconds."
    ),
    (
        {"lethal pursuer", "barbecue & chilli"},
        ["Lethal Pursuer", "Barbecue & Chilli"],
        "Extends BBQ aura duration on distant survivors after hooking."
    ),
    (
        {"lethal pursuer", "a nurse's calling"},
        ["Lethal Pursuer", "A Nurse's Calling"],
        "Extends Nurse's Calling aura reveal duration."
    ),
    (
        {"lethal pursuer", "i'm all ears"},
        ["Lethal Pursuer", "I'm All Ears"],
        "Extends aura reveal duration during vaults."
    ),
    (
        {"brutal strength", "enduring"},
        ["Brutal Strength", "Enduring"],
        "Reduces pallet stun time and increases break speed for high chase pressure."
    ),
    (
        {"enduring", "spirit fury"},
        ["Enduring", "Spirit Fury"],
        "Spirit Fury breaks pallets automatically on stun, and Enduring minimizes the stun duration."
    ),
    (
        {"save the best for last", "rapid brutality"},
        ["Save the Best for Last", "Rapid Brutality"],
        "Rapid Brutality grants haste on basic attack hits, compounding attack recovery speed."
    ),
]

EXHAUSTION_PERKS = {
    "sprint burst", "dead hard", "lithe", "balanced landing",
    "head on", "overcome", "smash hit", "dramaturgy", "background player"
}

NO_MITHER_ANTI_PERKS = [
    ("self-care", "Self-Care", "No Mither keeps you permanently Broken/Injured, rendering Self-Care completely useless."),
    ("inner healing", "Inner Healing", "No Mither keeps you permanently Broken, preventing Inner Healing from restoring health."),
    ("for the people", "For the People", "No Mither keeps you Broken, preventing you from using For the People."),
    ("renewal", "Renewal", "No Mither prevents healing to healthy state."),
    ("second wind", "Second Wind", "No Mither prevents healing to healthy state."),
    ("solidarity", "Solidarity", "No Mither keeps you permanently Broken."),
]

HEX_RUIN_ANTI_PERKS = [
    ("pop goes the weasel", "Pop Goes the Weasel", "Hex: Ruin automatically regresses generators, preventing generator kick interactions required for Pop Goes the Weasel."),
    ("overcharge", "Overcharge", "Hex: Ruin automatically regresses generators, preventing generator kick interactions required for Overcharge."),
    ("call of brine", "Call of Brine", "Hex: Ruin automatically regresses generators, preventing generator kick interactions required for Call of Brine."),
    ("dragon's grip", "Dragon's Grip", "Hex: Ruin automatically regresses generators, preventing generator kick interactions."),
]

BADGE_CATEGORIES = {
    "Gen Pressure": {
        "scourge hook: pain resonance", "pop goes the weasel", "call of brine", "overcharge",
        "hex: ruin", "corrupt intervention", "deadlock", "surge", "jolt", "oppression",
        "hyperfocus", "prove thyself", "deja vu", "fast track", "built to last", "stake out",
        "tinkerer", "unforeseen", "hex: pentimento"
    },
    "Chase Specialist": {
        "windows of opportunity", "lithe", "sprint burst", "dead hard", "balanced landing",
        "resilience", "enduring", "brutal strength", "bamboozle", "save the best for last",
        "spirit fury", "superior anatomy", "coup de grâce", "head on", "overcome",
        "rapid brutality", "play with your food", "zanshin tactics"
    },
    "Stealth Master": {
        "distortion", "off the record", "iron will", "calm spirit", "shadow step",
        "urban evasion", "diversion", "pebble", "lightborn", "tinkerer", "unforeseen",
        "trail of torment", "dark devotion", "beast of prey", "quick & quiet", "deception"
    },
    "Healing Core": {
        "botany knowledge", "we'll make it", "self-care", "desperate measures",
        "circle of healing", "bite the bullet", "empathy", "pharmacy", "sloppy butcher",
        "a nurse's calling", "coulrophobia", "autodidact", "renewal", "second wind", "inner healing"
    },
    "Support / Unhooker": {
        "borrowed time", "we'll make it", "deliverance", "reassurance", "babysitter",
        "guardian", "kindred", "for the people", "breakout", "background player"
    }
}


class SynergyService:
    def calculate_synergy(self, perk_names: List[str], role: str = "survivor") -> Dict[str, Any]:
        cleaned_perks = [p.strip() for p in perk_names if p and p.strip()]
        perk_lower_map = {p.lower(): p for p in cleaned_perks}
        perk_lowers = set(perk_lower_map.keys())

        positive_synergies = []
        anti_synergies = []
        tactical_badges = []

        # 1. Detect Positive Synergies
        for rule_set, canonical_names, desc in POSITIVE_SYNERGY_RULES:
            if rule_set.issubset(perk_lowers):
                actual_names = [perk_lower_map.get(k, k.title()) for k in rule_set]
                positive_synergies.append({
                    "perks": actual_names,
                    "description": desc
                })

        # 2. Detect Anti-Synergies
        # A. Multiple Exhaustion Perks
        equipped_exhaustion = [perk_lower_map[p] for p in perk_lowers if p in EXHAUSTION_PERKS]
        if len(equipped_exhaustion) >= 2:
            anti_synergies.append({
                "perks": equipped_exhaustion,
                "description": f"Equipping multiple Exhaustion perks ({', '.join(equipped_exhaustion)}) reduces efficiency because Exhaustion cooldowns are shared."
            })

        # B. No Mither Anti-Synergies
        if "no mither" in perk_lowers:
            for bad_key, bad_name, desc in NO_MITHER_ANTI_PERKS:
                if bad_key in perk_lowers:
                    anti_synergies.append({
                        "perks": [perk_lower_map["no mither"], perk_lower_map[bad_key]],
                        "description": desc
                    })

        # C. Hex: Ruin Anti-Synergies
        if "hex: ruin" in perk_lowers:
            for bad_key, bad_name, desc in HEX_RUIN_ANTI_PERKS:
                if bad_key in perk_lowers:
                    anti_synergies.append({
                        "perks": [perk_lower_map["hex: ruin"], perk_lower_map[bad_key]],
                        "description": desc
                    })

        # 3. Detect Tactical Badges
        for badge_name, badge_perks in BADGE_CATEGORIES.items():
            matches = perk_lowers.intersection(badge_perks)
            if len(matches) >= 2:
                tactical_badges.append(badge_name)

        # 4. Calculate Score
        n = len(cleaned_perks)
        if n == 0:
            base_score = 0
        elif n == 1:
            base_score = 30
        elif n == 2:
            base_score = 55
        elif n == 3:
            base_score = 70
        else:
            base_score = 75

        calculated_score = base_score + (len(positive_synergies) * 12) - (len(anti_synergies) * 20)
        score = max(0, min(100, calculated_score))

        return {
            "score": score,
            "positive_synergies": positive_synergies,
            "anti_synergies": anti_synergies,
            "tactical_badges": tactical_badges,
            "details": f"Compatibility Score: {score}%. Found {len(positive_synergies)} positive synergies and {len(anti_synergies)} anti-synergies."
        }


def calculate_synergy(perk_names: List[str], role: str = "survivor") -> Dict[str, Any]:
    return SynergyService().calculate_synergy(perk_names, role)
