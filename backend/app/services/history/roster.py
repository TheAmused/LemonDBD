# backend/app/services/history/roster.py
from sqlalchemy import select

from app.core.extensions import db
from app.models import Killer, Perk
from app.services.ownership.characters import get_owned_killers, resolve_killer_names_by_ids
from app.services.ownership_service import OwnershipService

__all__ = ["resolve_killer_names_by_ids"]

ROW_SIZE = 5


def build_rows(owned_killer_names: list[str]) -> list[list[str]]:
    return [
        owned_killer_names[i:i + ROW_SIZE]
        for i in range(0, len(owned_killer_names), ROW_SIZE)
    ]


def get_owned_killer_names_by_release(user_id: int, ownership_service: OwnershipService) -> list[str]:
    return get_owned_killers(user_id, ownership_service, shape="names", by_release=True)


def get_owned_killer_ids_by_release(user_id: int, ownership_service: OwnershipService) -> list[int]:
    """Same release-order filtering as get_owned_killer_names_by_release,
    but keyed by the killer's stable id."""
    return get_owned_killers(user_id, ownership_service, shape="ids", by_release=True)


def get_general_killer_perk_names() -> list[str]:
    stmt = select(Perk.name).where(
        Perk.role == "Killer",
        # A general perk is one no killer teaches.
        (Perk.killer_id.is_(None)) | (Perk.is_generic_counterpart.is_(True)),
        Perk.is_disabled.is_(False),
    )
    return list(db.session.scalars(stmt).all())


def get_killer_teachable_perk_names(killer_name: str) -> list[str]:
    killer = db.session.scalars(
        select(Killer).where(Killer.name == killer_name)
    ).first()
    if not killer:
        return []
    stmt = select(Perk.name).where(
        Perk.killer_id == killer.id, Perk.is_teachable.is_(True), Perk.is_disabled.is_(False)
    )
    return list(db.session.scalars(stmt).all())
