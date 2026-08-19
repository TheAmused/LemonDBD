# backend/app/services/db/maintenance.py
from typing import Dict, Optional, Set
from flask import current_app
from sqlalchemy import select
from app.core.extensions import db
from app.models import GauntletRun, PageStreakRun


def prune_stale_character_rows(valid_names: Optional[Set[str]], get_conn_fn) -> Dict[str, int]:
    """Delete run rows pinned to characters that no longer exist."""
    names = {str(n) for n in (valid_names or set())}
    if not names:
        return {}

    deleted: Dict[str, int] = {}
    try:
        if current_app:
            # SQLAlchemy ORM deletion
            stale_cr = db.session.scalars(
                select(GauntletRun).where(~GauntletRun.current_character_id.in_(names))
            ).all()
            deleted["gauntlet_runs"] = len(stale_cr)
            for cr in stale_cr:
                db.session.delete(cr)

            stale_psr = db.session.scalars(
                select(PageStreakRun).where(~PageStreakRun.killer.in_(names))
            ).all()
            deleted["page_streak_runs"] = len(stale_psr)
            for psr in stale_psr:
                db.session.delete(psr)

            db.session.commit()
            return deleted
    except Exception:
        pass

    # Fallback to direct SQLite connection
    conn = get_conn_fn()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    for table, column in (("gauntlet_runs", "current_character_id"), ("page_streak_runs", "killer")):
        cursor.execute(f"SELECT id, {column} AS character_name FROM {table};")
        stale = [row["id"] for row in cursor.fetchall() if row["character_name"] not in names]
        if stale:
            placeholders = ",".join("?" for _ in stale)
            cursor.execute(f"DELETE FROM {table} WHERE id IN ({placeholders});", stale)
        deleted[table] = len(stale)

    conn.commit()
    if conn != getattr(get_conn_fn, "_mem_conn", None):
        conn.close()

    return deleted

