# backend/app/services/others/quest_service.py
import logging
from flask import current_app
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import DailyQuest
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)

DEFAULT_QUESTS = [
    {
        "title": "Escape 2 Trials",
        "description": "Escape successfully as a survivor 2 times.",
        "category": "daily",
        "goal": 2,
        "xp_reward": 500
    },
    {
        "title": "Sacrifice 3 Survivors",
        "description": "Hook and sacrifice 3 survivors as killer.",
        "category": "daily",
        "goal": 3,
        "xp_reward": 500
    },
    {
        "title": "Complete 5 Generator Skill Checks",
        "description": "Succeed at 5 skill checks while repairing.",
        "category": "daily",
        "goal": 5,
        "xp_reward": 500
    },
    {
        "title": "Master of the Realm",
        "description": "Win 10 matches in any role.",
        "category": "weekly",
        "goal": 10,
        "xp_reward": 2500
    }
]


class QuestService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def _init_table(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_quests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('daily', 'weekly')),
                progress INTEGER NOT NULL DEFAULT 0,
                goal INTEGER NOT NULL DEFAULT 1,
                xp_reward INTEGER NOT NULL DEFAULT 500,
                is_completed BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        conn.close()

    def seed_quests_if_empty(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    count = db.session.scalar(select(func.count(DailyQuest.id))) or 0
                    if count == 0:
                        for q in DEFAULT_QUESTS:
                            db.session.add(
                                DailyQuest(
                                    title=q["title"],
                                    description=q["description"],
                                    category=q["category"],
                                    progress=0,
                                    goal=q["goal"],
                                    xp_reward=q["xp_reward"],
                                    is_completed=False,
                                )
                            )
                        db.session.commit()
                    return
            except Exception as e:
                logger.debug(f"SQLAlchemy seed_quests_if_empty fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM daily_quests;")
        row = cursor.fetchone()
        count = row["count"] if row else 0
        if count == 0:
            for q in DEFAULT_QUESTS:
                cursor.execute("""
                    INSERT INTO daily_quests (title, description, category, progress, goal, xp_reward, is_completed)
                    VALUES (?, ?, ?, 0, ?, ?, 0);
                """, (q["title"], q["description"], q["category"], q["goal"], q["xp_reward"]))
            conn.commit()
        conn.close()

    def get_quests(self):
        self.seed_quests_if_empty()
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(DailyQuest).order_by(DailyQuest.id.asc())
                    rows = db.session.scalars(stmt).all()
                    return [r.to_dict() for r in rows]
            except Exception as e:
                logger.debug(f"SQLAlchemy get_quests fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM daily_quests ORDER BY id ASC;")
        rows = cursor.fetchall()
        conn.close()

        quests = []
        for r in rows:
            q = dict(r)
            q["is_completed"] = bool(q["is_completed"])
            quests.append(q)
        return quests

    def claim_quest(self, quest_id):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    q = db.session.get(DailyQuest, int(quest_id))
                    if not q:
                        raise ValueError(f"Quest with ID {quest_id} not found.")
                    if q.is_completed:
                        raise ValueError(f"Quest with ID {quest_id} is already completed.")
                    q.is_completed = True
                    q.progress = q.goal
                    db.session.commit()
                    return {"quest": q.to_dict(), "xp_reward": q.xp_reward}
            except Exception as e:
                logger.debug(f"SQLAlchemy claim_quest fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM daily_quests WHERE id = ?;", (quest_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Quest with ID {quest_id} not found.")

        quest = dict(row)
        if bool(quest["is_completed"]):
            conn.close()
            raise ValueError(f"Quest with ID {quest_id} is already completed.")

        cursor.execute("""
            UPDATE daily_quests
            SET is_completed = 1, progress = goal
            WHERE id = ?;
        """, (quest_id,))
        conn.commit()

        cursor.execute("SELECT * FROM daily_quests WHERE id = ?;", (quest_id,))
        updated_row = dict(cursor.fetchone())
        updated_row["is_completed"] = bool(updated_row["is_completed"])
        conn.close()

        return {
            "quest": updated_row,
            "xp_reward": updated_row["xp_reward"]
        }
