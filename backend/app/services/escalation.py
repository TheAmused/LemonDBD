# backend/app/services/escalation.py
"""The next-step suggestion shown to a moderator (never applied automatically).

A ladder, from the admin-editable thresholds: warnings until `warnings_before_suspension` of them
are active, then a first suspension, a second, and a permanent ban after that. A suspension on
record also moves the account up a rung even when its warnings have lapsed. The suggestion carries
the numbers it was computed from so the interface can show *why*; a person still chooses the
sanction, its length and its reason.
"""
from typing import Any


def suggest_next_step(
    *,
    active_warnings: int,
    suspensions: int,
    banned: bool,
    thresholds: dict[str, int],
) -> dict[str, Any] | None:
    """`suspensions` counts decisions that were not revoked. None when the account is already banned."""
    if banned:
        return None
    needed = thresholds["warnings_before_suspension"]
    if suspensions >= 2:
        kind, days = "ban", None
    elif suspensions == 1:
        kind, days = "suspension", thresholds["second_suspension_days"]
    elif active_warnings >= needed:
        kind, days = "suspension", thresholds["first_suspension_days"]
    else:
        kind, days = "warning", None
    return {
        "kind": kind,
        "duration_days": days,
        "basis": {
            "active_warnings": active_warnings,
            "warnings_before_suspension": needed,
            "suspensions": suspensions,
        },
    }
