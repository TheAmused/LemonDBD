# backend/app/services/synergy_service.py
from typing import Any, Dict, List

from app.services.synergy import (
    BADGE_CATEGORIES,
    EXHAUSTION_PERKS,
    HEX_RUIN_ANTI_PERKS,
    NO_MITHER_ANTI_PERKS,
    POSITIVE_SYNERGY_RULES,
    evaluate_build_synergy,
)


class SynergyService:
    def calculate_synergy(self, perk_names: List[str], role: str = "survivor") -> Dict[str, Any]:
        """Evaluates synergies and builds compatibility analysis for loadouts."""
        return evaluate_build_synergy(perk_names, role)


def calculate_synergy(perk_names: List[str], role: str = "survivor") -> Dict[str, Any]:
    """Compatibility wrapper function for direct synergy evaluation."""
    return SynergyService().calculate_synergy(perk_names, role)

