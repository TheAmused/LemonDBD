# backend/tests/unit/test_scheduler_config.py
from unittest.mock import MagicMock, patch
import pytest
from app import create_app
from app.core.config import Config, TestingConfig


@pytest.mark.unit
class TestSchedulerConfig:
    """Tests for BackgroundScheduler activation gating across environments."""

    def test_testing_config_disables_scheduler(self) -> None:
        assert TestingConfig.SCHEDULER_ENABLED is False
        assert TestingConfig.TESTING is True

    def test_default_config_has_scheduler_enabled(self) -> None:
        assert Config.SCHEDULER_ENABLED is True

    @patch("app.BackgroundScheduler")
    def test_scheduler_initialization_when_enabled(self, mock_scheduler_cls: MagicMock) -> None:
        mock_instance = MagicMock()
        mock_scheduler_cls.return_value = mock_instance

        class CustomConfig(TestingConfig):
            TESTING = False
            SCHEDULER_ENABLED = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

        create_app(CustomConfig)
        assert mock_scheduler_cls.called is True
        assert mock_instance.add_job.called is True
        assert mock_instance.start.called is True

    @patch("app.BackgroundScheduler")
    def test_scheduler_not_initialized_when_disabled(self, mock_scheduler_cls: MagicMock) -> None:
        class DisabledConfig(TestingConfig):
            TESTING = False
            SCHEDULER_ENABLED = False
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

        create_app(DisabledConfig)
        assert mock_scheduler_cls.called is False
