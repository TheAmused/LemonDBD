import json
import uuid
import logging
from flask import current_app
from sqlalchemy import select
from app.core.extensions import db
from app.models import DraftSession
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)


class DraftService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = (db_service is None)
        self.db_service = db_service or DatabaseService()

    def _init_table(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS draft_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_code TEXT UNIQUE NOT NULL,
                phase TEXT NOT NULL DEFAULT 'bans' CHECK (phase IN ('bans', 'picks', 'complete')),
                banned_perks TEXT NOT NULL DEFAULT '[]',
                picked_survivor_perks TEXT NOT NULL DEFAULT '[]',
                picked_killer_perks TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        conn.close()

    def create_room(self, room_code=None):
        if not room_code:
            room_code = uuid.uuid4().hex[:6].upper()

        if self._use_sqlalchemy:
            try:
                if current_app:
                    existing = db.session.scalars(
                        select(DraftSession).where(DraftSession.room_code == room_code)
                    ).first()
                    if existing:
                        room_code = uuid.uuid4().hex[:6].upper()

                    ds = DraftSession(
                        room_code=room_code,
                        phase="bans",
                        banned_perks="[]",
                        picked_survivor_perks="[]",
                        picked_killer_perks="[]",
                    )
                    db.session.add(ds)
                    db.session.commit()
                    return ds.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy create_room fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM draft_sessions WHERE room_code = ?;", (room_code,))
        if cursor.fetchone():
            conn.close()
            # Generate new code if collision
            room_code = uuid.uuid4().hex[:6].upper()
            conn = self.db_service.get_connection()
            cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO draft_sessions (room_code, phase, banned_perks, picked_survivor_perks, picked_killer_perks)
            VALUES (?, 'bans', '[]', '[]', '[]');
        """, (room_code,))
        conn.commit()
        conn.close()
        return self.get_room(room_code)

    def get_room(self, room_code):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    ds = db.session.scalars(
                        select(DraftSession).where(DraftSession.room_code == room_code)
                    ).first()
                    return ds.to_dict() if ds else None
            except Exception as e:
                logger.debug(f"SQLAlchemy get_room fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM draft_sessions WHERE room_code = ?;", (room_code,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None

        data = dict(row)
        data["banned_perks"] = json.loads(data.get("banned_perks") or "[]")
        data["picked_survivor_perks"] = json.loads(data.get("picked_survivor_perks") or "[]")
        data["picked_killer_perks"] = json.loads(data.get("picked_killer_perks") or "[]")
        return data

    def process_action(self, room_code, action_data):
        room = self.get_room(room_code)
        if not room:
            raise ValueError(f"Draft room '{room_code}' not found.")

        action_type = action_data.get("action_type") or action_data.get("action")
        perk_name = action_data.get("perk_name") or action_data.get("perk")
        role = (action_data.get("role") or action_data.get("target_role") or "survivor").lower()
        new_phase = action_data.get("phase")

        banned_perks = list(room.get("banned_perks", []))
        picked_survivor_perks = list(room.get("picked_survivor_perks", []))
        picked_killer_perks = list(room.get("picked_killer_perks", []))
        current_phase = room.get("phase", "bans")

        if action_type == "ban":
            if perk_name and perk_name not in banned_perks:
                banned_perks.append(perk_name)
        elif action_type == "pick":
            if role == "killer":
                if perk_name and perk_name not in picked_killer_perks:
                    picked_killer_perks.append(perk_name)
            else:
                if perk_name and perk_name not in picked_survivor_perks:
                    picked_survivor_perks.append(perk_name)

        if new_phase in ("bans", "picks", "complete"):
            current_phase = new_phase

        if self._use_sqlalchemy:
            try:
                if current_app:
                    ds = db.session.scalars(
                        select(DraftSession).where(DraftSession.room_code == room_code)
                    ).first()
                    if ds:
                        ds.phase = current_phase
                        ds.banned_perks = json.dumps(banned_perks)
                        ds.picked_survivor_perks = json.dumps(picked_survivor_perks)
                        ds.picked_killer_perks = json.dumps(picked_killer_perks)
                        db.session.commit()
                        return ds.to_dict()
            except Exception as e:
                logger.debug(f"SQLAlchemy process_action fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE draft_sessions
            SET phase = ?, banned_perks = ?, picked_survivor_perks = ?, picked_killer_perks = ?, updated_at = CURRENT_TIMESTAMP
            WHERE room_code = ?;
        """, (current_phase, json.dumps(banned_perks), json.dumps(picked_survivor_perks), json.dumps(picked_killer_perks), room_code))
        conn.commit()
        conn.close()

        return self.get_room(room_code)
