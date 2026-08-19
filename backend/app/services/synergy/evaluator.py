# backend/app/services/synergy/evaluator.py
from typing import Any, Dict, List, Set

from app.services.synergy.badges import evaluate_tactical_badges
from app.services.synergy.rules import (
    EXHAUSTION_PERKS,
    HEX_RUIN_ANTI_PERKS,
    NO_MITHER_ANTI_PERKS,
    POSITIVE_SYNERGY_RULES,
)


def evaluate_build_synergy(perk_names: List[str], role: str = "survivor") -> Dict[str, Any]:
    """Calculates compatibility score, positive combos, anti-synergies, and badges."""
    cleaned_perks = [p.strip() for p in perk_names if p and p.strip()]
    perk_lower_map = {p.lower(): p for p in cleaned_perks}
    perk_lowers = set(perk_lower_map.keys())

    positive_synergies: List[Dict[str, Any]] = []
    anti_synergies: List[Dict[str, Any]] = []

    # 1. Detect Positive Synergies
    for rule_set, _, desc in POSITIVE_SYNERGY_RULES:
        if rule_set.issubset(perk_lowers):
            actual_names = [perk_lower_map.get(k, k.title()) for k in rule_set]
            positive_synergies.append({
                "perks": actual_names,
                "description": desc,
            })

    # 2. Detect Anti-Synergies
    # A. Multiple Exhaustion Perks
    equipped_exhaustion = [perk_lower_map[p] for p in perk_lowers if p in EXHAUSTION_PERKS]
    if len(equipped_exhaustion) >= 2:
        anti_synergies.append({
            "perks": equipped_exhaustion,
            "description": f"Equipping multiple Exhaustion perks ({', '.join(equipped_exhaustion)}) reduces efficiency because Exhaustion cooldowns are shared.",
        })

    # B. No Mither Anti-Synergies
    if "no mither" in perk_lowers:
        for bad_key, _, desc in NO_MITHER_ANTI_PERKS:
            if bad_key in perk_lowers:
                anti_synergies.append({
                    "perks": [perk_lower_map["no mither"], perk_lower_map[bad_key]],
                    "description": desc,
                })

    # C. Hex: Ruin Anti-Synergies
    if "hex: ruin" in perk_lowers:
        for bad_key, _, desc in HEX_RUIN_ANTI_PERKS:
            if bad_key in perk_lowers:
                anti_synergies.append({
                    "perks": [perk_lower_map["hex: ruin"], perk_lower_map[bad_key]],
                    "description": desc,
                })

    # 3. Detect Tactical Badges
    tactical_badges = evaluate_tactical_badges(perk_lowers)

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
        "details": f"Compatibility Score: {score}%. Found {len(positive_synergies)} positive synergies and {len(anti_synergies)} anti-synergies.",
    }

