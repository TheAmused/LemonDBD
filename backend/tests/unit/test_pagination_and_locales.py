# backend/tests/unit/test_pagination_and_locales.py
"""Shared request-parsing and locale-constant helpers."""

import pytest
from flask import Flask

from app.models.smash_or_pass import TRANSLATABLE_LOCALES as MODEL_TRANSLATABLE
from app.services.db._common import parse_datetime
from app.utils import lang
from app.utils.pagination import paginate_args


@pytest.fixture
def app_ctx():
    app = Flask(__name__)
    return app


def _args(app, qs, **kw):
    with app.test_request_context("/x?" + qs):
        return paginate_args(**kw)


@pytest.mark.parametrize(
    "qs,kw,expected",
    [
        ("", {}, (1, 20)),
        ("page=3&per_page=7", {}, (3, 7)),
        ("page=abc&per_page=xyz", {}, (1, 20)),
        ("page=0&per_page=0", {}, (1, 1)),
        ("page=-5&per_page=-5", {}, (1, 1)),
        ("per_page=100000", {}, (1, 100)),
        ("per_page=100000", {"max_per_page": 50}, (1, 50)),
        ("", {"default_per_page": 25}, (1, 25)),
        ("limit=9&page=2", {"per_page_arg": "limit"}, (2, 9)),
        ("limit=99999", {"per_page_arg": "limit", "max_per_page": 10000}, (1, 10000)),
    ],
)
def test_paginate_args(app_ctx, qs, kw, expected):
    assert _args(app_ctx, qs, **kw) == expected


def test_paginate_args_strict(app_ctx):
    assert _args(app_ctx, "page=2&per_page=5", strict=True) == (2, 5)
    assert _args(app_ctx, "page=x", strict=True) == (1, 20)
    for qs in ("page=0", "per_page=0", "per_page=-1"):
        with pytest.raises(ValueError):
            _args(app_ctx, qs, strict=True)


def test_parse_datetime_superset():
    from datetime import datetime, timezone

    now = datetime(2026, 1, 2, 3, 4, 5)
    assert parse_datetime(now) is now
    assert parse_datetime("2026-01-02T03:04:05Z") == datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
    assert parse_datetime("2026-01-02T03:04:05") == now
    assert parse_datetime(None) is None
    assert parse_datetime("") is None
    assert parse_datetime("not a date") is None


def test_locale_constants_derive_from_one_source():
    assert lang.SUPPORTED_LANGS == frozenset(lang.SUPPORTED_LOCALES)
    assert set(lang.SUPPORTED_LOCALES) == {"en", "pl", "de", "es", "ja"}
    assert lang.TRANSLATABLE_LOCALES == ("de", "es", "ja", "pl")
    assert "en" not in lang.TRANSLATABLE_LOCALES
    assert MODEL_TRANSLATABLE is lang.TRANSLATABLE_LOCALES


@pytest.mark.parametrize(
    "referer,expected",
    [
        ("https://x.test/pl/perks", "pl"),
        ("https://x.test/JA", "ja"),
        ("https://x.test/de?x=1", "de"),
        ("https://x.test/fr/perks", None),
        ("https://x.test/plx/perks", None),
    ],
)
def test_extract_lang_referer_regex_built_from_locales(referer, expected):
    app = Flask(__name__)
    with app.test_request_context("/", headers={"Referer": referer}):
        assert lang.extract_lang() == expected
