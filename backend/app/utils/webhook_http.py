# backend/app/utils/webhook_http.py
"""A minimal JSON HTTP client for the Discord webhooks, on urllib3 (already used by safe_fetch).

The webhooks used to go through curl_cffi with Chrome TLS impersonation -- a browser fingerprint a
webhook does not need, and a native dependency the rest of the app never used. The surface mirrors
the few `requests` calls the callers make (`post` / `patch` / `delete` returning an object with
`status_code` and `json()`), so the call sites read the same.
"""
import json as jsonlib
from typing import Any
from urllib.parse import urlencode

import certifi
import urllib3

_pool = urllib3.PoolManager(
    cert_reqs="CERT_REQUIRED",
    ca_certs=certifi.where(),
    retries=False,  # one attempt; a Discord outage is reported to the caller, not retried in a request
)


class Response:
    """What the callers read back: the status and, when it is JSON, the body."""

    def __init__(self, status_code: int, body: bytes) -> None:
        self.status_code = status_code
        self.content = body

    def json(self) -> Any:
        return jsonlib.loads(self.content.decode("utf-8"))


def request(
    method: str,
    url: str,
    *,
    json: Any = None,
    params: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 10,
) -> Response:
    """Sends one request without following redirects. Raises urllib3's errors on network failure."""
    if params:
        url = f"{url}{'&' if '?' in url else '?'}{urlencode(params)}"
    body = None
    send_headers = dict(headers or {})
    if json is not None:
        body = jsonlib.dumps(json).encode("utf-8")
        send_headers.setdefault("Content-Type", "application/json")
    send_headers.setdefault("User-Agent", "LemonDBD (webhook)")
    resp = _pool.request(
        method, url, body=body, headers=send_headers,
        timeout=urllib3.Timeout(total=timeout), redirect=False, preload_content=True,
    )
    return Response(resp.status, resp.data)


def post(url: str, **kwargs: Any) -> Response:
    return request("POST", url, **kwargs)


def patch(url: str, **kwargs: Any) -> Response:
    return request("PATCH", url, **kwargs)


def delete(url: str, **kwargs: Any) -> Response:
    return request("DELETE", url, **kwargs)
