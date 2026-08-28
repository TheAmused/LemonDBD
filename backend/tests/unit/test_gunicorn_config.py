# backend/tests/unit/test_gunicorn_config.py
import importlib.util
import os
from pathlib import Path
from types import ModuleType
from unittest.mock import patch
import pytest


def load_gunicorn_config() -> ModuleType:
    config_path = Path(__file__).resolve().parent.parent.parent / "gunicorn.conf.py"
    spec = importlib.util.spec_from_file_location("gunicorn_config", config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.unit
class TestGunicornConfig:
    """Tests for production WSGI server Gunicorn configuration parameters and env overrides."""

    def test_default_gunicorn_settings(self) -> None:
        conf = load_gunicorn_config()
        assert conf.bind == "0.0.0.0:5000"
        assert conf.workers == 2
        assert conf.threads == 4
        assert conf.worker_class == "gthread"
        assert conf.worker_tmp_dir == "/dev/shm"
        assert conf.timeout == 60
        assert conf.keepalive == 5
        assert conf.preload_app is True
        assert conf.max_requests == 1000
        assert conf.max_requests_jitter == 100
        assert conf.accesslog == "-"
        assert conf.errorlog == "-"
        assert conf.loglevel == "info"

    @patch.dict(
        os.environ,
        {
            "GUNICORN_WORKERS": "4",
            "GUNICORN_THREADS": "8",
            "GUNICORN_TIMEOUT": "90",
            "GUNICORN_PRELOAD": "false",
            "GUNICORN_MAX_REQUESTS": "2000",
        },
    )
    def test_custom_gunicorn_env_vars(self) -> None:
        conf = load_gunicorn_config()
        assert conf.workers == 4
        assert conf.threads == 8
        assert conf.timeout == 90
        assert conf.preload_app is False
        assert conf.max_requests == 2000
