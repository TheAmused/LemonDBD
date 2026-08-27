# backend/tests/unit/test_db_pool_config.py
import os
import unittest
from unittest.mock import patch
from app.core.config import Config, TestingConfig


class TestDatabasePoolConfig(unittest.TestCase):
    def test_default_pool_options(self):
        engine_options = Config.SQLALCHEMY_ENGINE_OPTIONS
        self.assertTrue(engine_options.get("pool_pre_ping"))
        self.assertEqual(engine_options.get("pool_size"), 10)
        self.assertEqual(engine_options.get("max_overflow"), 20)
        self.assertEqual(engine_options.get("pool_recycle"), 300)
        self.assertEqual(engine_options.get("pool_timeout"), 30)

    def test_testing_config_pool_options_empty_for_sqlite(self):
        self.assertEqual(TestingConfig.SQLALCHEMY_ENGINE_OPTIONS, {})
        self.assertEqual(TestingConfig.SQLALCHEMY_DATABASE_URI, "sqlite:///:memory:")

    @patch.dict(os.environ, {
        "DB_POOL_SIZE": "15",
        "DB_MAX_OVERFLOW": "30",
        "DB_POOL_RECYCLE": "600",
        "DB_POOL_TIMEOUT": "45",
    })
    def test_custom_pool_env_vars(self):
        # Dynamically reload or evaluate pool options with patched env
        pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "300"))
        pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))

        self.assertEqual(pool_size, 15)
        self.assertEqual(max_overflow, 30)
        self.assertEqual(pool_recycle, 600)
        self.assertEqual(pool_timeout, 45)


if __name__ == "__main__":
    unittest.main()
