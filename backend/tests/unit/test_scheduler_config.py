# backend/tests/unit/test_scheduler_config.py
import unittest
from unittest.mock import MagicMock, patch
import pytest
from app import create_app
from app.core.config import Config, TestingConfig


@pytest.mark.unit
class TestSchedulerConfig(unittest.TestCase):
    def test_testing_config_disables_scheduler(self):
        self.assertFalse(TestingConfig.SCHEDULER_ENABLED)
        self.assertTrue(TestingConfig.TESTING)

    def test_default_config_has_scheduler_enabled(self):
        self.assertTrue(Config.SCHEDULER_ENABLED)

    @patch("app.BackgroundScheduler")
    def test_scheduler_initialization_when_enabled(self, mock_scheduler_cls):
        mock_instance = MagicMock()
        mock_scheduler_cls.return_value = mock_instance

        class CustomConfig(TestingConfig):
            TESTING = False
            SCHEDULER_ENABLED = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

        create_app(CustomConfig)
        self.assertTrue(mock_scheduler_cls.called)
        self.assertTrue(mock_instance.add_job.called)
        self.assertTrue(mock_instance.start.called)

    @patch("app.BackgroundScheduler")
    def test_scheduler_not_initialized_when_disabled(self, mock_scheduler_cls):
        class DisabledConfig(TestingConfig):
            TESTING = False
            SCHEDULER_ENABLED = False
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

        create_app(DisabledConfig)
        self.assertFalse(mock_scheduler_cls.called)


if __name__ == "__main__":
    unittest.main()
