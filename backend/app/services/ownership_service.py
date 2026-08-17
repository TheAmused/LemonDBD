import logging
from typing import Optional, Dict, Any, List, Union
from sqlalchemy import select, and_, delete, func
from app.extensions import db
from app.models import User, UserCharacterOwnership, UserPerkOwnership, Character, Perk

logger = logging.getLogger(__name__)


class OwnershipService:
    def get_user_characters(
        self,
        user_id: int,
        role: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of all characters with the user's ownership boolean status.
        If no ownership record exists for a character, is_owned defaults to True.
        """
        # Query characters
        stmt = select(Character)
        if role and role.lower() != "all":
            clean_role = "Survivor" if role.lower() == "survivor" else "Killer"
            stmt = stmt.where(Character.role == clean_role)
        stmt = stmt.order_by(Character.release_number.asc(), Character.id.asc())
        characters = db.session.scalars(stmt).all()

        # Query user ownership records
        user_ownership_stmt = select(UserCharacterOwnership).where(
            UserCharacterOwnership.user_id == user_id
        )
        ownership_records = db.session.scalars(user_ownership_stmt).all()
        ownership_map = {r.character_id: r.is_owned for r in ownership_records}

        results = []
        for c in characters:
            is_owned = ownership_map.get(c.id, True)
            results.append({
                "character_id": c.id,
                "name": c.name,
                "role": c.role,
                "code_prefix": c.code_prefix,
                "release_number": c.release_number,
                "portrait_url": c.portrait_url,
                "is_owned": is_owned,
            })
        return results

    def set_character_ownership(
        self,
        user_id: int,
        character_id: int,
        is_owned: bool
    ) -> Dict[str, Any]:
        """
        Set ownership for a single character.
        If is_owned is True, automatically mark all unique teachable perks
        associated with this character as unlocked (is_unlocked = True).
        If is_owned is False, automatically mark all unique teachable perks
        associated with this character as locked (is_unlocked = False).
        """
        char = db.session.get(Character, character_id)
        if not char:
            raise ValueError(f"Character with ID {character_id} not found.")

        record = db.session.scalars(
            select(UserCharacterOwnership).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.character_id == character_id
            )
        ).first()

        if record:
            record.is_owned = is_owned
        else:
            record = UserCharacterOwnership(
                user_id=user_id,
                character_id=character_id,
                is_owned=is_owned
            )
            db.session.add(record)

        # Automatic teachable perk unlock/lock cascade
        auto_updated_perk_ids = self._cascade_perk_lock_state(user_id, character_id, is_unlocked=is_owned)

        db.session.commit()

        result = {
            "user_id": user_id,
            "character_id": character_id,
            "character_name": char.name,
            "is_owned": is_owned,
        }
        if is_owned:
            result["auto_unlocked_teachable_perks_count"] = len(auto_updated_perk_ids)
            result["auto_unlocked_perk_ids"] = auto_updated_perk_ids
        else:
            result["auto_locked_teachable_perks_count"] = len(auto_updated_perk_ids)
            result["auto_locked_perk_ids"] = auto_updated_perk_ids
        return result

    def _cascade_perk_lock_state(self, user_id: int, character_id: int, is_unlocked: bool) -> List[int]:
        """Set is_unlocked for every teachable perk of a character, creating records as needed."""
        teachable_perks = db.session.scalars(
            select(Perk).where(Perk.character_id == character_id)
        ).all()

        updated_perk_ids = []
        for perk in teachable_perks:
            perk_record = db.session.scalars(
                select(UserPerkOwnership).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.perk_id == perk.id
                )
            ).first()

            if perk_record:
                perk_record.is_unlocked = is_unlocked
            else:
                perk_record = UserPerkOwnership(
                    user_id=user_id,
                    perk_id=perk.id,
                    is_unlocked=is_unlocked
                )
                db.session.add(perk_record)
            updated_perk_ids.append(perk.id)

        return updated_perk_ids

    def bulk_set_character_ownership(
        self,
        user_id: int,
        updates: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Bulk update character ownerships.
        updates: list of {"character_id": int, "is_owned": bool}
        """
        updated_count = 0
        all_auto_unlocked_perks = []
        all_auto_locked_perks = []

        for item in updates:
            char_id = item.get("character_id")
            is_owned = bool(item.get("is_owned", True))
            if not char_id:
                continue

            char = db.session.get(Character, char_id)
            if not char:
                continue

            record = db.session.scalars(
                select(UserCharacterOwnership).where(
                    UserCharacterOwnership.user_id == user_id,
                    UserCharacterOwnership.character_id == char_id
                )
            ).first()

            if record:
                record.is_owned = is_owned
            else:
                record = UserCharacterOwnership(
                    user_id=user_id,
                    character_id=char_id,
                    is_owned=is_owned
                )
                db.session.add(record)

            updated_perk_ids = self._cascade_perk_lock_state(user_id, char_id, is_unlocked=is_owned)
            if is_owned:
                all_auto_unlocked_perks.extend(updated_perk_ids)
            else:
                all_auto_locked_perks.extend(updated_perk_ids)

            updated_count += 1

        db.session.commit()

        return {
            "user_id": user_id,
            "characters_updated_count": updated_count,
            "auto_unlocked_perks_count": len(all_auto_unlocked_perks),
            "auto_locked_perks_count": len(all_auto_locked_perks),
        }

    def get_user_perks(
        self,
        user_id: int,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of all perks with the user's unlock boolean status.
        If no ownership record exists for a perk, is_unlocked defaults to True.
        """
        stmt = select(Perk)
        if category and category.lower() != "all":
            stmt = stmt.where(Perk.category.ilike(category))
        stmt = stmt.order_by(Perk.name.asc())
        perks = db.session.scalars(stmt).all()

        user_perk_stmt = select(UserPerkOwnership).where(
            UserPerkOwnership.user_id == user_id
        )
        perk_records = db.session.scalars(user_perk_stmt).all()
        perk_map = {r.perk_id: r.is_unlocked for r in perk_records}

        results = []
        for p in perks:
            is_unlocked = perk_map.get(p.id, True)
            results.append({
                "perk_id": p.id,
                "name": p.name,
                "category": p.category,
                "is_teachable": p.is_teachable,
                "character_id": p.character_id,
                "character_name": p.character.name if p.character else None,
                "icon_url": p.icon_url,
                "icon_local_path": p.icon_local_path,
                "is_unlocked": is_unlocked,
            })
        return results

    def set_perk_ownership(
        self,
        user_id: int,
        perk_id: int,
        is_unlocked: bool
    ) -> Dict[str, Any]:
        """Set unlock status for an individual perk."""
        perk = db.session.get(Perk, perk_id)
        if not perk:
            raise ValueError(f"Perk with ID {perk_id} not found.")

        record = db.session.scalars(
            select(UserPerkOwnership).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.perk_id == perk_id
            )
        ).first()

        if record:
            record.is_unlocked = is_unlocked
        else:
            record = UserPerkOwnership(
                user_id=user_id,
                perk_id=perk_id,
                is_unlocked=is_unlocked
            )
            db.session.add(record)

        db.session.commit()

        return {
            "user_id": user_id,
            "perk_id": perk_id,
            "perk_name": perk.name,
            "is_unlocked": is_unlocked,
        }

    def bulk_set_perk_ownership(
        self,
        user_id: int,
        updates: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Bulk update perk unlock statuses.
        updates: list of {"perk_id": int, "is_unlocked": bool}
        """
        updated_count = 0
        for item in updates:
            perk_id = item.get("perk_id")
            is_unlocked = bool(item.get("is_unlocked", True))
            if not perk_id:
                continue

            perk = db.session.get(Perk, perk_id)
            if not perk:
                continue

            record = db.session.scalars(
                select(UserPerkOwnership).where(
                    UserPerkOwnership.user_id == user_id,
                    UserPerkOwnership.perk_id == perk_id
                )
            ).first()

            if record:
                record.is_unlocked = is_unlocked
            else:
                record = UserPerkOwnership(
                    user_id=user_id,
                    perk_id=perk_id,
                    is_unlocked=is_unlocked
                )
                db.session.add(record)

            updated_count += 1

        db.session.commit()

        return {
            "user_id": user_id,
            "perks_updated_count": updated_count,
        }

    def get_user_ownership_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Get high-level summary metrics of owned characters and unlocked perks.
        Characters/perks with no explicit ownership record default to
        owned/unlocked, so "owned"/"unlocked" counts are total minus
        explicit False records rather than a count of explicit True records.
        """
        total_survivors = db.session.scalar(
            select(func.count(Character.id)).where(Character.role == "Survivor")
        ) or 0
        locked_survivors = db.session.scalar(
            select(func.count(UserCharacterOwnership.id)).join(Character, UserCharacterOwnership.character_id == Character.id).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.is_owned.is_(False),
                Character.role == "Survivor"
            )
        ) or 0
        owned_survivors = total_survivors - locked_survivors

        total_killers = db.session.scalar(
            select(func.count(Character.id)).where(Character.role == "Killer")
        ) or 0
        locked_killers = db.session.scalar(
            select(func.count(UserCharacterOwnership.id)).join(Character, UserCharacterOwnership.character_id == Character.id).where(
                UserCharacterOwnership.user_id == user_id,
                UserCharacterOwnership.is_owned.is_(False),
                Character.role == "Killer"
            )
        ) or 0
        owned_killers = total_killers - locked_killers

        total_perks = db.session.scalar(select(func.count(Perk.id))) or 0
        locked_perks = db.session.scalar(
            select(func.count(UserPerkOwnership.id)).where(
                UserPerkOwnership.user_id == user_id,
                UserPerkOwnership.is_unlocked.is_(False)
            )
        ) or 0
        unlocked_perks = total_perks - locked_perks

        return {
            "user_id": user_id,
            "survivors": {
                "owned": owned_survivors,
                "total": total_survivors,
                "percentage": round((owned_survivors / total_survivors * 100), 1) if total_survivors > 0 else 0.0,
            },
            "killers": {
                "owned": owned_killers,
                "total": total_killers,
                "percentage": round((owned_killers / total_killers * 100), 1) if total_killers > 0 else 0.0,
            },
            "perks": {
                "unlocked": unlocked_perks,
                "total": total_perks,
                "percentage": round((unlocked_perks / total_perks * 100), 1) if total_perks > 0 else 0.0,
            },
        }
