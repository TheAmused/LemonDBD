# backend/tests/unit/test_readiness_and_logging.py
"""/api/v1/readyz checks the database and the rate-limit Redis; every response carries a request
id; LOG_LEVEL / LOG_FORMAT shape the process's log output."""
import json
import logging

import pytest
from sqlalchemy.exc import OperationalError

from app.core import logging_setup, redis_cache


@pytest.mark.unit
class TestReadiness:
    def test_ready_with_a_working_database(self, client, monkeypatch) -> None:
        monkeypatch.setattr(redis_cache, "readiness", lambda: {"cache": "off", "limits": "off"})
        res = client.get("/api/v1/readyz")
        assert res.status_code == 200
        assert res.get_json() == {"status": "ready", "checks": {"database": "up", "cache": "off", "limits": "off"}}
        assert res.headers["Cache-Control"] == "no-store"

    def test_unavailable_when_the_database_is_down(self, client, monkeypatch) -> None:
        from app.core.extensions import db

        def broken(*_a, **_k):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

        monkeypatch.setattr(redis_cache, "readiness", lambda: {"cache": "up", "limits": "up"})
        monkeypatch.setattr(db.session, "execute", broken)
        res = client.get("/api/v1/readyz")
        assert res.status_code == 503
        assert res.get_json()["checks"]["database"] == "down"

    def test_unavailable_when_the_limits_redis_is_down(self, client, monkeypatch) -> None:
        monkeypatch.setattr(redis_cache, "readiness", lambda: {"cache": "up", "limits": "down"})
        assert client.get("/api/v1/readyz").status_code == 503

    def test_a_missing_cache_redis_is_only_reported(self, client, monkeypatch) -> None:
        monkeypatch.setattr(redis_cache, "readiness", lambda: {"cache": "down", "limits": "up"})
        assert client.get("/api/v1/readyz").status_code == 200

    def test_unconfigured_redis_is_off(self, monkeypatch) -> None:
        monkeypatch.delenv("REDIS_URL", raising=False)
        monkeypatch.delenv("LIMITS_REDIS_URL", raising=False)
        assert redis_cache.readiness() == {"cache": "off", "limits": "off"}


@pytest.mark.unit
class TestRequestIds:
    def test_a_fresh_id_is_echoed(self, client) -> None:
        rid = client.get("/api/v1/health").headers["X-Request-ID"]
        assert len(rid) == 32

    def test_nginx_id_is_kept(self, client) -> None:
        res = client.get("/api/v1/health", headers={"X-Request-ID": "0123456789abcdef0123"})
        assert res.headers["X-Request-ID"] == "0123456789abcdef0123"

    @pytest.mark.parametrize("bad", ["short", "has spaces in it!", "x" * 300, "<script>alert(1)</script>"])
    def test_odd_ids_are_replaced(self, client, bad: str) -> None:
        assert client.get("/api/v1/health", headers={"X-Request-ID": bad}).headers["X-Request-ID"] != bad


@pytest.mark.unit
class TestLogFormat:
    def _record(self, **extra) -> logging.LogRecord:
        record = logging.LogRecord("app.test", logging.WARNING, __file__, 1, "hello %s", ("world",), None)
        for key, value in extra.items():
            setattr(record, key, value)
        return record

    def test_json_lines(self) -> None:
        line = json.loads(logging_setup.JsonFormatter().format(self._record(request_id="abc")))
        assert line["message"] == "hello world"
        assert line["level"] == "WARNING"
        assert line["request_id"] == "abc"
        assert line["logger"] == "app.test"

    def test_the_filter_marks_records_outside_a_request(self) -> None:
        record = self._record()
        logging_setup.RequestIdFilter().filter(record)
        assert record.request_id == "-"

    @pytest.mark.parametrize("value,level", [("DEBUG", logging.DEBUG), ("warning", logging.WARNING), ("nonsense", logging.INFO), ("", logging.INFO)])
    def test_log_level_from_env(self, monkeypatch, value: str, level: int) -> None:
        monkeypatch.setenv("LOG_LEVEL", value)
        assert logging_setup.log_level() == level

    def test_an_existing_configuration_is_left_alone(self, monkeypatch) -> None:
        root = logging.getLogger()
        before = list(root.handlers)
        monkeypatch.setattr(root, "handlers", before or [logging.NullHandler()])
        logging_setup.configure_logging()
        assert all(not getattr(h, "_lemondbd_handler", False) for h in root.handlers)

    def test_installs_its_handler_once(self, monkeypatch) -> None:
        root = logging.getLogger()
        monkeypatch.setattr(root, "handlers", [])
        monkeypatch.setattr(root, "level", root.level)
        monkeypatch.setenv("LOG_FORMAT", "json")
        logging_setup.configure_logging()
        logging_setup.configure_logging()
        ours = [h for h in root.handlers if getattr(h, "_lemondbd_handler", False)]
        assert len(ours) == 1
        assert isinstance(ours[0].formatter, logging_setup.JsonFormatter)
