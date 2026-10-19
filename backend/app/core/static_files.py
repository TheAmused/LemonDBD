# backend/app/core/static_files.py
"""Cache lifetimes for files under `/static` (nginx adds none of its own).

Game art lives at fixed paths and a re-scrape after a patch overwrites it in
place, so it is trusted for a day and then revalidated with the ETag Flask
already sends (a cheap 304), not for a week. Anything a user uploaded can be
taken down by a moderator, so its copies in browsers and CDNs are kept shorter.
"""
STATIC_MAX_AGE = 60 * 60 * 24
USER_CONTENT_MAX_AGE = 60 * 60
USER_CONTENT_PREFIX = "uploads/"


def static_max_age(filename: str | None) -> int:
    """`Flask.get_send_file_max_age` for the built-in static route."""
    if filename and filename.replace("\\", "/").startswith(USER_CONTENT_PREFIX):
        return USER_CONTENT_MAX_AGE
    return STATIC_MAX_AGE
