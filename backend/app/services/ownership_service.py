import logging
from typing import Any, Dict, List, Optional, Set
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models import Character, Perk, UserCharacterOwnership, UserPerkOwnership, User

logger = logging.getLogger(__name__)


class OwnershipService:
    def get_user_ownership_summary(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        all_characters = db.session.scalars(select(Character)).all()
        char_map = {c.id: c for c in all_characters}
        all_perks = db.session.scalars(select(Perk).options(joinedload(Perk.character))).all()

        total_surv_chars = sum(1 for c in all_characters if (c.role or "Survivor").lower() == "survivor")
        total_kill_chars = sum(1 for c in all_characters if (c.role or "Survivor").lower() == "killer")
        total_surv_perks = sum(1 for p in all_perks if (p.category or "Survivor").lower() == "survivor")
        total_kill_perks = sum(1 for p in all_perks if (p.category or "Survivor").lower() == "killer")

        if not user_id:
            all_perk_names: List[str] = []
            for p in all_perks:
                all_perk_names.append(p.name)
                if p.alternate_name and p.alternate_name not in all_perk_names:
                    all_perk_names.append(p.alternate_name)

            return {
                "user_id": None,
                "total_perks_count": len(all_perks),
                "owned_perks_count": len(all_perks),
                "total_survivor_perks_count": total_surv_perks,
                "owned_survivor_perks_count": total_surv_perks,
                "total_killer_perks_count": total_kill_perks,
                "owned_killer_perks_count": total_kill_perks,
                "total_characters_count": len(all_characters),
                "owned_characters_count": len(all_characters),
                "total_survivor_characters_count": total_surv_chars,
                "owned_survivor_characters_count": total_surv_chars,
                "total_killer_characters_count": total_kill_chars,
                "owned_killer_characters_count": total_kill_chars,
                "owned_perk_ids": [p.id for p in all_perks],
                "owned_perk_names": all_perk_names,
                "owned_character_ids": [c.id for c in all_characters],
                "owned_character_names": [c.name for c in all_characters],
            }

        user = db.session.get(User, user_id)
        if not user:
            return self.get_user_ownership_summary(None)

        char_ownership_rows = db.session.scalars(
            select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
        ).all()
        deactivated_char_ids = {co.character_id for co in char_ownership_rows if not co.is_owned}
        owned_character_ids_set = {c.id for c in all_characters if c.id not in deactivated_char_ids}
        owned_character_names = [char_map[cid].name for cid in owned_character_ids_set if cid in char_map]

        perk_ownership_rows = db.session.scalars(
            select(UserPerkOwnership).where(UserPerkOwnership.user_id == user_id)
        ).all()
        explicit_perk_unlocked = {po.perk_id for po in perk_ownership_rows if po.is_unlocked}
        explicit_perk_locked = {po.perk_id for po in perk_ownership_rows if not po.is_unlocked}

        owned_perk_ids: List[int] = []
        owned_perk_names: List[str] = []
        owned_surv_perks = 0
        owned_kill_perks = 0

        for perk in all_perks:
            is_surv = (perk.category or "Survivor").lower() == "survivor"
            is_general = perk.character_id is None or perk.is_generic_counterpart

            if is_general:
                is_owned = True
            elif perk.id in explicit_perk_locked:
                is_owned = False
            elif perk.id in explicit_perk_unlocked:
                is_owned = True
            else:
                is_owned = (perk.character_id in owned_character_ids_set) if perk.character_id else True

            if is_owned:
                owned_perk_ids.append(perk.id)
                owned_perk_names.append(perk.name)
                if perk.alternate_name and perk.alternate_name not in owned_perk_names:
                    owned_perk_names.append(perk.alternate_name)
                if is_surv:
                    owned_surv_perks += 1
                else:
                    owned_kill_perks += 1

        owned_surv_chars = sum(
            1 for cid in owned_character_ids_set if cid in char_map and (char_map[cid].role or "Survivor").lower() == "survivor"
        )
        owned_kill_chars = sum(
            1 for cid in owned_character_ids_set if cid in char_map and (char_map[cid].role or "Survivor").lower() == "killer"
        )

        return {
            "user_id": user_id,
            "total_perks_count": len(all_perks),
            "owned_perks_count": len(owned_perk_ids),
            "total_survivor_perks_count": total_surv_perks,
            "owned_survivor_perks_count": owned_surv_perks,
            "total_killer_perks_count": total_kill_perks,
            "owned_killer_perks_count": owned_kill_perks,
            "total_characters_count": len(all_characters),
            "owned_characters_count": len(owned_character_ids_set),
            "total_survivor_characters_count": total_surv_chars,
            "owned_survivor_characters_count": owned_surv_chars,
            "total_killer_characters_count": total_kill_chars,
            "owned_killer_characters_count": owned_kill_chars,
            "owned_perk_ids": owned_perk_ids,
            "owned_perk_names": owned_perk_names,
            "owned_character_ids": list(owned_character_ids_set),
            "owned_character_names": owned_character_names,
        }

    def get_user_characters(self, user_id: Optional[int] = None, role: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(Character)
        if role and role.lower() != "all":
            stmt = stmt.where(func.lower(Character.role) == role.lower())
        stmt = stmt.order_by(Character.name.asc())
        all_chars = db.session.scalars(stmt).all()

        if not user_id:
            result = []
            for c in all_chars:
                d = c.to_dict()
                d["is_owned"] = True
                result.append(d)
            return result

        owned_rows = db.session.scalars(
            select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
        ).all()
        owned_dict = {row.character_id: row.is_owned for row in owned_rows}

        result = []
        for c in all_chars:
            d = c.to_dict()
            d["is_owned"] = owned_dict.get(c.id, True)
            result.append(d)
        return result

    def set_character_ownership(self, user_id: int, character_id: int, is_owned: bool) -> Dict[str, Any]:
        char = db.session.get(Character, character_id)
        if not char:
            raise ValueError(f"Character with ID {character_id} not found.")

        record = db.session.scalars(
            select(UserCharacterOwnership).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.character_id == character_id,
            )
        ).first()

        if not record:
            record = UserCharacterOwnership(
                user_id=user_id,
                character_id=character_id,
                is_owned=is_owned,
            )
            db.session.add(record)
        else:
            record.is_owned = is_owned

        db.session.commit()
        return record.to_dict()

    def bulk_set_character_ownership(self, user_id: int, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        updated_count = 0
        for item in updates:
            cid = item.get("character_id")
            if not cid:
                continue
            is_owned = bool(item.get("is_owned", True))
            record = db.session.scalars(
                select(UserCharacterOwnership).where(
                    UserCharacterOwnership.user_id == user_id,
                    UserCharacterOwnership.character_id == int(cid),
                )
            ).first()

            if not record:
                record = UserCharacterOwnership(
                    user_id=user_id,
                    character_id=int(cid),
                    is_owned=is_owned,
                )
                db.session.add(record)
            else:
                record.is_owned = is_owned
            updated_count += 1

        db.session.commit()
        return {
            "user_id": user_id,
            "updated_count": updated_count,
            "summary": self.get_user_ownership_summary(user_id),
        }

    def get_user_perks(self, user_id: Optional[int] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(Perk).options(joinedload(Perk.character))
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Perk.category) == category.lower())
        stmt = stmt.order_by(Perk.name.asc())
        all_perks = db.session.scalars(stmt).all()

        if not user_id:
            result = []
            for p in all_perks:
                d = p.to_dict()
                d["is_unlocked"] = True
                d["is_general"] = bool(p.character_id is None or p.is_generic_counterpart)
                result.append(d)
            return result

        perk_ownerships = db.session.scalars(
            select(UserPerkOwnership).where(UserPerkOwnership.user_id == user_id)
        ).all()
        perk_explicit_dict = {row.perk_id: row.is_unlocked for row in perk_ownerships}

        char_ownerships = db.session.scalars(
            select(UserCharacterOwnership).where(UserCharacterOwnership.user_id == user_id)
        ).all()
        deactivated_char_ids = {row.character_id for row in char_ownerships if not row.is_owned}

        result = []
        for p in all_perks:
            d = p.to_dict()
            is_general = p.character_id is None or p.is_generic_counterpart
            if is_general:
                is_unlocked = True
            elif p.id in perk_explicit_dict:
                is_unlocked = perk_explicit_dict[p.id]
            else:
                is_unlocked = (p.character_id not in deactivated_char_ids) if p.character_id else True

            d["is_unlocked"] = bool(is_unlocked)
            d["is_general"] = bool(is_general)
            result.append(d)
        return result

    def set_perk_ownership(self, user_id: int, perk_id: int, is_unlocked: bool) -> Dict[str, Any]:
        perk = db.session.get(Perk, perk_id)
        if not perk:
            raise ValueError(f"Perk with ID {perk_id} not found.")

        record = db.session.scalars(
            select(UserPerkOwnership).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.perk_id == perk_id,
            )
        ).first()

        if not record:
            record = UserPerkOwnership(
                user_id=user_id,
                perk_id=perk_id,
                is_unlocked=is_unlocked,
            )
            db.session.add(record)
        else:
            record.is_unlocked = is_unlocked

        db.session.commit()
        return record.to_dict()

    def bulk_set_perk_ownership(self, user_id: int, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        updated_count = 0
        for item in updates:
            pid = item.get("perk_id")
            if not pid:
                continue
            is_unlocked = bool(item.get("is_unlocked", True))
            record = db.session.scalars(
                select(UserPerkOwnership).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.perk_id == int(pid),
                )
            ).first()

            if not record:
                record = UserPerkOwnership(
                    user_id=user_id,
                    perk_id=int(pid),
                    is_unlocked=is_unlocked,
                )
                db.session.add(record)
            else:
                record.is_unlocked = is_unlocked
            updated_count += 1

        db.session.commit()
        return {
            "user_id": user_id,
            "updated_count": updated_count,
            "summary": self.get_user_ownership_summary(user_id),
        }

    def get_owned_perk_names_set(self, user_id: Optional[int] = None) -> Set[str]:
        summary = self.get_user_ownership_summary(user_id)
        return set(summary.get("owned_perk_names", []))

    def get_owned_perk_ids_set(self, user_id: Optional[int] = None) -> Set[int]:
        summary = self.get_user_ownership_summary(user_id)
        return set(summary.get("owned_perk_ids", []))