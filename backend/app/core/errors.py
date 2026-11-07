# backend/app/core/errors.py
"""Errors that services raise and the routes translate into an HTTP status."""


class NotFoundError(ValueError):
    """A lookup found nothing. Still a ValueError, so a caller that only knows ValueError keeps working;
    the routes answer 404 for it instead of 400."""


def value_error_status(err: ValueError) -> int:
    """404 for a not-found error, otherwise 400.

    Messages that only say "not found" (older services raise a plain ValueError) count as well,
    until they raise NotFoundError themselves.
    """
    return 404 if isinstance(err, NotFoundError) or "not found" in str(err).lower() else 400
