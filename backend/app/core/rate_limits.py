# backend/app/core/rate_limits.py
"""Request limits whose numbers the admin can change in the Settings tab.

Flask-Limiter accepts a callable wherever it accepts a limit string and calls it on each request, so
`@limiter.limit(per_minute("rate_auth_per_minute"))` follows the setting (cached for a few seconds,
see `app.services.site_settings`) instead of being fixed when the module loads. The bounds live in the
settings registry, so a typo can neither lock honest visitors out (floors) nor switch a limit off
(ceilings). Counters stay per limiter storage: with `memory://` and several gunicorn workers the
effective limit is multiplied by the number of workers unless Redis is configured.
"""
from collections.abc import Callable


def per_minute(setting_key: str, *, also: str | None = None) -> Callable[[], str]:
    """A limit string provider: ``"<setting> per minute"``, plus an optional fixed extra window."""

    def _limit() -> str:
        from app.services.site_settings import rate_limit

        base = f"{rate_limit(setting_key)} per minute"
        return f"{base}; {also}" if also else base

    _limit.__name__ = f"limit_{setting_key}"
    return _limit
