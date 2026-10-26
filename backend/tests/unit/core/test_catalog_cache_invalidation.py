from flask import Flask
from app.core.http_cache import _is_personal
from app.core.redis_cache import bump_catalog_version, catalog_version
from app.core.security import SESSION_COOKIE_NAME


def test_is_personal_detects_lemondbd_session():
    app = Flask(__name__)
    with app.test_request_context("/", headers={"Cookie": f"{SESSION_COOKIE_NAME}=xyz123"}):
        assert _is_personal() is True


def test_bump_catalog_version_increments_when_redis_none(monkeypatch):
    from app.core import redis_cache
    monkeypatch.setattr(redis_cache, "get_client", lambda: None)
    v1 = catalog_version()
    bump_catalog_version()
    v2 = catalog_version()
    assert v2 > v1
