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
        
        self.assertIn("user_settings", tables)
        self.assertIn("perk_rules", tables)
        self.assertIn("challenge_runs", tables)
        self.assertIn("match_logs", tables)
        
        # Verify default settings single row
        cursor.execute("SELECT checkpoint_interval FROM user_settings WHERE id=1;")
        row = cursor.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], 3)
        conn.close()

if __name__ == "__main__":
    unittest.main()
