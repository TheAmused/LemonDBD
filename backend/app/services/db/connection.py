# backend/app/services/db/connection.py
import os
import sqlite3
from typing import Optional


class MemConnectionWrapper:
    """Wrapper that prevents closing an in-memory SQLite database connection."""

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def cursor(self):
        return self._conn.cursor()

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def execute(self, *args, **kwargs):
        return self._conn.execute(*args, **kwargs)

    def executemany(self, *args, **kwargs):
        return self._conn.executemany(*args, **kwargs)

    def executescript(self, *args, **kwargs):
        return self._conn.executescript(*args, **kwargs)

    def close(self):
        # Kept open intentionally for in-memory persistence across test calls
        pass

    def __getattr__(self, name: str):
        return getattr(self._conn, name)


def create_sqlite_connection(db_path: str = ":memory:") -> sqlite3.Connection:
    """Create a configured SQLite connection with row factory enabled."""
    if db_path != ":memory:":
        dir_name = os.path.dirname(os.path.abspath(db_path))
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

