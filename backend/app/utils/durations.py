# backend/app/utils/durations.py
from datetime import timedelta


def describe_duration(delta: timedelta) -> str:
    """English phrase for a lifetime: "24 hours", "1 hour", "90 minutes"."""
    seconds = int(delta.total_seconds())
    if seconds % 3600 == 0 and seconds >= 3600:
        n, unit = seconds // 3600, "hour"
    else:
        n, unit = max(1, round(seconds / 60)), "minute"
    return f"{n} {unit}{'' if n == 1 else 's'}"
