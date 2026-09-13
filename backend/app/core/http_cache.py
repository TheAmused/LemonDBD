# backend/app/core/http_cache.py
"""`@cache_catalog` -- caches a read-only catalog endpoint in Redis and in the
browser, and refuses to cache anything that varies by user.

That refusal is the whole reason this is a decorator and not three lines inline.
`/api/v1/perks` returns an `is_owned` flag per perk, taken from
`user_id` -- an explicit query parameter *or* the JWT of the caller. Cache that
response under its URL and the first signed-in user to request it pins their
ownership onto every anonymous visitor after them, and onto every other signed-in
user whose request happens to omit the parameter. A cache that leaks one
account's data to another is worse than no cache, so identity is checked before
anything is read or written:

  * an `Authorization` header, a session cookie, or a `user_id` parameter means
    the response is personal -- it is computed fresh and never stored;
  * only the anonymous variant is ever cached, and the key never contains a
    user, so there is nothing to leak even if the check were wrong.

The anonymous variant is the one that matters for cold-start latency anyway: it
is what a first-time visitor and every SSR render gets.

On top of the server cache it sets validators so the *browser* can skip the
transfer entirely:

  ETag: W/"cat-<version>-<hash>"    -> a repeat request answers 304, a few
                                      hundred bytes instead of a megabyte
  Cache-Control: public, max-age=..., stale-while-revalidate=...
                                   -> the browser serves the cached copy
                                      instantly and revalidates in background

Both are keyed on the catalog version, so `bump_catalog_version()` after a seed
makes every browser's copy stale at the same moment as the server's.
"""
from __future__ import annotations

import functools
import hashlib
import logging
from typing import Callable, Iterable

from flask import Response, jsonify, request

from app.core import redis_cache
from app.utils.lang import extract_lang

logger = logging.getLogger(__name__)

#: How long a browser may reuse a catalog response without asking. Short,
#: because the ETag revalidation behind it is cheap; the long tail is handled by
#: stale-while-revalidate.
BROWSER_MAX_AGE = 60
BROWSER_SWR = 86400


def _is_personal() -> bool:
    """True when this request carries an identity, so its response is not shared."""
    if request.args.get("user_id"):
        return True
    if request.headers.get("Authorization"):
        return True
    # The app also accepts a cookie-borne token; presence alone is enough to
    # bail out -- we do not need to know whether it is valid, only that this
    # response might be personalised.
    for cookie in ("access_token", "token", "session"):
        if request.cookies.get(cookie):
            return True
    return False


def _cache_key(endpoint: str, vary: Iterable[str] | None) -> str:
    """Endpoint plus the query arguments that actually change the response.

    An explicit `vary` list rather than the whole query string: a URL carrying
    `?_=1730000000` cache-buster or an unrelated tracking parameter would
    otherwise mint a new entry per request and the cache would never hit.
    """
    parts = [endpoint]
    # `/api/v1/perks/<identifier>` and `/api/v1/maps/<map_id>` are one endpoint
    # serving a different row per URL, and the endpoint name is the same string
    # for all of them. Without the path variables the first row fetched would be
    # handed back as every row.
    for name, value in sorted((request.view_args or {}).items()):
        parts.append(f"{name}={value}")

    # The RESOLVED language, not the `lang` query parameter.
    #
    # `extract_lang()` falls back from `?lang=` to the locale in the Referer
    # path and then to the Accept-Language header, so two requests that both
    # omit `?lang=` can resolve to different languages while producing an
    # identical URL. Keying on the parameter alone, the first of those to miss
    # would write its language into the shared entry and every later request
    # would be served that body -- a German visitor pinning German onto
    # everyone for the rest of the TTL. `Vary: Accept-Language` fixes this for
    # browser and proxy caches but says nothing to Redis; only the key does.
    parts.append(f"~lang={extract_lang() or 'default'}")

    names = sorted(vary) if vary is not None else sorted(request.args.keys())
    for name in names:
        value = request.args.get(name)
        if value not in (None, ""):
            parts.append(f"{name}={value}")
    raw = "|".join(parts)
    if len(raw) > 120:
        raw = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
    return raw


def _etag(key: str) -> str:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
    return f'W/"cat-{redis_cache.catalog_version()}-{digest}"'


def _apply_headers(response: Response, etag: str, max_age: int) -> Response:
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = (
        f"public, max-age={max_age}, stale-while-revalidate={BROWSER_SWR}"
    )
    # Responses differ by language; without this a shared cache could hand a
    # Polish body to a request that asked for English.
    response.headers["Vary"] = "Accept-Language, Accept-Encoding"
    return response


def cache_catalog(
    ttl: int | None = None,
    vary: Iterable[str] | None = None,
    max_age: int = BROWSER_MAX_AGE,
) -> Callable:
    """Cache a GET endpoint that returns static catalog data.

    `vary` names the query parameters the response depends on. Pass it
    explicitly -- the default (every parameter present) is correct but lets an
    unrelated parameter fragment the cache.
    """

    def decorator(view: Callable) -> Callable:
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            if request.method != "GET" or _is_personal():
                return view(*args, **kwargs)

            key = _cache_key(request.endpoint or view.__name__, vary)
            etag = _etag(key)

            # A matching validator means the browser already holds this exact
            # generation: answer 304 without touching Redis or the database.
            if request.headers.get("If-None-Match") == etag:
                return _apply_headers(Response(status=304), etag, max_age)

            cached = redis_cache.get(key)
            if cached is not None:
                response = jsonify(cached)
                response.headers["X-Cache"] = "HIT"
                return _apply_headers(response, etag, max_age)

            result = view(*args, **kwargs)

            # Only a plain 200 is storable. A tuple with an error status, a
            # streamed file or a redirect is passed straight through.
            payload, status = (result if isinstance(result, tuple) else (result, 200))
            if status != 200:
                return result
            try:
                body = payload.get_json()
            except Exception:
                return result
            if body is None:
                return result

            redis_cache.set(key, body, ttl=ttl)
            payload.headers["X-Cache"] = "MISS"
            return _apply_headers(payload, etag, max_age), status

        return wrapper

    return decorator
