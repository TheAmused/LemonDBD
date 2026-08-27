# backend/tests/unit/test_gunicorn_config.py
import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch


def load_gunicorn_config():
    config_path = Path(__file__).resolve().parent.parent.parent / "gunicorn.conf.py"
    spec = importlib.util.spec_from_file_location("gunicorn_config", config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestGunicornConfig(unittest.TestCase):
    def test_default_gunicorn_settings(self):
        conf = load_gunicorn_config()
        self.assertEqual(conf.bind, "0.0.0.0:5000")
        self.assertEqual(conf.workers, 2)
        self.assertEqual(conf.threads, 4)
        self.assertEqual(conf.worker_class, "gthread")
        self.assertEqual(conf.worker_tmp_dir, "/dev/shm")
        self.assertEqual(conf.timeout, 60)
        self.assertEqual(conf.keepalive, 5)
        self.assertTrue(conf.preload_app)
        self.assertEqual(conf.max_requests, 1000)
        self.assertEqual(conf.max_requests_jitter, 100)
        self.assertEqual(conf.accesslog, "-")
        self.assertEqual(conf.errorlog, "-")
        self.assertEqual(conf.loglevel, "info")

    @patch.dict(os.environ, {
        "GUNICORN_WORKERS": "4",
        "GUNICORN_THREADS": "8",
        "GUNICORN_TIMEOUT": "90",
        "GUNICORN_PRELOAD": "false",
        "GUNICORN_MAX_REQUESTS": "2000",
    })
    def test_custom_gunicorn_env_vars(self):
        conf = load_gunicorn_config()
        self.assertEqual(conf.workers, 4)
        self.assertEqual(conf.threads, 8)
        self.assertEqual(conf.timeout, 90)
        self.assertFalse(conf.preload_app)
        self.assertEqual(conf.max_requests, 2000)


if __name__ == "__main__":
    unittest.main()
