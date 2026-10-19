# backend/app/core/static_files.py
"""Cache lifetimes for files under `/static` (nginx adds none of its own).

Game art sits at fixed paths and a re-scrape overwrites it, so it is revalidated
daily. Uploads can be taken down by a moderator, so they are kept shorter.
"""
STATIC_MAX_AGE = 60 * 60 * 24
USER_CONTENT_MAX_AGE = 60 * 60
USER_CONTENT_PREFIX = "uploads/"


def static_max_age(filename: str | None) -> int:
    """`Flask.get_send_file_max_age` for the built-in static route."""
    if filename and filename.replace("\\", "/").startswith(USER_CONTENT_PREFIX):
        return USER_CONTENT_MAX_AGE
    return STATIC_MAX_AGE
