from datetime import datetime, timezone


def utcnow() -> datetime:
    """Returns current UTC timestamp with timezone awareness."""
    return datetime.now(timezone.utc)

