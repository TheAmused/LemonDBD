# backend/tests/unit/test_db_pool_config.py
import os
import pytest
from unittest.mock import patch
from app.core.config import Config, TestingConfig


@pytest.mark.unit
class TestDatabasePoolConfig:
    """Tests for SQLAlchemy connection pool environment variables and configuration objects."""

    def test_default_production_pool_options(self) -> None:
        engine_options = Config.SQLALCHEMY_ENGINE_OPTIONS
        assert engine_options.get("pool_pre_ping") is True
        assert engine_options.get("pool_size") == 10
        assert engine_options.get("max_overflow") == 20
        assert engine_options.get("pool_recycle") == 300
        assert engine_options.get("pool_timeout") == 30

    def test_testing_config_pool_options_empty_for_in_memory_sqlite(self) -> None:
        assert TestingConfig.SQLALCHEMY_ENGINE_OPTIONS == {}
        assert TestingConfig.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"

    @patch.dict(
        os.environ,
        {
            "DB_POOL_SIZE": "15",
            "DB_MAX_OVERFLOW": "30",
            "DB_POOL_RECYCLE": "600",
            "DB_POOL_TIMEOUT": "45",
        },
    )
    def test_custom_pool_env_vars_parsed_as_integers(self) -> None:
        pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "300"))
        pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))

        assert pool_size == 15
        assert max_overflow == 30
        assert pool_recycle == 600
        assert pool_timeout == 45

    @pytest.mark.parametrize(
        "var_name, default_val",
        [
            ("DB_POOL_SIZE", 10),
            ("DB_MAX_OVERFLOW", 20),
            ("DB_POOL_RECYCLE", 300),
            ("DB_POOL_TIMEOUT", 30),
        ],
    )
    def test_missing_env_vars_fall_back_to_defaults(self, var_name: str, default_val: int) -> None:
        with patch.dict(os.environ, {}, clear=True):
            val = int(os.getenv(var_name, str(default_val)))
            assert val == default_val
