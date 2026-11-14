# backend/app/services/maintenance_mode.py
"""Maintenance mode: the public side of the site is closed while the admin side stays open.

State is three site settings (see ``site_settings_spec``): a switch and an optional window. The mode is
*active* while the switch is on and the window, when there is one, has started and not ended, so a
scheduled start and end need no job: they are read off the clock at the moment of each request, the
same way the notice banner expires.

While active, every ``/api/`` request answers 503 unless it is one of:

* an admin-side or sign-in path (``ALWAYS_OPEN_PREFIXES``), so an admin can always get in and switch it off;
* a call from inside the docker network with no client address (the Next.js server rendering a page);
* made by a signed-in admin.

The Next.js proxy asks ``visitor_is_blocked`` (through ``GET /site-config/maintenance``) to decide
whether a page request gets the maintenance page.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Final, Literal

from flask import jsonify, request

from app.core.limiter import is_local_traffic
from app.core.security import get_current_user
from app.services import site_settings
from app.utils.site_settings_spec import validate_setting

Status = Literal["off", "scheduled", "active", "ended"]

#: Paths that stay open for everyone: the admin API, sign-in (and the session check the proxy makes),
#: and the public configuration the maintenance page itself reads.
ALWAYS_OPEN_PREFIXES: Final = ("/api/v1/admin/", "/api/v1/auth/", "/api/v1/site-config", "/api/v1/health", "/api/v1/readyz")
#: Closed even though it sits under an open prefix: a new account would see nothing but the maintenance page.
#: (Signing in with Google creates an account too; its `/config` read below the same prefix stays open.)
ALWAYS_CLOSED_PATHS: Final = ("/api/v1/auth/register", "/api/v1/auth/google")


@dataclass(frozen=True)
class MaintenanceState:
    enabled: bool
    starts_at: datetime | None
    until: datetime | None
    status: Status

    @property
    def active(self) -> bool:
        return self.status == "active"

    def as_dict(self) -> dict[str, object]:
        return {
            "status": self.status,
            "enabled": self.enabled,
            "starts_at": _iso(self.starts_at),
            "until": _iso(self.until),
        }


def _iso(moment: datetime | None) -> str | None:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ") if moment else None


def _read_time(key: str) -> datetime | None:
    raw = str(site_settings.get_setting(key))
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def current_state(now: datetime | None = None) -> MaintenanceState:
    """What maintenance mode is doing right now. Never raises (settings fall back to "off")."""
    if not site_settings.get_setting("maintenance_enabled"):
        return MaintenanceState(False, None, None, "off")
    moment = now or datetime.now(timezone.utc)
    starts_at, until = _read_time("maintenance_starts_at"), _read_time("maintenance_until")
    status: Status = "active"
    if until is not None and moment >= until:
        status = "ended"
    elif starts_at is not None and moment < starts_at:
        status = "scheduled"
    return MaintenanceState(True, starts_at, until, status)


def save_window(*, enabled: bool, starts_at: str | None, until: str | None) -> MaintenanceState:
    """Switch maintenance on or off, with an optional window. Raises ValueError on an invalid window.

    Switching off also forgets the window, so the next start begins from a clean slate.
    """
    start = validate_setting("maintenance_starts_at", starts_at or "") if enabled else ""
    end = validate_setting("maintenance_until", until or "") if enabled else ""
    if start and end and str(end) <= str(start):
        raise ValueError("The end must come after the start.")
    if end and str(end) <= _iso(datetime.now(timezone.utc)):
        raise ValueError("The end is already in the past.")
    site_settings.update_settings(
        {
            "maintenance_enabled": enabled,
            "maintenance_starts_at": start or None,
            "maintenance_until": end or None,
        }
    )
    return current_state()


# --- who gets through ---------------------------------------------------------------------------


def _is_internal_call() -> bool:
    """A call from the docker network that names no client: the Next.js server fetching data for a page
    it was already allowed to render. Every public request passes nginx, which always names the client."""
    named = request.headers.get("X-Real-IP") or request.headers.getlist("X-Forwarded-For")
    return is_local_traffic() and not named


def visitor_may_pass() -> bool:
    """True for a caller maintenance mode lets through: internal, or a signed-in admin."""
    if _is_internal_call():
        return True
    user = get_current_user()
    return user is not None and user.role == "admin"


def visitor_is_blocked() -> bool:
    return current_state().active and not visitor_may_pass()


def enforce_maintenance():
    """before_request: answer 503 to a blocked caller while maintenance mode is active."""
    if request.method == "OPTIONS" or not request.path.startswith("/api/"):
        return None
    state = current_state()
    if not state.active:
        return None
    if request.path.rstrip("/") not in ALWAYS_CLOSED_PATHS and request.path.startswith(ALWAYS_OPEN_PREFIXES):
        return None
    if visitor_may_pass():
        return None
    response = jsonify(
        {
            "error": "The site is under maintenance. Please try again later.",
            "maintenance": True,
            "until": _iso(state.until),
            "status": 503,
        }
    )
    response.status_code = 503
    response.headers["Cache-Control"] = "no-store"
    if state.until is not None:
        response.headers["Retry-After"] = str(max(1, int((state.until - datetime.now(timezone.utc)).total_seconds())))
    return response
