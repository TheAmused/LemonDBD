# backend/app/core/db_retry.py
"""
Resilience for transient database connection drops.

Under a sudden burst of near-simultaneous requests (e.g. many parallel
frontend live-test files all starting up at once), Postgres/Docker's
networking has been observed to drop an individual connection mid-query
("server closed the connection unexpectedly" / similar OperationalErrors)
even with a healthy pool and headroom on max_connections. pool_pre_ping only
catches a dead connection at checkout time, not one that dies mid-query, so
that class of error still reaches the caller as a hard failure.

For read-only (or otherwise safely-repeatable) DB work, retrying once on a
fresh connection is the correct, low-risk response: the original connection
is discarded, the session is reset, and the same query is re-issued. This
should never be used to wrap a function with side effects that aren't safe
to run twice.
"""
import functools
import logging
import time
from typing import Callable, TypeVar

from sqlalchemy.exc import DBAPIError

from app.core.extensions import db

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable)

_TRANSIENT_MARKERS = (
    "server closed the connection unexpectedly",
    "connection already closed",
    "consuming input failed",
    "terminating connection",
    "could not connect",
)


def _is_transient(err: DBAPIError) -> bool:
    return any(marker in str(err).lower() for marker in _TRANSIENT_MARKERS)


def retry_on_transient_db_error(retries: int = 1, delay_seconds: float = 0.15) -> Callable[[F], F]:
    """Retry a read-only DB function once (by default) if it hits a transient
    connection-drop error, discarding the poisoned session/connection first."""

    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            attempts = retries + 1
            for attempt in range(1, attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except DBAPIError as exc:
                    if attempt >= attempts or not _is_transient(exc):
                        raise
                    logger.warning(
                        f"Transient DB error in {fn.__name__} (attempt {attempt}/{attempts}), retrying: {exc}"
                    )
                    try:
                        db.session.rollback()
                    except Exception:
                        pass
                    try:
                        db.session.remove()
                    except Exception:
                        pass
                    time.sleep(delay_seconds)
            raise AssertionError("unreachable")  # pragma: no cover

        return wrapper  # type: ignore[return-value]

    return decorator
