import logging
from flask import current_app
from sqlalchemy import select
from app.extensions import db
from app.models import GuesserStat
from app.services.db_service import DatabaseService

logger = logging.getLogger(__name__)


class GuesserService:
    def __init__(self, db_service=None):
        self._use_sqlalchemy = (db_service is None)
        self.db_service = db_service or DatabaseService()

    def get_all_stats(self):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stmt = select(GuesserStat)
                    rows = db.session.scalars(stmt).all()
                    return {
                        r.guesser_type: {
                            "guesser_type": r.guesser_type,
                            "current_streak": r.current_streak,
                            "best_streak": r.best_streak,
                            "total_guesses": r.total_guesses,
                            "correct_guesses": r.correct_guesses,
                        }
                        for r in rows
                    }
            except Exception as e:
                logger.debug(f"SQLAlchemy get_all_stats fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM guesser_stats;")
        rows = cursor.fetchall()
        conn.close()
        
        res = {}
        for r in rows:
            res[r["guesser_type"]] = {
                "guesser_type": r["guesser_type"],
                "current_streak": r["current_streak"],
                "best_streak": r["best_streak"],
                "total_guesses": r["total_guesses"],
                "correct_guesses": r["correct_guesses"]
            }
        return res

    def update_stats(self, guesser_type: str, is_correct: bool):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stat = db.session.scalars(
                        select(GuesserStat).where(GuesserStat.guesser_type == guesser_type)
                    ).first()
                    if not stat:
                        stat = GuesserStat(guesser_type=guesser_type)
                        db.session.add(stat)

                    curr_streak = stat.current_streak
                    best_streak = stat.best_streak
                    total_guesses = stat.total_guesses + 1
                    correct_guesses = stat.correct_guesses

                    if is_correct:
                        curr_streak += 1
                        correct_guesses += 1
                        if curr_streak > best_streak:
                            best_streak = curr_streak
                    else:
                        curr_streak = 0

                    stat.current_streak = curr_streak
                    stat.best_streak = best_streak
                    stat.total_guesses = total_guesses
                    stat.correct_guesses = correct_guesses
                    db.session.commit()

                    return {
                        "guesser_type": guesser_type,
                        "current_streak": curr_streak,
                        "best_streak": best_streak,
                        "total_guesses": total_guesses,
                        "correct_guesses": correct_guesses,
                    }
            except Exception as e:
                logger.debug(f"SQLAlchemy update_stats fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        
        # Check if type exists
        cursor.execute("SELECT * FROM guesser_stats WHERE guesser_type = ?;", (guesser_type,))
        row = cursor.fetchone()
        
        if not row:
            cursor.execute("""
                INSERT INTO guesser_stats (guesser_type, current_streak, best_streak, total_guesses, correct_guesses)
                VALUES (?, 0, 0, 0, 0);
            """, (guesser_type,))
            conn.commit()
            cursor.execute("SELECT * FROM guesser_stats WHERE guesser_type = ?;", (guesser_type,))
            row = cursor.fetchone()

        stats = dict(row)
        curr_streak = stats["current_streak"]
        best_streak = stats["best_streak"]
        total_guesses = stats["total_guesses"] + 1
        correct_guesses = stats["correct_guesses"]

        if is_correct:
            curr_streak += 1
            correct_guesses += 1
            if curr_streak > best_streak:
                best_streak = curr_streak
        else:
            curr_streak = 0

        cursor.execute("""
            UPDATE guesser_stats
            SET current_streak = ?, best_streak = ?, total_guesses = ?, correct_guesses = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guesser_type = ?;
        """, (curr_streak, best_streak, total_guesses, correct_guesses, guesser_type))
        conn.commit()
        conn.close()

        return {
            "guesser_type": guesser_type,
            "current_streak": curr_streak,
            "best_streak": best_streak,
            "total_guesses": total_guesses,
            "correct_guesses": correct_guesses
        }

    def reset_streak(self, guesser_type: str):
        if self._use_sqlalchemy:
            try:
                if current_app:
                    stat = db.session.scalars(
                        select(GuesserStat).where(GuesserStat.guesser_type == guesser_type)
                    ).first()
                    if stat:
                        stat.current_streak = 0
                        db.session.commit()
                        return {
                            "guesser_type": guesser_type,
                            "current_streak": 0,
                            "best_streak": stat.best_streak,
                            "total_guesses": stat.total_guesses,
                            "correct_guesses": stat.correct_guesses,
                        }
            except Exception as e:
                logger.debug(f"SQLAlchemy reset_streak fallback: {e}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE guesser_stats
            SET current_streak = 0, updated_at = CURRENT_TIMESTAMP
            WHERE guesser_type = ?;
        """, (guesser_type,))
        conn.commit()
        
        cursor.execute("SELECT * FROM guesser_stats WHERE guesser_type = ?;", (guesser_type,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return {
            "guesser_type": guesser_type,
            "current_streak": 0,
            "best_streak": 0,
            "total_guesses": 0,
            "correct_guesses": 0
        }
