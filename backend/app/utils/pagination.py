# backend/app/utils/pagination.py
"""Request-side `page` / `per_page` parsing shared by every list route."""

from __future__ import annotations

from flask import request


def paginate_args(
    default_per_page: int = 20,
    max_per_page: int = 100,
    *,
    page_arg: str = "page",
    per_page_arg: str = "per_page",
    strict: bool = False,
) -> tuple[int, int]:
    """Read `(page, per_page)` from the query string, safely clamped.

    A missing or non-integer value falls back to its default (page 1,
    `default_per_page`); `page` is raised to at least 1 and `per_page` clamped
    into `[1, max_per_page]`. With `strict=True` a value that parses but is
    below 1 raises `ValueError` instead of being clamped, so the route can
    answer 400. `page_arg` / `per_page_arg` rename the query keys (e.g. a route
    that spells its page size `limit`).
    """
    page = request.args.get(page_arg, default=None, type=int)
    per_page = request.args.get(per_page_arg, default=None, type=int)

    if strict:
        if page is not None and page < 1:
            raise ValueError(f"invalid {page_arg}")
        if per_page is not None and per_page < 1:
            raise ValueError(f"invalid {per_page_arg}")

    page = 1 if page is None else max(1, page)
    per_page = default_per_page if per_page is None else max(1, min(per_page, max_per_page))
    return page, per_page
