# backend/app/features/streaks/services.py
from app.services.challenge_completions import (
    fetch_active_run_variants_by_mode,
    fetch_completed_variants_by_mode,
    fetch_completion_counts_by_mode,
    fetch_full_roster_counts_by_mode,
)
from app.services.chaos_service import ChaosService
from app.services.gauntlet_service import GauntletService
from app.services.history_service import HistoryService
from app.services.page_streak import (
    build_character_roster,
    build_perk_pool,
    calculate_milestones,
    finalize_page,
    generate_initial_page,
    reroll_perk,
    reroll_slot,
)
from app.services.streak_cleanup_service import apply_inactivity_losses

__all__ = [
    "GauntletService",
    "ChaosService",
    "HistoryService",
    "build_perk_pool",
    "build_character_roster",
    "generate_initial_page",
    "reroll_slot",
    "reroll_perk",
    "finalize_page",
    "calculate_milestones",
    "apply_inactivity_losses",
    "fetch_completed_variants_by_mode",
    "fetch_completion_counts_by_mode",
    "fetch_full_roster_counts_by_mode",
    "fetch_active_run_variants_by_mode",
]
