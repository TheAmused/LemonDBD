# backend/app/services/generator_service.py
import logging
from typing import Any, Dict, List, Optional

from app.services.db_service import DatabaseService
from app.services.generator import (
    add_drawn_perks as _add_drawn,
    get_drawn_perks as _get_drawn,
    get_generator_config as _get_config,
    reset_drawn_perks as _reset_drawn,
    update_generator_config as _update_config,
)

logger = logging.getLogger(__name__)


class GeneratorService:
    def __init__(self, db_service: Optional[DatabaseService] = None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def get_config(self) -> Dict[str, Any]:
        return _get_config(self._use_sqlalchemy, self.db_service)

    def update_config(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return _update_config(data, self._use_sqlalchemy, self.db_service)

    def get_drawn_perks(self, role: Optional[str]) -> List[str]:
        return _get_drawn(role, self._use_sqlalchemy, self.db_service)

    def add_drawn_perks(self, role: Optional[str], perk_names: List[str]) -> List[str]:
        return _add_drawn(role, perk_names, self._use_sqlalchemy, self.db_service)

    def reset_drawn_perks(self, role: Optional[str] = None) -> List[str]:
        return _reset_drawn(role, self._use_sqlalchemy, self.db_service)

