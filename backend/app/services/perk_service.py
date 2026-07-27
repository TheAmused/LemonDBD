import json
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class PerkModel(BaseModel):
    name: str = Field(..., description="Full title of the perk")
    character: str = Field(..., description="Associated character name or 'General'")
    category: str = Field(..., description="'Survivor' or 'Killer'")
    description: str = Field(..., description="Markdown-formatted description")
    icon_url: str = Field(..., description="Original CDN URL")
    icon_local_path: str = Field(..., description="Relative local storage path")


class PerkService:
    """Thread-safe perk data service supporting advanced filtering, sorting, and pagination."""

    ALLOWED_SORT_FIELDS = {"name", "character", "category"}

    def __init__(self, data_path: Optional[Path] = None):
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent.parent / "data" / "perks.json"
        self.data_path = Path(data_path)
        self._cache: List[PerkModel] = []
        self.reload_data()

    def reload_data(self) -> None:
        """Reloads and validates JSON data into memory."""
        if not self.data_path.exists():
            logger.warning(f"Data file missing at {self.data_path}. Cache cleared.")
            self._cache = []
            return

        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                self._cache = [PerkModel(**item) for item in raw_data]
            logger.info(f"Loaded {len(self._cache)} validated perks into memory.")
        except Exception as e:
            logger.error(f"Failed loading perks JSON dataset: {e}")
            self._cache = []

    @staticmethod
    def _slugify(text: str) -> str:
        return re.sub(r"[\s\-/]+", "_", text.lower().strip())

    def get_perks(
        self,
        category: Optional[str] = None,
        character: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        order: str = "asc",
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Applies filtering, sorting, and pagination to the in-memory dataset."""
        results = self._cache

        # 1. Filtering
        if category and category.lower() != "all":
            results = [p for p in results if p.category.lower() == category.lower()]

        if character and character.lower() != "all":
            results = [p for p in results if p.character.lower() == character.lower()]

        if search:
            query = search.lower().strip()
            results = [
                p for p in results
                if query in p.name.lower() or query in p.description.lower()
            ]

        # 2. Sorting
        valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
        reverse = (order.lower() == "desc")

        results = sorted(
            results,
            key=lambda x: getattr(x, valid_sort_field).lower(),
            reverse=reverse,
        )

        # 3. Pagination
        total_count = len(results)
        page = max(1, page)
        limit = max(1, min(limit, 200))  # Cap limit between 1 and 200
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_data = [p.model_dump() for p in results[start_idx:end_idx]]

        return {
            "data": paginated_data,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": end_idx < total_count,
                "has_prev": page > 1,
            },
            "filters": {
                "category": category or "all",
                "character": character or "all",
                "search": search or "",
                "sort_by": valid_sort_field,
                "order": "desc" if reverse else "asc",
            },
        }

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        target = identifier.lower().strip()
        for perk in self._cache:
            if perk.name.lower().strip() == target or self._slugify(perk.name) == target:
                return perk.model_dump()
        return None

    def get_characters(self, category: Optional[str] = None) -> List[str]:
        characters = set()
        for perk in self._cache:
            if category and category.lower() != "all":
                if perk.category.lower() == category.lower() and perk.character != "General":
                    characters.add(perk.character)
            else:
                if perk.character != "General":
                    characters.add(perk.character)
        return sorted(list(characters))