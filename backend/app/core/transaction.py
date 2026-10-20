# backend/app/core/transaction.py
"""Unit of Work transaction management for SQLAlchemy 2.0 and Flask-SQLAlchemy.

Provides atomic context managers that properly manage transaction boundaries,
handling both top-level transactions and nested savepoints, automatically
committing on block exit and rolling back on unhandled exceptions.
"""
from collections.abc import Generator
from contextlib import contextmanager
import logging
from sqlalchemy import Select
from sqlalchemy.orm import Session

from app.core.extensions import db

logger = logging.getLogger(__name__)


@contextmanager
def transaction() -> Generator[Session, None, None]:
    """Atomic Unit of Work transaction context manager.

    - If no transaction is active on the session: starts a top-level transaction
      using `with sess.begin():`, which commits on clean exit and rolls back on exception.
    - If a transaction is already active (e.g. from an earlier query via autobegin):
      creates a SAVEPOINT using `with sess.begin_nested():` and commits the transaction
      upon exiting the outermost transaction boundary.
    - If nested inside an existing SAVEPOINT: creates a nested SAVEPOINT.
    """
    sess = db.session()
    if not sess.in_transaction():
        with sess.begin():
            yield sess
    else:
        is_nested = sess.get_transaction() is not None and sess.get_transaction().nested
        if is_nested:
            with sess.begin_nested():
                yield sess
        else:
            try:
                with sess.begin_nested():
                    yield sess
                sess.commit()
            except Exception:
                sess.rollback()
                raise


def lock_for_update[T](query: Select[tuple[T]]) -> Select[tuple[T]]:
    """Locks the selected rows until the transaction ends, and reloads them even when the session already
    holds a copy, so a lookup that had to wait for the lock never reads the state from before it."""
    return query.with_for_update().execution_options(populate_existing=True)


def end_transaction() -> None:
    """Ends the open transaction without writing anything. A lookup that locked a row and found nothing to
    change calls this, so the lock does not outlive the check. Nothing may be pending in the session."""
    db.session.rollback()


# Attach to db extension for convenience
db.transaction = transaction
