# backend/app/core/transaction.py
"""Unit of Work transaction management for SQLAlchemy 2.0 and Flask-SQLAlchemy.

Provides atomic context managers that properly manage transaction boundaries,
handling both top-level transactions and nested savepoints, automatically
committing on block exit and rolling back on unhandled exceptions.
"""
from collections.abc import Generator
from contextlib import contextmanager
import logging
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


# Attach to db extension for convenience
db.transaction = transaction
