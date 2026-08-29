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
from sqlalchemy.exc import TimeoutError as SATimeoutError

try:
    # psycopg (v3) can raise its own driver-level errors -- notably a raw
    # ProgrammingError from pool_pre_ping's do_ping() when it tries to
    # toggle autocommit on a connection that got returned to the pool while
    # still mid-transaction ("can't change 'autocommit' now: connection in
    # transaction status INTRANS"). That specific failure happens *before*
    # SQLAlchemy has a chance to wrap it as a DBAPIError, so it propagates as
    # a bare psycopg.Error subclass and slips past the (DBAPIError,
    # SATimeoutError) catch below entirely. We catch it explicitly here (and
    # the app runs fine on sqlite in tests, where this import legitimately
    # has nothing to catch) so the same rollback+remove+retry recovery
    # applies to it too.
    from psycopg import Error as PsycopgError
except ImportError:  # pragma: no cover - psycopg not installed (e.g. sqlite-only env)
    class PsycopgError(Exception):
        pass

from app.core.extensions import db

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable)

_TRANSIENT_MARKERS = (
    "server closed the connection unexpectedly",
    "connection already closed",
    "consuming input failed",
    "terminating connection",
    "could not connect",
    # SQLAlchemy pool-checkout timeout ("QueuePool limit of size X ... reached,
    # connection timed out") -- distinct from a dropped connection, but the
    # same class of "many parallel live-test files all starting up (and the
    # background initial scrape possibly still running) at once" burst this
    # module exists for. By construction nothing has been sent to the server
    # yet when this fires (no connection was even checked out), so retrying
    # is exactly as safe as the dropped-connection case above.
    "queuepool limit",
    "timed out",
    # psycopg3's pool_pre_ping do_ping() autocommit-toggle failure when a
    # connection was returned to the pool still mid-transaction -- see the
    # PsycopgError import note above. Retrying (after our rollback+remove)
    # gets a clean connection instead of crashing the request.
    "connection in transaction status",
    "can't change 'autocommit' now",
)


def _is_transient(err: BaseException) -> bool:
    return any(marker in str(err).lower() for marker in _TRANSIENT_MARKERS)


def retry_on_transient_db_error(retries: int = 2, delay_seconds: float = 0.25) -> Callable[[F], F]:
    """Retry a DB function (by default up to twice more, three attempts total)
    if it hits a transient connection-drop or pool-checkout-timeout error,
    discarding the poisoned session/connection first."""

    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            attempts = retries + 1
            for attempt in range(1, attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except (DBAPIError, SATimeoutError, PsycopgError) as exc:
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
