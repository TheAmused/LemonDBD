import os
import unittest
from app.services.db_service import DatabaseService

class TestDatabaseService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_lemon.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db = DatabaseService(db_path=self.db_path)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

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
