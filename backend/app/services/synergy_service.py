# backend/app/services/synergy_service.py
from typing import Any
from app.services.synergy import evaluate_build_synergy


class SynergyService:
    def calculate_synergy(self, perk_names: list[str], role: str = "survivor") -> dict[str, Any]:
        """Evaluates synergies and builds compatibility analysis for loadouts."""
        return evaluate_build_synergy(perk_names, role)


def calculate_synergy(perk_names: list[str], role: str = "survivor") -> dict[str, Any]:
    """Compatibility wrapper function for direct synergy evaluation."""
    return SynergyService().calculate_synergy(perk_names, role)
