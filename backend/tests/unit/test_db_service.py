# backend/tests/unit/test_db_service.py
import gc
import tempfile
import unittest
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService


@pytest.mark.unit
class TestDatabaseService(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_lemon.db")
        self.db = DatabaseService(db_path=self.db_path)

    def tearDown(self):
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_init_db_creates_tables_and_default_records(self):
        self.db.init_db()
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        self.assertIn("perk_rules", tables)
        self.assertIn("gauntlet_runs", tables)
        self.assertIn("gauntlet_match_logs", tables)
        conn.close()


if __name__ == "__main__":
    unittest.main()
