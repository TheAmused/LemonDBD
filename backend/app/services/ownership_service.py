# backend/app/services/ownership_service.py
import logging
from typing import Any, Dict, List, Optional, Set

from app.services.ownership import (
    bulk_mutate_character_ownership,
    bulk_mutate_perk_ownership,
    calculate_ownership_summary,
    fetch_user_characters,
    fetch_user_perks,
    mutate_character_ownership,
    mutate_perk_ownership,
    seed_default_character_ownership,
)

logger = logging.getLogger(__name__)


class OwnershipService:
    def get_user_ownership_summary(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        return calculate_ownership_summary(user_id)

    def get_user_characters(self, user_id: Optional[int] = None, role: Optional[str] = None) -> List[Dict[str, Any]]:
        return fetch_user_characters(user_id=user_id, role=role)

    def set_character_ownership(self, user_id: int, character_id: int, is_owned: bool) -> Dict[str, Any]:
        return mutate_character_ownership(user_id, character_id, is_owned)

    def seed_default_ownership_for_new_user(self, user_id: int) -> int:
        return seed_default_character_ownership(user_id)

    def bulk_set_character_ownership(self, user_id: int, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        return bulk_mutate_character_ownership(user_id, updates, self.get_user_ownership_summary)

    def get_user_perks(self, user_id: Optional[int] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return fetch_user_perks(user_id=user_id, category=category)

    def set_perk_ownership(self, user_id: int, perk_id: int, is_unlocked: bool) -> Dict[str, Any]:
        return mutate_perk_ownership(user_id, perk_id, is_unlocked)

    def bulk_set_perk_ownership(self, user_id: int, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        return bulk_mutate_perk_ownership(user_id, updates, self.get_user_ownership_summary)

    def get_owned_perk_names_set(self, user_id: Optional[int] = None) -> Set[str]:
        summary = self.get_user_ownership_summary(user_id)
        return set(summary.get("owned_perk_names", []))

    def get_owned_perk_ids_set(self, user_id: Optional[int] = None) -> Set[int]:
        summary = self.get_user_ownership_summary(user_id)
        return set(summary.get("owned_perk_ids", []))

