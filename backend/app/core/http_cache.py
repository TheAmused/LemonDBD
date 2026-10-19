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
    the response is personal -- it is computed fresh, never stored, and sent
    `private, no-cache`;
  * only the anonymous variant is ever cached, and the key never contains a
    user, so there is nothing to leak even if the check were wrong.

On top of the server cache it sets validators so the *browser* can skip the
transfer entirely:

  ETag: W/"cat-<hash of the body>"   -> a repeat request answers 304, a few
                                       hundred bytes instead of a megabyte
  Cache-Control: public, max-age=..., stale-while-revalidate=...
  Vary: Accept-Language, Accept-Encoding, Cookie

The ETag is derived from the body and stored with the Redis entry, so a 304 is
only ever sent for a body the server still holds: a content change that forgot
to bump the catalog version can no longer be vouched for forever. `Vary: Cookie`
keeps a browser from handing the anonymous copy to the same URL after sign-in.

Keys are built from *normalized* parameter values (see `cache_params`), so a
request cannot mint a new entry by varying a value the view treats identically,
and a body too large to be worth keeping is served without being stored.
"""
from __future__ import annotations

import functools
import hashlib
import logging
import zlib
from typing import Callable, Iterable, Mapping

from flask import Response, make_response, request

from app.core import redis_cache
from app.core.cache_params import Normalizer, Uncacheable, norm_lower
from app.core.security import SESSION_COOKIE_NAME
from app.utils.lang import SUPPORTED_LANGS, extract_lang

logger = logging.getLogger(__name__)

#: How long a browser may reuse a catalog response without asking. Short,
#: because the ETag revalidation behind it is cheap; the stale window below
#: only covers the revalidation itself.
BROWSER_MAX_AGE = 60
BROWSER_SWR = 300

#: A compressed body larger than this is served but not stored.
MAX_ENTRY_BYTES = 256 * 1024

#: Responses to requests carrying these parameters are searches over free text,
#: which cannot be enumerated, so they are kept briefly.
FREE_TEXT_PARAMS = ("search", "q", "character")
FREE_TEXT_TTL = 120

Vary = Iterable[str] | Mapping[str, Normalizer]


def _is_personal() -> bool:
    """True when this request carries an identity, so its response is not shared."""
    if request.args.get("user_id"):
        return True
    if request.headers.get("Authorization"):
        return True
    if request.args.get("token"):
        return True
    # The app also accepts a cookie-borne token; presence alone is enough to
    # bail out -- we do not need to know whether it is valid, only that this
    # response might be personalised.
    for cookie in ("access_token", "token", "session", SESSION_COOKIE_NAME):
        if request.cookies.get(cookie):
            return True
    return False


def _cache_key(endpoint: str, vary: Vary | None) -> str:
    """Endpoint plus the normalized query arguments that change the response.

    Raises `Uncacheable` for a value that must not mint an entry.

    An explicit `vary` rather than the whole query string: a URL carrying a
    `?_=1730000000` cache-buster or a tracking parameter would otherwise mint a
    new entry per request and the cache would never hit. A mapping supplies a
    normalizer per parameter; a plain list of names falls back to trimmed,
    lower-cased text.
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
    # `extract_lang()` returns whatever `?lang=` says, so a value that is not a
    # site language is folded into "default" (it renders the source language
    # anyway); otherwise `?lang=junk1`, `?lang=junk2` would each mint an entry.
    lang = extract_lang()
    parts.append(f"~lang={lang if lang in SUPPORTED_LANGS else 'default'}")

    if vary is None:
        normalizers: Mapping[str, Normalizer] = {name: norm_lower() for name in request.args.keys()}
    elif isinstance(vary, Mapping):
        normalizers = vary
    else:
        normalizers = {name: norm_lower() for name in vary}
    for name in sorted(normalizers):
        value = normalizers[name](request.args.get(name))
        if value not in (None, ""):
            parts.append(f"{name}={value}")
    raw = "|".join(parts)
    if len(raw) > 120:
        raw = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
    return raw


def _etag(body: bytes) -> str:
    return f'W/"cat-{hashlib.sha256(body).hexdigest()[:16]}"'


def _matches(header: str | None, etag: str) -> bool:
    """True when an `If-None-Match` header names this ETag (weak comparison)."""
    if not header:
        return False
    wanted = etag.removeprefix("W/")
    return any(token.strip().removeprefix("W/") == wanted for token in header.split(","))


def _apply_headers(response: Response, etag: str, max_age: int) -> Response:
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = (
        f"public, max-age={max_age}, stale-while-revalidate={BROWSER_SWR}"
    )
    # Responses differ by language, and by who is asking: without these a
    # shared or browser cache could hand a Polish body to a request that asked
    # for English, or the anonymous copy to a signed-in user.
    response.headers["Vary"] = "Accept-Language, Accept-Encoding, Cookie"
    return response


def _private(result) -> Response:
    """A personal response must not be reused by any cache without revalidating."""
    response = make_response(result)
    response.headers["Cache-Control"] = "private, no-cache"
    response.headers["Vary"] = "Accept-Language, Accept-Encoding, Cookie, Authorization"
    return response


def _pack(etag: str, body: bytes) -> bytes:
    return etag.encode("ascii") + b"\n" + zlib.compress(body, 3)


def _unpack(raw: bytes) -> tuple[str, bytes] | None:
    etag, _, packed = raw.partition(b"\n")
    try:
        return etag.decode("ascii"), zlib.decompress(packed)
    except (zlib.error, UnicodeDecodeError):
        return None


def _entry_ttl(ttl: int | None) -> int | None:
    """Searches over free text are kept briefly, whatever the endpoint's TTL."""
    if not any(request.args.get(name) for name in FREE_TEXT_PARAMS):
        return ttl
    return FREE_TEXT_TTL if ttl is None else min(ttl, FREE_TEXT_TTL)


def cache_catalog(
    ttl: int | None = None,
    vary: Vary | None = None,
    max_age: int = BROWSER_MAX_AGE,
) -> Callable:
    """Cache a GET endpoint that returns static catalog data.

    `vary` names the query parameters the response depends on, as a list of
    names (trimmed, lower-cased text) or a mapping of name to normalizer. Pass
    it explicitly -- the default (every parameter present) is correct but lets
    an unrelated parameter fragment the cache. `lang` needs no entry: the
    resolved language is always part of the key.
    """

    def decorator(view: Callable) -> Callable:
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            if request.method != "GET":
                return view(*args, **kwargs)
            if _is_personal():
                return _private(view(*args, **kwargs))

            try:
                key = _cache_key(request.endpoint or view.__name__, vary)
            except Uncacheable:
                return view(*args, **kwargs)

            # One version for this whole request: the lookup and the store must
            # agree on the generation they belong to.
            version = redis_cache.catalog_version()
            if_none_match = request.headers.get("If-None-Match")

            raw = redis_cache.get_raw(key, version=version)
            entry = _unpack(raw) if raw is not None else None
            if entry is not None:
                etag, body = entry
                # The validator is vouching for a body this server still holds.
                if _matches(if_none_match, etag):
                    return _apply_headers(Response(status=304), etag, max_age)
                response = Response(body, mimetype="application/json")
                response.headers["X-Cache"] = "HIT"
                return _apply_headers(response, etag, max_age)

            result = view(*args, **kwargs)

            # Only a plain 200 is storable. A tuple with an error status, a
            # streamed file or a redirect is passed straight through.
            payload, status = (result if isinstance(result, tuple) else (result, 200))
            if status != 200 or not isinstance(payload, Response) or payload.is_streamed:
                return result
            body = payload.get_data()
            if not body:
                return result

            etag = _etag(body)
            packed = _pack(etag, body)
            # Skip the store when the catalog was bumped while the view ran:
            # the rows it read may predate the change, and filing them under
            # the new generation would keep them for the whole TTL.
            if len(packed) <= MAX_ENTRY_BYTES and redis_cache.catalog_version(fresh=True) == version:
                redis_cache.set_raw(key, packed, ttl=_entry_ttl(ttl), version=version)
            payload.headers["X-Cache"] = "MISS"
            if _matches(if_none_match, etag):
                return _apply_headers(Response(status=304), etag, max_age)
            return _apply_headers(payload, etag, max_age), status

        return wrapper

    return decorator
